// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB — send-push Edge Function  v2
//  Pure Deno Web Crypto — no npm:web-push dependency
//  Triggered by Postgres trigger via pg_net (automatic)
//  OR manually via Supabase Database Webhooks
// ═══════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Base64url helpers ────────────────────────────────────
const b64u = {
  encode: (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
  decode: (s: string) => {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '==='.slice((b.length + 3) % 4));
    return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
  },
};

// ── VAPID JWT (RFC 8292) ─────────────────────────────────
async function makeVapidJwt(audience: string, privateKeyB64u: string, subject: string) {
  const header  = b64u.encode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u.encode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const msg = new TextEncoder().encode(`${header}.${payload}`);

  // Import raw ECDSA P-256 private key from PKCS#8 DER
  // web-push private keys are raw 32-byte scalars in base64url
  const rawPriv = new Uint8Array(b64u.decode(privateKeyB64u));

  // Wrap into PKCS#8 for SubtleCrypto (P-256, 32-byte key)
  const pkcs8 = new Uint8Array([
    0x30, 0x81, 0x87,                             // SEQUENCE
    0x02, 0x01, 0x00,                             // version = 0
    0x30, 0x13,                                   // SEQUENCE (AlgorithmIdentifier)
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
    0x04, 0x6d,                                   // OCTET STRING
      0x30, 0x6b,                                 // SEQUENCE
        0x02, 0x01, 0x01,                         // version = 1
        0x04, 0x20, ...rawPriv,                   // private key bytes
        0xa1, 0x44,                               // context [1]
          0x03, 0x42, 0x00,                       // BIT STRING
            // public key placeholder (SubtleCrypto derives it)
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);

  // Supabase Deno supports importKey with raw P-256 differently; use JWK instead
  const jwkPriv = {
    kty: 'EC', crv: 'P-256', ext: true,
    key_ops: ['sign'],
    d: privateKeyB64u,
    // x and y are derived automatically but SubtleCrypto needs them for JWK import
    // We'll extract them from the public key
    x: '', y: '',
  };

  // Import the VAPID public key to get x and y
  const vapidPubRaw = new Uint8Array(b64u.decode(Deno.env.get('VAPID_PUBLIC_KEY')!));
  // Uncompressed point: 0x04 || x (32) || y (32)
  jwkPriv.x = b64u.encode(vapidPubRaw.slice(1, 33).buffer);
  jwkPriv.y = b64u.encode(vapidPubRaw.slice(33, 65).buffer);

  const cryptoKey = await crypto.subtle.importKey(
    'jwk', jwkPriv,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );

  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, msg);
  return `${header}.${payload}.${b64u.encode(sig)}`;
}

// ── HKDF ────────────────────────────────────────────────
async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, len: number) {
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  // Extract
  const prk = await crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, 
    await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    ikm,
  );
  // Expand
  const okmKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const t = await crypto.subtle.sign('HMAC', okmKey, new Uint8Array([...info, 0x01]));
  return new Uint8Array(t).slice(0, len);
}

// ── Encrypt push payload (aes128gcm, RFC 8291) ───────────
async function encryptPayload(plaintext: string, subKeys: { p256dh: string; auth: string }) {
  const AUTH_INFO   = new TextEncoder().encode('Content-Encoding: auth\0');
  const CE_INFO     = new TextEncoder().encode('Content-Encoding: aes128gcm\0');

  const authSecret   = new Uint8Array(b64u.decode(subKeys.auth));
  const receiverPub  = new Uint8Array(b64u.decode(subKeys.p256dh));

  // Generate ephemeral ECDH key pair
  const senderPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderPair.publicKey));

  // Import receiver public key
  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverKey }, senderPair.privateKey, 256,
  );
  const sharedSecret = new Uint8Array(sharedBits);

  // Generate random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK via HKDF-SHA-256
  const prk_combine = new Uint8Array([...sharedSecret, ...authSecret]);
  const prkKey = await crypto.subtle.importKey('raw', prk_combine, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk_hmac = await crypto.subtle.sign('HMAC', prkKey, new Uint8Array([...AUTH_INFO, 0x01]));
  const prk = new Uint8Array(prk_hmac).slice(0, 32);

  // Content encryption key (16 bytes) and nonce (12 bytes)
  const cek_info   = new Uint8Array([...CE_INFO, ...receiverPub, ...senderPubRaw]);
  const nonce_info = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), ...receiverPub, ...senderPubRaw]);

  const prkHmacKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const cek_raw   = new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, new Uint8Array([...salt, ...cek_info,   0x01]))).slice(0, 16);
  const nonce_raw = new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, new Uint8Array([...salt, ...nonce_info, 0x01]))).slice(0, 12);

  // AES-128-GCM encrypt (add PKCS padding byte 0x02)
  const data = new Uint8Array([...new TextEncoder().encode(plaintext), 0x02]);
  const aesKey = await crypto.subtle.importKey('raw', cek_raw, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce_raw }, aesKey, data));

  // Build aes128gcm content-encoding header
  // salt(16) + rs(4, big-endian) + idlen(1) + keyid(senderPubRaw.length) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(21 + senderPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = senderPubRaw.length;
  header.set(senderPubRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);
  return body;
}

