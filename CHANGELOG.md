# Changelog

Hardpoint follows semantic versioning. Before 1.0.0, a breaking change raises the minor version.

## 0.6.0 (2026-11-18)

The parts topic-map's move asked for. Nothing is renamed or removed. One type changes: `MenuItem`'s `ref` is now `HTMLElement | null`.

- **Added**:
  - Category tokens `--category-1` to `--category-5` (teal, sky, blue, violet, magenta) in all three palette blocks, for data categories only: chart series, graph nodes, legends and a chip's category edge. Never use them for controls or text, and always pair them with a label or a legend. The hues sit between the green and red status hues, measure 3:1 or more on the canvas, `--surface-hover` and `--surface-selected` in both themes, and stay apart under protan, deutan and tritan simulation.
  - `Section`: a frameless block with a title (`titleAs` `h2` to `h6`), `meta`, `actions`, a flush body and an optional `foot`. Sections stack 48 px apart. New types `SectionProps`, `SectionTitleElement`.
  - `Status`: an inline square mark and label, with `tone` (`ok`, `warn`, `danger`; untoned is `--muted`) and `live`, a slow opacity pulse that stops under reduced motion. New types `StatusProps`, `StatusTone`.
  - `<Motion paused>`, `useMotion().paused` and `setMotionPaused` in `@mystravil/hardpoint/motion`, to pause motion that runs by itself, such as a live Status (WCAG 2.2.2). `MotionState` gains a `paused` field.
  - The `--dur-pulse` token (2400 ms).
  - `MultiSelect`: several values from a list, for filters. `value: string[]` (bindable) and `items` (`{ value, label, count?, group?, description?, disabled? }`). The trigger is Select's well and shows the placeholder, the one chosen label, or `selectedText(count)`. Options have Checkbox's box and an optional count. A search box appears above more than `searchThreshold` (8) options, and a clear button sits in the well. Chosen values that are not among `items` stay listed first. It takes `hint`, `error`, `labelBeside`, `name` (one hidden input per value) and `required`, and opens in the shared bottom sheet below 600 px. New types `MultiSelectProps`, `MultiSelectItem`, `MultiSelectLabelBeside`.
  - `Chip`: a data value as written in an outlined block (1 px `--border-control`, no fill, Geist, never caps). `href` makes it a link with an outlined button's states. `count` adds a muted tabular number. `tentative` dashes the edge and adds hidden words (`tentativeLabel`, default `tentative`). `category` (1 to 5) draws a 3 px start edge in `--category-N`. `onremove` adds a remove button beside the text or link, never inside it, named `Remove <label>` (`removeLabel`), a 24 px target with a mouse and 44 px on touch. When a removed chip held focus, focus moves to the next chip in the same list, or the previous one. New types `ChipProps`, `ChipCategory`.
  - `ChipField`: a text field whose values become chips (`value: string[]`, bindable). Enter adds the trimmed text, and a comma stays part of the value. Repeats are not added. Suggestions come from a native `<datalist>`, and a picked one is added at once. Backspace in the empty field moves to the last chip's remove button. `name` posts each value as a hidden input, and a hidden status line reports each change. `format` shows a value as other text; `removeLabel`, `addedText`, `removedText` and `duplicateText` set the words. New type `ChipFieldProps`.
  - `BarChart`: vertical bars, stacked when there are two or more series. Series take `--category-1` to `--category-5` by default, the inks `text` and `muted`, or a status `tone`. A legend readout above the plot shows one bar's values for the mouse, a tap or the arrow keys, and a visually hidden table holds every value. Scale and axis labels are Geist Mono in `--muted`, hairlines are `--border`, bars sit on whole pixels, and nothing animates. `--bar-chart-height` sets the plot height (default 160 px). New types `BarChartProps`, `BarChartItem`, `BarChartSeries`, `BarChartColor`, `BarChartTone`.
  - `Sparkline`: an inline line of readings with an area under it and a 6 px square at the last reading, and no axes. It is an image named by `label` and the last reading. `null` keeps its place, `min` and `max` widen the scale, `color` and `tone` set the colour, and `--sparkline-width` and `--sparkline-height` set the size (default 96 by 24 px). New types `SparklineProps`, `SparklineColor`, `SparklineTone`.
  - `MenuItem` takes `href`, with `target`, `rel` and `download`: a real `<a>` that keeps the menuitem role, follows the link on a press, Enter or Space, and closes the menu. A disabled link item has no address.
  - `Slider`: a caps label with the value shown live beside it (`format`, `valueText`), `value`, `min`, `max`, `step`, `hint` and `disabled`. New type `SliderProps`.
  - `TextField` types `number`, `date`, `time` and `datetime-local`, with the browser's own pickers. `value` stays a string. Spin buttons are hidden, and a number field sets `inputmode` itself where it helps.
  - `Table` sortable columns: `sortable` and `sortFirst` on a column make its header label a button with `aria-sort`. `bind:sort` reports `{ key, direction }` (new types `TableSort`, `TableSortDirection`), and the app reorders the rows. Below 600 px a sort select above the stacked list sets the same value. New labels `sortLabel`, `unsortedLabel`, `ascendingLabel`, `descendingLabel`.
  - `Table` `wide` for data grids: natural widths, no ellipsis, a scroll region that takes focus while it scrolls, a sticky first column, 1 px scroll edges, and no stacking on phones.
  - `Table` expandable rows through a `detail` snippet and `bind:expanded`. The expand button has `aria-expanded`, `aria-controls` and the `expandLabel` name. The detail fades in over `--dur-expand`, and closing cuts.
  - `Table` `description` on a column, opened from a named info button in a Popover (a sheet on phones). New labels `aboutLabel`, `aboutColumnsLabel`.
  - `TabNav`: route tabs as a `<nav>` of links in the Tabs look, with `aria-current="page"` on `current`. New types `TabNavItem`, `TabNavProps`.
