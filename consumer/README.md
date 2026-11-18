# Consumer test

A Vite + Svelte 5 app without SvelteKit. It installs the packed `@mystravil/hardpoint` tarball, mounts every component in states that render all their parts, serves the build with `vite preview` under a strict production policy, and drives it with Playwright (Chromium) at 1440x900 (mouse) and 390x844 (`hasTouch`, `isMobile`), in both themes. It records every `securitypolicyviolation` event (directive, blocked URI, sample, source, start of the target's `outerHTML`) and every console message about the policy.

The repo's own gates read the `.svelte` sources. This app sees what an npm user gets: the files in `dist/`, the shipped `.d.ts` types, and the dependencies the package declares.

Some drivers also assert behaviour that only the shipped package can prove: a closed Menu, Popover, Select, Combobox, Tooltip, Dialog, ImageViewer or AppShell drawer adds nothing to `<body>`, its trigger keeps its ARIA while closed, and its first open plays the entrance and points the trigger at the open part (`menus`, `popovers`, `selects`, `tooltips`, `dialogs`, `viewer`, `shell`; Select's typeahead on the closed trigger and typing in a closed Combobox work before the first open; a Dialog or ImageViewer mounted with `open` set opens), Dialog's `initialFocus` places focus and an app's `onOpenAutoFocus` that calls `preventDefault()` overrides it (`dialogs`), a search TextField hides the browser's cancel button and its own clear button works by pointer and keys (`search`), Button renders the right element with the right link semantics and the danger tone reaches the element and its ink (`buttons`), an `error` on Select, NativeSelect, Checkbox and Switch sets `aria-invalid`, leads `aria-describedby` and reddens the boundary, while NativeSelect's `ref` is its `<select>` (`forms`), and `src/typed-api.ts` makes svelte-check prove that the shipped types require an accessible name on Progress, Meter and icon Buttons and refuse a tone on a primary Button, a MenuItem with `href` is an `<a>` that keeps the menuitem role, Enter, Space and a press follow it and close the menu, a disabled one is no link, and on a phone the tap that opens the sheet never follows a link under it (`menulinks`), a Slider's thumb and range sit where Bits UI puts them through the CSSOM, the keys, a press and a drag set the value and commit once, and a disabled one ignores all three (`slider`), TabNav marks the current link with `aria-current="page"`, scrolls it into view and follows `current` (`tabnav`), and a number, date, time or date and time TextField keeps its value a string, never resets what is typed, takes the picker icon in `--muted` through a mask and hides the spin buttons (`typedfields`). A failed assertion is a failed step.

The drivers added on 2026-11-18 assert more of the same: a MultiSelect's closed fields add nothing to `<body>`, its listbox is multiselectable with each count in the option's name, keys and taps toggle, the search box keeps the keys while typing, Escape returns focus, Clear empties it, and `name` and `required` work in a form (`multiselect`).

`table` drives Table's opt-in parts. A sortable header reports through `bind:sort` and carries `aria-sort` while the scene reorders the rows. A `wide` table overflows a named region that takes focus; arrow keys and a swipe scroll it, its first column stays in place, its edge attributes follow, and a press beside the first cell follows the row link. A row's detail fades in, closes in the same frame and leaves the row link alone. A column description opens from its "About …" button. On the phone the stacked list sorts with its select and lists its field descriptions behind one button. `src/typed-api.ts` also makes svelte-check prove that a `TableSort` key must be a field of the row and its direction one of `aria-sort`'s words.

The policy (`vite.config.js`, `preview.headers`) is omp-remote's production policy:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self';
img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none';
base-uri 'none'; form-action 'self'; frame-ancestors 'none'
```

## Run it

From the repo root:

```
npm run consumer
```

`scripts/consumer.mjs` packs the package into this folder, runs `npm ci` here, then does two rounds: one with the locked Svelte and one at the Svelte peer floor (the lowest version in the package's `peerDependencies`). Each round installs the tarball without saving it, runs `svelte-check` against the shipped types (TypeScript 6, `skipLibCheck: true`), builds with Vite and runs `run.mjs`. The release workflow runs the same command and publishes the tarball it tested.

To iterate on scenes after one full run, work in this folder:

```
node node_modules/vite/bin/vite.js build
node run.mjs                  all scenes, both viewports, both themes
node run.mjs dialogs menus    only these scenes
node run.mjs _control         negative control: must report violations
```

`run.mjs` starts `vite preview` on port 4180, or on `CONSUMER_PORT` when it is set, unless something already answers there. Two checkouts that run the test at the same time need different ports, or one tests the other's build. Pick a port that `fetch` and browsers allow: the Fetch standard blocks some, such as 4190, and then the run stops with "vite preview did not start".

- Exit 0: no violations, and every step reached its state.
- Exit 1: at least one violation or policy console message (listed as JSON lines).
- Exit 2: no violations, but a step could not reach its state. A state that was not reached is not proven clean; read "Failed steps".

A run takes about four minutes. `node run.mjs _control` proves the detector works: a static style attribute, an injected `<style>` and `setAttribute('style')` each have to show up as `style-src-attr` or `style-src-elem` violations.

## Add a component mount

1. Add `src/scenes/<name>.svelte`. It imports from `@mystravil/hardpoint` (and `@mystravil/hardpoint/motion`) like a real app, and renders the component in states that show all its parts. Open overlays need a trigger the script can press. A scene name starting with `_` is a negative control and runs only when named. Set the theme from script only. Never write a style attribute in this app's markup, because the policy blocks it too.
2. If the component needs interaction (opening, typing, hovering, swiping), add a driver in `run.mjs`, `drivers.<name>`. Each state goes in `c.step(name, fn)`; a step that throws is reported as failed, never as clean. Helpers on `c`:
   - `c.page`: the Playwright page.
   - `c.touch`: true in the 390x844 touch context.
   - `c.press(loc)`: a click on desktop, a tap on the phone.
   - `c.swipe(x0, y0, x1, y1)`: a real touch swipe through CDP.
   - `c.info(text)`: a line in the "Info" list (measurements, forms).

   A scene without a driver is only loaded and checked for violations.
3. For a scene that needs a variant (query string), add it to `variants` in `run.mjs`; the scene reads `location.search`.
4. `src/app.css` is the app's own stylesheet. Put class forms of a property override there, for example `.wide-popover { --popover-width: 480px }`.
5. Rebuild and run `node run.mjs <name>`.

## Files

- `vite.config.js`: the policy header and the preview port (4180, or `CONSUMER_PORT`).
- `index.html`: no inline script or style. `src/main.ts` sets the theme from `?theme=`.
- `src/main.ts`: imports the package CSS and mounts `App`.
- `src/App.svelte`: picks a scene by `location.hash` (`#dialogs`).
- `src/scenes/*.svelte`: one scene per file.
- `run.mjs`: the Playwright driver and violation recorder.
- `shots.mjs`: optional screenshots of overlays into a folder, to compare two tarballs byte for byte (`node shots.mjs before`, then `node shots.mjs after`).
- `public/staircase.jpg`: the CC0 photo from the docs (Duesseljan, Wikimedia Commons).