// ── Send one push notification ────────────────────────────
async function sendPush(subscription: Record<string, unknown>, payload: object): Promise<boolean> {
  const endpoint = subscription.endpoint as string;
  const keys     = subscription.keys as { p256dh: string; auth: string };

  const url      = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@internshub.app';

  let jwt: string;
  try {
    jwt = await makeVapidJwt(audience, VAPID_PRIVATE_KEY, VAPID_EMAIL);
  } catch(e) {
    console.error('[send-push] VAPID JWT error:', e);
    return true;
  }

  let body: Uint8Array;
  try {
    body = await encryptPayload(JSON.stringify(payload), keys);
  } catch(e) {
    console.error('[send-push] Encryption error:', e);
    return true;
  }

  const vapidPubB64 = Deno.env.get('VAPID_PUBLIC_KEY')!;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL':              '86400',
        'Authorization':    `vapid t=${jwt},k=${vapidPubB64}`,
      },
      body,
    });
  } catch(e) {
    console.warn('[send-push] fetch error:', e);
    return true; // network error — keep subscription
  }

  if (res.status === 410 || res.status === 404) return false; // expired → delete
  if (!res.ok) console.warn('[send-push] push service responded', res.status, await res.text().catch(()=>''));
  return true;
}

// ── Admin Supabase client (bypasses RLS) ─────────────────
const adminSb = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ── Main handler ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = await req.json().catch(() => null);
  if (!body) return new Response('Bad Request', { status: 400 });

  const { table, record } = body as { type: string; table: string; record: Record<string, unknown> };
  const sb = adminSb();
  const expired: string[] = [];

  // ── New message → notify receiver ────────────────────
  if (table === 'messages') {
    const receiverId = record.receiver_id as string;
    const senderId   = record.sender_id   as string;
    const msgText    = (record.message    as string) ?? '';

    const { data: sender } = await sb.from('users').select('name').eq('id', senderId).single();
    const senderName = (sender?.name as string) ?? 'Someone';

    const { data: subs } = await sb
      .from('push_subscriptions').select('id,subscription').eq('user_id', receiverId);
    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

    const payload = {
      title: `💬 ${senderName}`,
      body:  msgText.length > 100 ? msgText.slice(0, 97) + '…' : msgText,
      url:   `/interns-hub/messages.html?uid=${senderId}`,
      type:  'message',
    };

    await Promise.all(subs.map(async row => {
      const ok = await sendPush(row.subscription as Record<string, unknown>, payload);
      if (!ok) expired.push(row.id as string);
    }));
  }

  // ── New announcement → notify all users ──────────────
  else if (table === 'announcements') {
    const title   = (record.title   as string) ?? 'New Announcement';
    const message = (record.message as string) ?? '';

    const { data: subs } = await sb.from('push_subscriptions').select('id,subscription');
    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

    const payload = {
      title: `📣 ${title}`,
      body:  message.length > 100 ? message.slice(0, 97) + '…' : message,
      url:   '/interns-hub/announcements.html',
      type:  'announcement',
    };

    await Promise.all(subs.map(async row => {
      const ok = await sendPush(row.subscription as Record<string, unknown>, payload);
      if (!ok) expired.push(row.id as string);
    }));
  }

  // Remove expired subscriptions
  if (expired.length) {
    await sb.from('push_subscriptions').delete().in('id', expired);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
