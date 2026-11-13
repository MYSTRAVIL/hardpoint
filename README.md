# Hardpoint

Hardpoint is a Svelte 5 design system on [Bits UI](https://www.bits-ui.com/). Its look and motion come from Dan Neuenhaus's MONOLITH reel, adapted for ordinary apps: AMOLED black, titanium ink, the Geist type family, square solid blocks for actions and tags, banded tables of mono data, and expressive motion only where an app asks for it. Bits UI supplies the behaviour and accessibility; Hardpoint supplies the look and the motion.

It works on desktop and on phones: 44 px touch targets on coarse pointers, 16 px inputs, bottom sheets on compact widths that stay above the on-screen keyboard, and safe-area insets. Dark is the default theme, and a light theme is built in. Status colours (red, yellow, green) mean status only; no hue is a brand colour.

The package imports nothing from SvelteKit, so plain Svelte apps can use it. The three CSS files are framework-free, so apps without Svelte can use the tokens and base styles.

## Components

- Actions and forms: `Button`, `TextField`, `TextArea`, `NativeSelect`, `Select`, `Combobox`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`.
- Overlays: `Dialog` (centred, bottom sheet or full screen), `Popover`, `Menu` with `MenuItem`, `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem`, `MenuGroup` and `MenuSeparator`, `Tooltip` with `TooltipGroup`, `Toaster` with `toast()`, and `ImageViewer` (one image full screen, with pinch zoom).
- Navigation and layout: `AppShell` (header, bottom bar or drawer, rail or sidebar), `ListDetail` (a list beside the open item, one pane at a time on narrow screens), `Tabs`, `Steps`, `Pagination`.
- Data and display: `Table`, `KeyValueList`, `Stat`, `Tag`, `Timeline`, `MediaFrame` with `MediaImage`, `Disclosure`, and `.hp-prose` in `base.css` for rendered markdown.
- Feedback: `Progress`, `Meter`, `Notice`, `Spinner`, `Skeleton`, `LoadRegion`, `EmptyState`, `ErrorState`.

The source is on GitHub at [MYSTRAVIL/hardpoint](https://github.com/MYSTRAVIL/hardpoint), with a showcase app that has a docs page for each component, the foundations, the motion tokens and a specimen app.

## Install

```sh
npm install @mystravil/hardpoint
```

Svelte 5.57 or newer is a peer dependency. Bits UI comes with the package.

## Use

```js
import '@mystravil/hardpoint/fonts.css';
import '@mystravil/hardpoint/tokens.css';
import '@mystravil/hardpoint/base.css';

// Svelte components
import { Button, Dialog, Table, Pagination, TextField, toast } from '@mystravil/hardpoint';
// Motion: <Motion tier="expressive"> for infrequent moments, and the overlay transitions
import { Motion, useMotion, pop, sheet, fade, drawer } from '@mystravil/hardpoint/motion';
```

Skip `fonts.css` if the app already serves Geist.

The theme is an attribute on `<html>`: `data-theme="light"`, `"dark"` or `"system"` (follows the device). Without it the theme is dark. Set it before first paint, and set `<meta name="theme-color">` to the canvas colour, `#000000` for dark and `#f7f5f0` for light.

## Docs

The design docs are in the source repository's `docs/` folder: `BRIEF.md` is the spec, with every decision and its reason; `ux-research.md` holds the UI/UX research and standards behind the app and phone rules; `elements-da3.md` and `measurements-da3.md` measure the reference reel, whose frames stay out of the public repository. `CHANGELOG.md` in the package lists the changes in each version.

## Develop

```sh
npm install
npm run dev      # showcase app in src/routes
npm run check    # svelte-check; no SvelteKit imports, static style attributes or colour literals in src/lib
npm run build    # showcase build, then svelte-package and publint into dist/
npm run audit    # targets, overflow, 16px inputs, contrast on every route and open overlay at four viewports, dark and light
npm run shot -- /foundations shots/f.png --serve                       # screenshot with console-error check
npm run shot -- /foundations shots/f-phone.png --w 390 --h 844 --touch --full --serve
npm run consumer # pack the package and test it in consumer/, a Vite app without SvelteKit, under style-src 'self'
```

`src/lib` is the library. `src/routes` is the showcase. `consumer/` is the consumer test app.

A `v*` tag on GitHub runs the same gates in `.github/workflows/release.yml` and publishes the tested tarball to npm through trusted publishing, with provenance.

## Licence

The code is MIT licensed (`LICENSE`). The fonts are not: Geist, Geist Mono and Geist Pixel Square ship in `dist/fonts` under the SIL Open Font License 1.1 (`OFL.txt`, `OFL-geist-pixel.txt`).
