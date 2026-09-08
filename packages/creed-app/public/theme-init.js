try {
  const stored = localStorage.getItem("creed:theme");
  const dark = stored
    ? stored === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  document.cookie = `creed-theme=${dark ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
} catch {
  // Storage or media queries can be unavailable in restricted browser contexts.
}
