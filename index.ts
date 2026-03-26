// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB — send-push Edge Function
//  Triggered by Supabase Database Webhooks on:
//    • INSERT into public.messages
//    • INSERT into public.announcements
// ═══════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// ── VAPID config (set these in Supabase → Settings → Edge Function Secrets) ──
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@internshub.app';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Supabase admin client (uses service-role key to bypass RLS) ───────────────
function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// ── Send a push to a single subscription object ───────────────────────────────
async function sendOne(subscription: object, payload: object): Promise<boolean> {
  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload),
    );
    return true;
  } catch (err: unknown) {
    // 410 Gone = subscription expired / user unsubscribed → remove it
    if (err && typeof err === 'object' && 'statusCode' in err && (err as {statusCode:number}).statusCode === 410) {
      return false; // signal caller to delete this row
    }
    console.warn('[send-push] sendNotification error:', err);
    return true; // keep subscription for other errors
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return new Response('Bad Request', { status: 400 });

  // Supabase Webhook payload shape:
  // { type: 'INSERT', table: 'messages'|'announcements', record: {...}, schema: 'public' }
  const { table, record } = body as {
    type: string;
    table: string;
    record: Record<string, unknown>;
    schema: string;
  };

  const sb = adminClient();

  // ── MESSAGE: notify only the receiver ───────────────────────────────────────
  if (table === 'messages') {
    const receiverId = record.receiver_id as string;
    const senderId   = record.sender_id   as string;
    const msgText    = (record.message as string) ?? '';

    // Fetch sender name
    const { data: sender } = await sb
      .from('users')
      .select('name')
      .eq('id', senderId)
      .single();

    const senderName = (sender?.name as string) ?? 'Someone';

    // Fetch receiver's push subscriptions
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', receiverId);

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const payload = {
      title: `💬 ${senderName}`,
      body:  msgText.length > 100 ? msgText.slice(0, 97) + '…' : msgText,
      url:   `/interns-hub/messages.html?uid=${senderId}`,
      type:  'message',
    };

    const expired: string[] = [];
    await Promise.all(subs.map(async (row) => {
      const ok = await sendOne(row.subscription as object, payload);
      if (!ok) expired.push(row.id as string);
    }));

    if (expired.length) {
      await sb.from('push_subscriptions').delete().in('id', expired);
    }

    return new Response(JSON.stringify({ sent: subs.length - expired.length }), { status: 200 });
  }

  // ── ANNOUNCEMENT: notify all users ──────────────────────────────────────────
  if (table === 'announcements') {
    const title   = (record.title   as string) ?? 'New Announcement';
    const message = (record.message as string) ?? '';

    // Fetch all push subscriptions
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('id, subscription');

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const payload = {
      title: `📣 ${title}`,
      body:  message.length > 100 ? message.slice(0, 97) + '…' : message,
      url:   '/interns-hub/announcements.html',
      type:  'announcement',
    };

    const expired: string[] = [];
    await Promise.all(subs.map(async (row) => {
      const ok = await sendOne(row.subscription as object, payload);
      if (!ok) expired.push(row.id as string);
    }));

    if (expired.length) {
      await sb.from('push_subscriptions').delete().in('id', expired);
    }

    return new Response(JSON.stringify({ sent: subs.length - expired.length }), { status: 200 });
  }

  return new Response(JSON.stringify({ skipped: true }), { status: 200 });
});
