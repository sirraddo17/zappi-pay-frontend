// Runs before the app draws (kept as a file, not inline, so the
// Content-Security-Policy can forbid inline scripts).
// The admin app lives on its own address (admin.zappipay.com.ng):
// browsers only allow one installed app per site, so a separate
// subdomain is what lets "ZP Admin" sit next to the customer app.
// There, every page is an admin page ("/" → "/admin").
(function () {
  // status.zappipay.com.ng shows the public status page.
  if (location.hostname.indexOf('status.') === 0 && location.pathname !== '/status') {
    location.replace('/status');
    return;
  }
  var isAdminHost = location.hostname.indexOf('admin.') === 0;
  if (isAdminHost && location.pathname.indexOf('/admin') !== 0) {
    location.replace('/admin' + location.search);
    return;
  }
  if (!isAdminHost && location.pathname.indexOf('/admin') !== 0) return;
  document.getElementById('app-manifest').href = '/admin.webmanifest';
  document.getElementById('app-touch-icon').href = '/admin-icon-192.png';
  document.getElementById('app-title').content = 'ZP Admin';
  document.querySelector('meta[name="theme-color"]').content = '#0f1628';
})();
// Light / dark mode, applied before the app draws so there's no
// flash. Saved choice: 'light', 'dark' or 'system' (default dark).
(function () {
  try {
    var t = localStorage.getItem('zappipay_theme') || 'dark';
    if (t === 'system') t = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    // Lite / data-saver mode (src/lib/lite.js).
    if (localStorage.getItem('zappipay_lite') === '1') document.documentElement.setAttribute('data-lite', '');
  } catch (e) { /* private mode */ }
})();
