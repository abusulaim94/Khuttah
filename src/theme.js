const key = 'khuttah-theme-v1';
const system = window.matchMedia('(prefers-color-scheme: dark)');
export const themeOptions = {system: 'Ikut peranti', light: 'Cerah (Light)', dark: 'Gelap (Dark)'};
export function getTheme() {
  try { const value = localStorage.getItem(key); return Object.hasOwn(themeOptions, value) ? value : 'system'; }
  catch { return 'system'; }
}
let preference = getTheme();
function applyTheme() {
  const resolved = preference === 'system' ? system.matches ? 'dark' : 'light' : preference;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#18181b' : '#fafafa');
}
export function setTheme(value) {
  if (!Object.hasOwn(themeOptions, value)) return;
  preference = value;
  try { localStorage.setItem(key, value); } catch {}
  applyTheme();
}
system.addEventListener('change', applyTheme);
window.addEventListener('storage', event => { if (event.key === key) { preference = getTheme(); applyTheme(); } });
applyTheme();
