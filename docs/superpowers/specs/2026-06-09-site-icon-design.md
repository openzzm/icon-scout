# Icon Scout Site Icon Design

## Direction

Use a double-layer scan frame that extends the existing header brand mark.

- Dark rounded-square background matching the site's near-black surfaces.
- Outer blue-violet rounded scan frame, rotated slightly for energy.
- Inner bright rounded square representing the discovered icon.
- A small circular discovery point in the upper-right corner.
- No text, thin details, or shadows that disappear at 16x16.

## Assets

- `public/favicon.svg`: scalable source and preferred browser icon.
- `public/favicon.ico`: legacy browser fallback with 16, 32, and 48 pixel layers.
- `public/icon-192.png`: web app icon.
- `public/icon-512.png`: high-resolution web app icon.
- `public/apple-touch-icon.png`: 180 pixel Apple touch icon.
- `public/site.webmanifest`: app icon declarations and theme colors.

## Integration

- Add favicon, Apple touch icon, and manifest links to the page head.
- Use the same SVG asset inside the header brand mark.
- Keep the mark readable against both dark browser chrome and light icon surfaces.

## Acceptance

- The icon remains recognizable at 16x16.
- SVG and PNG variants share the same geometry and colors.
- ICO contains usable 16, 32, and 48 pixel frames.
- The deployed site declares all assets and returns them successfully.
