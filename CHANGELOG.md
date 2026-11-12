# Changelog

Hardpoint follows semantic versioning. Before 1.0.0, a breaking change raises the minor version.

## 0.4.0 (2026-11-12)

- **Changed**: `Popover`, `Select`, `Combobox` and `Tooltip` mount Bits UI's portal and content on the first open instead of with the trigger, as `Menu` does since 0.3.0, so a closed one adds nothing to `<body>` (Bits UI's portal added about 35 nodes each). The trigger's ARIA is the same while closed: `aria-haspopup` (Popover `dialog`, Select `listbox`), `role="combobox"` on Select and Combobox, `aria-expanded`, and `aria-controls` only while open. Select and Combobox show the chosen label in the closed field, and a Tooltip still describes its trigger only while open. Select's typeahead on the closed trigger and the first key typed in a closed Combobox work before the first open. The first open still plays the entrance: the content mounts closed and opens one tick later. A DOM test, for example in happy-dom, now awaits one `tick()` before `flushSync()` after the first open; later opens need none.

## 0.3.0 (2026-11-12)

- **Added**:
  - `TextField` with `type="search"` shows its own clear button at the end of the well while the field holds text, and hides the browser's cancel button, which Chrome on Android drew in bright blue. The button is 44 px on coarse pointers. A press empties the field, fires `input` (so `bind:value` and `oninput` see it) and leaves focus in the field; Tab reaches it, and Enter or Space clears. `clearLabel` names it (default `Clear`).
  - `TextField` `labelHidden`: the label stays the field's accessible name but is hidden from sight, for a search in a toolbar. The well keeps its look and 16 px text.
- **Changed**:
  - `Menu` mounts Bits UI's portal and content on the first open instead of with the trigger, so a closed menu costs about a fifth of what it did (66 µs against 322 µs in Chromium, with its Button trigger). The trigger keeps `aria-haspopup`, `aria-expanded` and, while open, `aria-controls`; the first open plays the entrance as before.
  - `Button` renders a plain `<button>`, or an `<a>` with `href`, without Bits UI's dynamic element, and mounts in less than half the time (10 µs against 23 µs). A disabled link still has no `href`, `role="link"`, `aria-disabled="true"` and `tabindex="-1"`. The element no longer carries Bits UI's `data-button-root`, `tabindex="0"` or `aria-disabled="false"`. `ButtonProps` is Hardpoint's own type with the same shape.

## 0.2.1 (2026-11-12)

- **Changed**: the source is public at [MYSTRAVIL/hardpoint](https://github.com/MYSTRAVIL/hardpoint), and `package.json` links it. Releases publish from GitHub Actions through npm trusted publishing, so from this version on each release carries a provenance attestation that ties it to its commit and workflow run. The components did not change.

## 0.2.0 (2026-11-11)

- **Added**:
  - `Meter`: a measurement inside a known range as separate segments, coloured by `warnAt` and `dangerAt` or by an app-set `tone`, with an optional `marker` and `detail` line.
  - `Notice`: a persistent message in the page flow with an optional tone mark, title, text, up to two actions and a close button.
  - `TextArea`: a multi-line text field that grows from `rows` to `maxRows` lines, then scrolls inside, with TextField's label, hint and error.
  - `RadioGroup`: one choice from a set of rows, each with an optional hint and tag, named by a caps `label` or a `legend`, with a group `error`.
  - `CheckboxGroup`: `legend` (a name set as written, instead of `label`), `error` and an item `tag`.
  - `Checkbox`: `tag`. The whole row is now the target: a press on the hint, the tag or the gap counts as a press on the label.
  - `ListDetail`: a list column beside the open item from `splitFrom` (`medium`, `expanded` by default, or `large`), one pane at a time below it, picked by a bindable `showDetail`.
  - `ImageViewer`: one image full screen at every width over a Bits Dialog, with pinch zoom, pan, double-tap and wheel zoom, a Download button, a loading spinner, and Close, Escape or a swipe down at scale 1 to leave.
  - `.hp-prose` in `base.css`, with `.hp-prose-code`, `.hp-prose-copy` and `.hp-prose-scroll`: styles for rendered markdown or sanitised HTML, at zero specificity. It covers headings, lists, task lists, quotes, code blocks with a copy button, tables that scroll inside their wrapper, and images.
  - Grouped options: `group` on `SelectItem`, `ComboboxItem` and `NativeSelectOption`. Select and Combobox show a sticky heading per group, and NativeSelect renders `<optgroup>`.
  - The token `--list-detail-width: 320px` (ListDetail's list column).
- **Changed**:
  - `--popover-width`, `--tooltip-width` and `--toast-width` can now be set from an app's class and stylesheet rule. Before, the component's own rule won over an app's one-class rule.
  - The Dialog body sets `scroll-padding-block: var(--space-2)`, so a revealed caret stays 8 px clear of the action row.
  - Combobox's default filter also matches an item's `group`, drops the heading of a group with no match, and scrolls the list to the top as you type.
- **Checked**: every exported component, `toast()` and `Motion` run under `style-src 'self'` with no policy violation.

## 0.1.0 (2026-11-11)

The first public release. It needs Svelte 5.57 or newer.

- **Components** (Svelte 5 on Bits UI):
  - Actions and forms: Button, TextField, NativeSelect, Select, Combobox, Checkbox, CheckboxGroup, Switch.
  - Overlays: Dialog (centred, bottom sheet or full screen), Popover, the Menu family, Tooltip with TooltipGroup, and Toaster with `toast()`.
  - Navigation: AppShell (header, bottom bar or drawer, rail or sidebar), Tabs, Steps, Pagination.
  - Data and display: Table, KeyValueList, Stat, Tag, Timeline, MediaFrame with MediaImage, Disclosure.
  - Feedback: Progress, Spinner, Skeleton, LoadRegion, EmptyState, ErrorState.
- **Motion** (`@mystravil/hardpoint/motion`): `<Motion tier>` and `useMotion()`, the overlay transitions `pop`, `sheet`, `fade` and `drawer`, and timing tokens for every duration. Quiet motion is the default; expressive effects run only inside `<Motion tier="expressive">` and never under reduced motion.
- **CSS**, framework-free: `fonts.css` (Geist, Geist Mono and Geist Pixel Square with size-matched fallback faces), `tokens.css` and `base.css`.
- **Themes**: dark by default; light through `data-theme="light"` on `<html>`, or `data-theme="system"` to follow the device.
- **Phones**: 44 px touch targets on coarse pointers, 16 px inputs, bottom sheets on compact widths that stay above the on-screen keyboard, and safe-area insets.
