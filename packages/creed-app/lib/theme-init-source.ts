// Inline in the static root layout so the first paint already has `.light` or
// `.dark`. `next/script` beforeInteractive and `preinit` only preload on
// prerendered marketing HTML, which leaves :root tokens (the opposite of a
// stored theme that disagrees with the device scheme). Same-origin file copies
// stay for docs and as a CSP `'self'` fallback. Authenticated routes that use
// a nonce policy will ignore this inline script; they already paint through
// InitialThemeBoundary.
export const THEME_INIT_SOURCE = `try {
  const stored = localStorage.getItem("creed:theme");
  const dark = stored
    ? stored === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  document.cookie = \`creed-theme=\${dark ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax\`;
} catch {
  // Storage or media queries can be unavailable in restricted browser contexts.
}
`;
