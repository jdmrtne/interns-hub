// ═══════════════════════════════════════════
//  THE INTERNS HUB v2 — Shared Navigation
// ═══════════════════════════════════════════

// ── Desktop collapse ────────────────────────────────────────
function toggleDesktopNav() {
  if (window.innerWidth <= 768) { toggleMobileNav(); return; }
  const nav  = document.getElementById('sidebarNav');
  const main = document.querySelector('.main-content');
  const collapsed = nav.classList.toggle('collapsed');
  if (main) main.style.marginLeft = collapsed ? 'var(--nav-w-col)' : 'var(--nav-w)';
  try { localStorage.setItem('navCollapsed', collapsed ? '1' : '0'); } catch(e) {}
}

function restoreNavState() {
  if (window.innerWidth <= 768) return;
  try {
    if (localStorage.getItem('navCollapsed') === '1') {
      const nav  = document.getElementById('sidebarNav');
      const main = document.querySelector('.main-content');
      if (nav) nav.classList.add('collapsed');
      if (main) main.style.marginLeft = 'var(--nav-w-col)';
    }
  } catch(e) {}
}

// ── Mobile drawer ────────────────────────────────────────────
function toggleMobileNav() {
  const nav     = document.getElementById('sidebarNav');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen  = nav.classList.toggle('open');
  if (overlay) {
    overlay.classList.toggle('show', isOpen);
    overlay.style.pointerEvents = isOpen ? 'all' : 'none';
  }
}

// Close drawer when a nav link is tapped on mobile
document.addEventListener('DOMContentLoaded', function() {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;
  nav.addEventListener('click', function(e) {
    if (window.innerWidth > 768) return;
    const link = e.target.closest('a.snav-item');
    if (link) setTimeout(toggleMobileNav, 80);
  });

  // Restore collapse state on desktop
  restoreNavState();
});
