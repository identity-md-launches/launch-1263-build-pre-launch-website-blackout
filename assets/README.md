# BLACKOUT art

The current artwork is code-native SVG in `src/sprites.ts`; no runtime files are loaded from this directory. Edit that registry to keep each item consistent everywhere.

- `spriteSheet()` injects twelve shared **64×64** hardware symbols once.
- `itemSprite(type, rarity, className, durability)` references the atlas and adds rarity/damage effects. All twelve item names come from the unchanged game config.
- `districtSprite(index, event, className)` draws the eight **104×100** district landmarks with event overlays. `districtArt` supplies the name, accent and landmark caption.
- `sprite(name, className)` supplies the **960×420** living city, **128×128** hooded dispatcher, pack, tower, room, logo, bolt and coin.
- `standaloneItem()` uses the same drawing registry for PNG sharing. There are no separate hand-maintained item images.

Artwork is decorative; accessible identity, rarity and status are written next to it. SVG `<use>` references stay inside the document and work offline. Animation styles are in `src/style.css`; presentation timing and sound are in `src/effects.ts`.

`node scripts/render-assets.mjs` renders the 1200×630 social image and derives favicon/app icon from the header logo. Run a production build before and after this command. Fonts are local WOFF2 files under `public/assets/`; licenses live in `licenses/`.
