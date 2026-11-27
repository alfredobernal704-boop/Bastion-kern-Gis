# BASTION-KERN design system

The editable Atlas and design-system foundations are in the [Figma file](https://www.figma.com/design/gqmpiugkCZ7OecQNRk0HkN). Page `02 · System Foundations` contains the reusable color, dimension, and motion variables plus the four-state Button component family.

| Figma collection | Contents | Code counterparts |
| --- | --- | --- |
| `BASTION · Color` | Canvas, surface, strong/muted/on-brand text, teal, sky, meadow, copper, building, and subtle stroke | Web CSS custom properties in `apps/web/src/styles.css`; `BastionColors` / `BastionColor` on Android/iOS |
| `BASTION · Dimensions` | 4–32 px spacing, control/card/pill radii | CSS variables; `BastionDimensions` / `BastionDimension` |
| `BASTION · Motion` | 160, 240, and 350 ms transitions | CSS variables; `BastionMotion` |

Figma variables include WEB, ANDROID, and iOS code syntax so designers can inspect the platform mapping. The 3D map camera uses the 350 ms token; route and control motion uses the shorter durations. The browser stylesheet mirrors the token values and the map palette is read from those CSS variables.

