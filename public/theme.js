// Light / dark / auto theme, remembered per browser.
const KEY = "bingo:theme";
const get = () => { try { return localStorage.getItem(KEY) || "auto"; } catch { return "auto"; } };
const root = document.documentElement;
const apply = (t) => (t === "auto" ? root.removeAttribute("data-theme") : root.setAttribute("data-theme", t));
apply(get());

export const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
export function cycleTheme() {
  const next = { auto: "dark", dark: "light", light: "auto" }[get()];
  try { localStorage.setItem(KEY, next); } catch {}
  apply(next);
  window.dispatchEvent(new Event("themechange"));
  return next;
}
export const themeLabel = () => ({ auto: "Theme: auto", dark: "Theme: dark", light: "Theme: light" }[get()]);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => window.dispatchEvent(new Event("themechange")));
