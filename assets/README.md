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
