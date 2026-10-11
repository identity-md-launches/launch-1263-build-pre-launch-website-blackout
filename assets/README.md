# Replaceable sprite art

Place hand-made `gpu.svg`, `cooling.svg`, `psu.svg`, `room.svg`, `pack.svg`,
`mascot.svg`, `city.svg`, `tower.svg`, `bolt.svg`, `coin.svg`, `district.svg`, or `merge.svg`
here and rebuild. PNG and WebP work with the same names. Prefer exactly one
file per name. `src/sprites.ts` is the only registry; it automatically uses
the matching file instead of its code-drawn SVG. Keep transparent backgrounds
and the original proportions. All art uses `image-rendering: pixelated`.

The city viewBox is 960×360; pack is 100×120; other sprites are 80×64.
Code-generated city windows and fans animate; replacement images supply their
own art, and should avoid baked-in motion for reduced-motion users.

## Item collection

`itemSprite(type, rarity, className)` in `src/sprites.ts` draws all 12 item
types in all 5 rarities, giving the collection 60 local SVG variations.
GPU, ASIC and FPGA are visually distinct compute equipment; Power Supply,
Battery, Solar Panel, Fan, Liquid Cooling, Router, Motherboard, Server Rack
and Surge Protector each have their own silhouette. These collection
sprites are generated separately from the replaceable scene artwork above.

Common uses muted blue-grey, Rare cyan, Epic magenta, Legendary yellow and
Mythic red. Higher tiers add equipment details, pixel halos, corner accents
and one through five rank pips. Rarity labels remain visible in the UI, so
color is not the sole distinction. All SVGs are decorative (`aria-hidden`)
and rely on their containing item's accessible label. No font, network
request, raster asset or SVG filter is required to render the collection.