- **Changed**:
  - `MenuItem` `ref` is typed `HTMLElement | null` (was `HTMLDivElement`), because a link item is an `<a>`.
  - `Tabs` takes its strip and tab styles from the new global `.hp-tab-strip` and `.hp-tab` classes in `base.css`, shared with `TabNav`. It looks the same.
  - `Table`: a header band with a sort or description button is 44 px tall on touch (36 px with a mouse, as before). Tables without these buttons are unchanged. Table now imports NativeSelect, Popover and Button, so an app that uses Table bundles them too.

## 0.5.0 (2026-11-13)

Breaking: three props are renamed, Checkbox, Switch, Progress, Meter and icon Buttons need an accessible name in their types, and DOM tests wait one tick after a Dialog's first open, so a consumer must adapt (the **Changed (breaking)** list below).

- **Added**:
  - `Select` and `NativeSelect` take `hint` and `error` with TextField's field messages (`aria-describedby` error, hint, then the app's own; `aria-invalid` on the control; a red well boundary). `Checkbox` and `Switch` take `error`: the message under the row, `aria-invalid` on the button and a red box or track edge. `NativeSelect` takes a bindable `ref` (the `<select>`), so an app can focus it as the first invalid field. `Select` takes `closeLabel` (default `Close`) for its compact sheet's close button.
  - `Button` `tone="danger"` for a destructive action, on `secondary` (a `--danger` border and label) and `tertiary` (a `--danger` label and hover underline). Hover, press and focus look as before, a disabled danger button looks like any disabled button, and the element carries `data-tone="danger"`. `variant="primary"` takes no tone (a type error). New type `ButtonTone`.
  - `Combobox` `searchPlaceholder` (default `Search`): the placeholder of the compact sheet's search field when the app sets no `placeholder`, so the field reads as a filter.
  - `.hp-selected` in `base.css`: the selection rule (the `--surface-selected` tint and a 3 px `--accent` edge on the inline start, on the right under `dir="rtl"`) for an app's own rows, at zero specificity. Pair it with `aria-current` or `aria-selected`.
  - `Dialog` `initialFocus`: an element, or a function that returns one, where focus starts when the dialog opens (the close button without it). An app's own `onOpenAutoFocus` runs first and wins when it calls `preventDefault()`.
- **Changed** (breaking):
  - `NativeSelect`: the `options` prop is now `items`, and the type `NativeSelectOption` is now `NativeSelectItem`.
  - `MenuItem` `variant="danger"` is now `tone="danger"`; the attribute `data-variant` is now `data-tone`, and the type `MenuItemVariant` is now `MenuItemTone`.
  - `EmptyState` and `ErrorState`: the `action` snippet is now `actions`. EmptyState's wrapper class `hp-empty-state-action` is now `hp-empty-state-actions`.
  - Types: `Progress`, `Meter`, `Checkbox` and `Switch` need exactly one of `label`, `aria-label` or `aria-labelledby`, and an icon `Button` (`icon`) needs `aria-label` or `aria-labelledby`. Code without an accessible name no longer type-checks.
  - `Dialog`, `ImageViewer` and the `AppShell` drawer mount Bits UI's portal and content on the first open, as `Menu`, `Popover`, `Select`, `Combobox` and `Tooltip` do, so a closed one adds nothing to `<body>` (three closed Dialogs added 93 nodes in 0.4.0, three ImageViewers 75, a closed drawer 29). The trigger's ARIA is the same while closed, and the first open plays the entrance. A DOM test (happy-dom) now awaits one `tick()` before `flushSync()` after the first open and after mounting a Dialog or ImageViewer with `open` set; later opens need no wait. An app that mounts each Dialog only from its first showing can drop that gate.
- **Changed**:
  - `Combobox` announces "No matches" from one visually hidden `role="status"` region that mounts with the field, so the first key typed into a closed combobox that matches nothing is announced too. The visible empty line looks as before and is `aria-hidden`.
  - `toast()` without a mounted `<Toaster />` logs one console warning per page that names the fix. The message is still not shown, and the returned handle works as before.

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
