# Theme + Home layout (19.9.0)

## Theme (ek hi system)
- `theme.js` (har page ke `<head>` me sabse pehle): `localStorage.bsp_theme` = `light | dark | system` (default light) -> `<html data-theme="light|dark">`. API: `BspTheme.get() / effective() / set(mode) / toggle()`.
- `theme.css`: dark palette (neutral rang), smooth transition (`html.theme-anim`, sirf ~0.4s), toggle buttons. Brand rang sirf `ux-pro.css`.
- Purana `body.dark-mode`, OS `prefers-color-scheme` rules aur `toggleDarkMode()` hata diye gaye. `bsp_dark_mode=1` ek baar `bsp_theme=dark` me migrate hota hai.
- Naye component me rang hamesha CSS variable se (`var(--white)`, `var(--text)` ...), hardcoded hex nahi.

## Home (dashboard)
- CSS sirf `ux-pro.css` ke "HOME v3" block me (grid 8px, gutter 16px, gap 12px). Nayi home CSS yahin likho, doosri jagah nahi.
- Scroll: `#screenContainer` hi scroll hota hai; `.customer-search-wrap` aur `.tabs` sticky. "Aur customers" observer ka root `#screenContainer`.
- Customer screen par `customer-mode` class neeche ka khaali padding hataati hai.

## Tests
`npm test` (tests/theme-home.test.mjs) + browser: `tests/e2e-sandbox/t30_theme.py`, `t31_settings.py`, `t32_home_layout.py` (chalane ke liye `docs/testing.md`).
