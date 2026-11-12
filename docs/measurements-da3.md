# MONOLITH reel (da3): pixel measurements

Source `in/VID_danneuenhaus_20261106_170942_da3.mp4`. Numbers come from decoded pixels; rows tagged **visual** were read by eye. Elements are named by role (the `da3-NN` ids are in `elements-da3.md`).

## 0. Method

| Item | Value |
|---|---|
| Stream | h264 High, yuv420p, bt709 limited, 1080x608, 24 fps constant, 879 frames (36.625 s; audio track 36.754 s), 529 kbps |
| Frame index | `n` 0-based, `t = n/24`, 1 frame = 41.67 ms. Start and end frames are +-1 frame |
| Coordinates | native 1080x608, x right, y down. `(x0,y0)-(x1,y1)` is a box; `x a-b` is an inclusive extent |
| Decode | once to raw RGB, memory-mapped in numpy (section 6). ffmpeg's default conversion is byte-identical to the explicit bt709 one |
| Colour | median RGB of a patch, never one pixel. For text: median of the brightest 2-9 % of pixels in the box |
| Timing | per-frame change inside an element's box (count of pixels whose channel diff is above 20-40) or a tracked extent (left edge, lit-segment count, bbox). A box that changes only every k frames is stepped at 24/k Hz. A box that changes every frame with shrinking deltas is eased |
| Easing fit | least squares of `v0 + (v1-v0)*bezier((n-t0)/D)` over D and t0 for named cubic-beziers; winner and RMSE quoted. `inOutExpo` = cubic-bezier(.87,0,.13,1). `inOutSine` = cubic-bezier(.37,0,.63,1) |
| Confidence | A direct count or extent. B curve fit. C visual or a single observation |

## Cheat sheet

- 24 fps. Most UI steps are 2 frames (12 Hz) or 4 frames (6 Hz). Slides and spins are per-frame and eased.
- Slides use one curve, `cubic-bezier(.87,0,.13,1)`: wordmark slide 646 ms, menu item entry 651 ms, menu exit 800 ms, login panel exit 1.0-1.07 s, crosshair quarter turn 764 ms, wordmark shrink 580 ms, form wipe 500 ms.
- Counters use `cubic-bezier(.37,0,.63,1)` over about 2.1 s (50 frames), updated every frame.
- Stagger: menu in 2 f, menu out 1.4 f, table rows 2 f, key/value rows 1.5 f, header labels 3 f. Selection scan 4 f per step, hard cuts.
- Typing 14-19 chars/s, 1-2 frames per char. Loading bar 29 segments, one per frame (1.21 s).
- Decode effect = 1-3 frames of coarse blocks, 3 frames of garbled glyphs, then clean: 5-6 frames per element.
- Marquees: SYS BREACH 300 px/s left, vertical 171 px/s up, both constant.
- Colours: canvas `#100D11`, orange `#F46901`, grey fills `#343333`, background blocks `#211F20`, white `#F1F2ED`, SYS red `#EC100A`.
- Type: caps 84 / 48 / 46 / 31 / 26 / 20 / 14 / 10 px; mono advance is 0.84 of cap height; hairlines are 1 px.

## 1. Colours

### 1.1 Surfaces, fills, text

| Role | Hex | Where and how | Conf |
|---|---|---|---|
| Canvas | `#100D11` (16,13,17) | n=0 box (100,100)-(300,200), sd 0; same median in empty areas at n=60, 120, 200, 500. Not pure black. n>=866 (36.08 s) is `#000000` | A |
| Grey fill (menu item, table header bar) | `#343333` (52,51,51) | sd 2. n=252 boxes (310,160)-(450,185), (300,215)-(440,240); n=390 (100,135)-(330,160). Loading ghost wordmark `#343332` (n=337, pixels luma 25-100 in rows 560-607) | A |
| Background block, menu header block | `#211F20` (33,31,32) | n=252 (150,110)-(340,140); `#201E1F` at (10,10)-(60,60). 17 levels above canvas | A |
| Flat white (buttons, dropdowns, logo mark) | `#F1F2ED` (241,242,237) | n=516 (690,88)-(720,96) `#F2F1ED`; n=390 (665,82)-(735,85) `#F2F3EE`; n=790 (72,512)-(148,516) `#F1F2EB`; n=60 mark `#F1F2ED`. Grain sd 3-5 | A |
| Primary text, large stems | `#F4F4F0` | n=510 top 9 %: DELIVERED `#F4F4F0`, MNL-1593-14 `#F3F4EF`; wordmark n=390 `#F4F5EF`; max `#FFFFFF`. Cool, slightly green: G highest, B lowest | A |
| Primary text, small | `#DFE1DA` to `#F6F8F2` | table body n=390 box (60,185)-(480,200): top 9 % `#DFE1DA`, top 2 % `#F6F8F2`; kv labels `#ECF1EA`, values `#EFEFEB` (n=510). Anti-aliasing keeps small glyphs below the flat white | A |
| Secondary text | none | All labels use the same white; hierarchy is size and case. Dimmest is the boot log, top 3 % `#C6CAC6` (n=60, 7 px glyphs, anti-alias limited) | A |
| Text on orange | `#FFF1DE` | n=252 selected item top 2 %; row `#FFECC7` (n=390); login field `#FFE6C0`; LOGIN `#FFF4E2`. Warm cream from glow and chroma bleed | A |

### 1.2 Orange: value and role of each element

| Element | Hex | Where and how | Role (library mapping) |
|---|---|---|---|
| Login panel, x 540-1079, y 0-607 | `#F46901` (244,105,1) | n=150, nine 12x12 to 24x12 patches, all within +-1, sd 2-4 | Hero surface of the auth screen (titanium surface) |
| Login input wells | `#E15401` (225,84,1) | n=170 boxes (800,195)-(980,222), (800,278)-(980,302), (800,360)-(980,385) | Input well, 8 % darker R and 20 % darker G than the panel |
| Login tabs and LOGIN button | `#1D0802` tab, `#120200` button | n=170 darkest 30 % of tab, median of button | Inverse (near-black) label tab and primary button |
| Menu selected item | `#F46901` | n=252 box (300,420)-(440,450) | Selected / active item (titanium fill, black text) |
| Table selected row | `#F66900` | n=390 gap box (630,248)-(745,266); row x 36-1043, y 246-269 | Selected row (titanium) |
| Micro tag chips (UNIT ID, UNIT MANIFEST, STATUS, UPDATES) | `#EF6804` | n=516 fill strips `#ED6708`, `#EE6902`, `#F06904`, `#F2660A` | Static section-label chip |
| Timeline squares | `#F26804` | n=640 box (72,324)-(83,336) | Step markers (past events) |
| Timeline rail, 2 px | blend `#B53A16` | n=640 box (76,430)-(78,470); half-covered 2 px line | Step rail |
| Orbit sun | `#F18623` median, `#F58B28` top quartile | n=520 box (672,372)-(744,436); lighter and yellower than the UI orange | Illustration only |
| Alert X box and card with "!" | `#F46901` | n=89 box (620,60)-(1000,200) | Alert / error state (danger hue only for a real error) |
| SYS BREACH full screen | `#F46901` | n=830 boxes (100,30)-(500,200) and (100,400)-(500,570) | Danger / alert state |
| SYS BREACH triangle icon, T&T marker | orange family | not sampled (stair-stepped icon) | Alert glyph, marker |

### 1.3 Hairlines and line work (1 px unless noted)

| Item | Value | Where and how |
|---|---|---|
| Yard zone border | peak `#DCE1DD` (220,225,221) plus a faint second pixel (65,70,66) | n=790 column x=700, rows 186-195 |
| Yard cell outline | median `#BBBDAF` of outline pixels (luma 110-235), strong colour fringe (R-B sd 23.7) | n=790 box (560,200)-(640,480) |
| Orbit panel frame | peak luma 215 on the top edge (y=249) down to 140 at the bottom; hue is fringe | n=540 edge scans |
| Menu crosshair arms | median `#E1E0D9` (luma > 150), peak (246,252,254) | n=252 box (556,60)-(652,160) |
| Login crosshair | median `#B4B4B1` (luma > 120), peak luma 247 | n=120 box (254,285)-(293,322) |
| Orbit dim rings | `#3F3C39` median, `#56544F` top quartile | n=540 grey class in box (443,248)-(980,550) |
| Table | no row separators, no cell borders seen | n=390, n=420 |

### 1.4 Illustration and effect colours

| Item | Value | Where and how |
|---|---|---|
| Orbit bright rings, path, markers | `#E6DC24` top quartile; markers `#E8E024`; thin ring median `#A1A451` | n=540 box (443,248)-(980,550), class R>120, G>150, B<100 |
| Red bodies | `#E2472B` median, `#EE5639` top quartile | same box, class R>170, G<100, B<100 |
| Image panel tones (monochrome) | luma p1,p5,p25,p50,p75,p95,p99 at n=620 / 665 / 700 = 1,2,10,17,67,230,240 / 1,1,5,12,193,238,243 / 1,1,12,69,222,240,244; darkest 10 % `#040105`, lightest 10 % `#E5E7DF` to `#EFF1E9`; mean chroma 5-7 | box (515,160)-(1020,515) |
| SYS BREACH text | `#EC100A` median, `#F0120E` top quartile | n=836 class R>200, G<60, B<60 |
| SYS BREACH band | `#2D0D00` on orange (about 85 % black); `#1F181A` top / `#231818` bottom on canvas | n=836 boxes (5,262)-(70,272), (5,335)-(70,347); n=819 same boxes |
| Glow around text | adds (+15,+22,+14) at 2 px, (+13,+16,+4) at 4 px, (+7,+10,+2) at 8 px, (+5,+7,+1) at 12 px, (+2,+4,+0.5) at 20 px; yellow-green | n=510 box (640,150)-(990,240): distance transform from luma>200 pixels, mean per integer distance minus canvas |
| Screen-door texture | vertical period 6.2 px, sd 3.3 levels | FFT of the red channel of flat orange (560,10)-(1060,140), n=150 |
| Chroma smear (4:2:0) | a 1 px neutral line changes hue along its length: the orbit frame right edge reads (72,149,202) at y=260, (145,215,165) at y=400, (207,123,40) at y=470 | n=540 column x=978. Trust luma, not hue, on lines under 3 px |

## 2. Type

Method: ink rows above a threshold at 45-50 % between the 5th and 99.5th luma percentile in the box give cap height; ink width over character count gives advance; run lengths along one row give stems. Monospace is judged by equal advance across different strings.

| Element | Sample | Cap h | Advance | Stem | Notes |
|---|---|---|---|---|---|
| Giant wordmark | n=210 box (230,255)-(850,350) | 84 | O,N,T,H 77; M 103; L 63; I 54; gaps 7-10 | 18 (0.21 cap) | proportional caps, 45 degree chamfered corners, N diagonal steps 1 px per row, smooth |
| Lockup wordmark | n=70 box (360,345)-(720,410) | 48 | O,N,T,H 44; M 58; L 36; I 30; gaps 4-5 | 10 (0.21) | same face |
| Header and menu wordmark | n=390, n=252 | 26 | 174 px for 8 letters (21.8 avg) | 5-6 (0.2) | same face |
| Screen titles | n=390, 510, 640, 770 | 20 (21-22 with underscore or ampersand) | 14.85-15.7 per char incl. spaces | not measured | near-monospaced caps; names use underscores |
| Big ID MNL-1593-14 | n=510 box (60,160)-(475,225) | 46 | digits 40 (glyph 33); M,N 42; hyphen about 31 | 7 (0.15) | proportional letters, tabular digits |
| DELIVERED | n=510 | 46 | pitch 44,36,29,29,41,36,40,35 | not measured | proportional |
| Yard title MNL YARD-01 | n=790 | 31 | letters 25-29; hyphen 21; space 49 | 4 (0.13) | near-monospaced |
| Yard numerals | n=790 | 26 | 23 for every digit pair; glyph 19-20 | not measured | tabular |
| Menu item | n=252 | 15 (14 for PROCESSING QUEUE) | 10.9-11.25 | not measured | caps |
| Login field | n=170 | 13 (+2 underscore) | 10.4 | not measured | monospaced caps; password bullets are blocks 8 px wide on the same 10.3 px grid |
| Login tab, button | n=170 | 12 | USER 9.5; LOGIN 8.8 | not measured | caps |
| Loading label, breadcrumb | n=325, n=252 | 14 | 10.33, 10.56 | not measured | caps |
| Yard map labels | n=790 | 13-14 | 9.9-10.3 | not measured | caps |
| Table body | n=390, 420 | 10-11 | 8.5-8.9 (5 strings within +-2 %) | not measured | monospaced caps and digits |
| Table header labels | n=390 | 9-10 | 7.4-7.75 | not measured | caps |
| Key/value labels and values | n=510 | 10-11 | 8.6-8.8; row pitch 28.6 | not measured | monospaced caps |
| Timeline text | n=700 | 10 | 8.75; line pitch 16 | not measured | monospaced |
| Yard micro labels | n=790 | 9 | 6.75-7.4 | not measured | caps |
| Nav button text | n=516 | 6-7 | 5.1-5.4 | not measured | caps, dark on white |
| Orange tag text | n=516 | 4-5 | 3.4-3.8 | not measured | at the legibility limit |
| SYS BREACH | n=836 | 49 | per letter 40-44; word gap adds 28 | not measured | caps, red; stair-stepped edges (visual) |
| Boot log | n=56 | 7-8 | 3.6 average; line pitch 9.2 | not measured | mixed case |
| Vertical marquee | n=130 | 25 | about 18 | not measured | caps, rotated 90 degrees |

Construction. Display faces (wordmark, titles, big ID, yard title) are smooth anti-aliased outlines with no coarse pixel unit; the wordmark is heavy (stem 0.21 cap) with chamfered corners. Body text is monospaced, all caps, advance 0.84 of cap height, tabular digits. Pixel-style parts are limited to the alert triangle (stair step about 6 px), 4-5 px tag text, decode blocks (8-40 px) and the 12x12 px dissolve squares. No font is named.

## 3. Layout

| Quantity | Value | Method |
|---|---|---|
| Table bar and selected row | bar x 35-1044 (1010 px), row x 36-1043: 35 px margin each side | n=390 extents |
| Left content edge | wordmark 68, menu 70, table text 71-72, key/value 71, counters 71-73 | n=390, 252, 510, 790 |
| Right content edge | nav 1034-1035, image panel 1034-1036, REGION dropdown 1046 | n=516, 700, 390 |
| Top and bottom | wordmark cap y 75-100 (table screens), 67-92 (menu); table footer buttons end y 539; yard buttons y 533; breadcrumb y 577 | |
| Orange panel | x 540-1079, full height (half the width) | n=150 |
| Hairline | 1 px; timeline rail 2 px; crosshair arms 1 px | section 1.3 |

Header strip (table, container log, T&T, yard): wordmark x 68-241; title x 313 with baseline y 100 shared with the wordmark; right group aligned to 1034-1046.

| Header item | Box | Method |
|---|---|---|
| VIEW / STATUS / REGION dropdowns (n=390) | (662,80)-(740,102), (810,78)-(889,101), (968,76)-(1046,99): 78x22-23 | white-box detection |
| Nav buttons TRACK, HISTORY, DOCUMENTS, RELATED (n=516) | (653,80)-(742,102), (748,79)-(838,101), (844,78)-(936,101), (941,76)-(1034,99): 89-93 x 22-23, gap 5-6 | white-box detection; tops rise 4 px to the right (screen warp) |

Table (n=390, 420):

| Quantity | Value |
|---|---|
| Column x (text left) | 71, 167, 350, 562, 761, 913 (header labels at 71, none, 350, 562, 761, 913) |
| Header bar | y 133-162, 30 px tall; top edge y 131 / 133 / 134 / 132 / 131 at x 60 / 300 / 600 / 900 / 1030 (3 px bow) |
| Row pitch | 32.1 px; first row centre y 192, row 10 centre y 481; text cap 10-11 |
| Selected row | y 246-269 (24 px) for row 3; centre sits 1 px below the text centre |
| Bar to first row, last row to footer | 44.5 px, 46 px |
| Footer | TOTAL x 69-106; count text x 168-333; PAGE x 870-902; `1 / 105` x 926-973; two 19 px square buttons x 994-1012 and 1015-1034, y 520-539 (gap 3) |

Menu (n=252): items x 70-489 (419-420 wide), tops 150, 202, 255, 307, 360, 412 (pitch 52.4), height 46-47, gap 6; text x 93 (23 px inset); arrow x 462-473 (12x14), right inset 16; header block (0,0)-(359,201); breadcrumb y 564-577: CONTAIN x 68-126, arrow 142-154, PROCESS 171-231, arrow 247-259, DELIVER 275-331. Crosshair centres (602,113), (976,110), (602,493), (973,495); arm span 87 px.

Login (n=170): form column x 636-991 (355 wide, inset 96 left, 89 right). USER tab (637,166)-(714,188) 77x22 over field (636,187)-(991,228); PASSWORD tab (636,246)-(755,270) 119x24 over field (636,270)-(991,309); NODE tab (636,328)-(714,352) 78x24 over field (636,352)-(991,392); LOGIN button (637,406)-(991,444) 354x38. Tab bottom equals field top; gaps field to next tab 18, 19; NODE field to button 14. Field text starts x 655 (19 px inset).

Container log (n=510): UNIT ID tag (70,146)-(104,158); big ID cap y 170-215 (12 below the tag), x 70-463; STATUS tag (652,148)-(683,160); DELIVERED x 650-977; UNIT MANIFEST tag (72,290)-(128,302) 56x12; key/value cap tops from y 321, pitch 28.6, 8 rows, label x 71, value x 218. Orbit panel (443,249)-(978,551) = 536x302 (16:9): sun centre (708.5,398.5), diameter 97, rings at r about 83, 116, 128, 133, 147, 165, 202 (one-row scan, n=530).

T&T (n=700): image panel (500,146)-(1034,530) about 535x385 (top edge y 145-148, bottom 528-535); UPDATES tag (70,290)-(108,302); timeline squares 11-12 px at x 72-83 (y 324, 406, 490), rail x 76-77, text x 105; group pitch 84, 80; lines 16 apart.

Yard (n=790): title x 73, cap y 160-190; counters at x 71 and 167: label y 237-245, numeral y 258-283; 312-320 / 332-357; 386-394 / 406-432 (row pitch 74-75); buttons (70,510)-(151,533), (157,510)-(217,532), (223,509)-(292,531). Map frame x 451-1007, y 188-490; cells 22x10 outer, row pitch 11, column pitch 22-24; NORTH GATE x 666-764 y 161-173, SOUTH GATE x 667-765 y 503-516, PROCESSING x 398-500 y 356-368, STORAGE A x 913-1005 y 357-369.

## 4. Timing

`f` = frames, `n a-b` = start to end frame, times in seconds at 24 fps. "Per-frame" means the box changes on every frame.

### 4.1 Scene cuts (ffmpeg scene > 0.12) as frames

| t | 3.67 | 3.83 | 3.96 | 19.38 | 24.50 | 24.67 | 26.75 | 28.75 | 30.42 | 33.83 | 34.08 | 36.08 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| n | 88 | 92 | 95 | 465 | 588 | 592 | 642 | 690 | 730 | 812 | 818 | 866 |

### 4.2 Opening (0-3.5 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Black lead-in | 0-9 (0-0.38) | 10 f | static | box diff 0 |
| Mark flashes in | 10-19 (0.42-0.79) | 10 f | 1-frame flashes at n=10, 14, 15; blank n=11-13; forms by n=19 | bbox of luma>150 in box (440,170)-(650,340). Mark: 3 bars 38 px wide, 105-106 px tall, gaps 6, chamfer 12, side bars y 199-304, middle y 217-321, x 477-602 |
| Mark rise | 16-24 (0.67-1.00) | 9 f | per-frame steps 9, 11, 7, 5, 4, 3, 2, 2 px: exponential ease-out, tau about 3 f (125 ms) | top y 288 to 245 |
| Lockup recentre | 37-52 (1.54-2.17) | 16 f | ease-out; steps 3, 4, 8, 9, 4, 2, 2, 1; peak 9 px/f at n=39-40 | mark top y 234, 230, 222, 213, 209 ... 199; a slow creep 245 to 237 precedes it (n=24-36) |
| Boot log typed | 44-49 (1.83-2.04) | 6 f | per-frame; lines visible 2, 4, 7, 11, 16, 19 (mean 76 lines/s, peak 5 lines per frame = 120 lines/s) | bright row bands in box (20,40)-(360,230) |
| Boot log out | 53-61 (2.21-2.54) | 9 f | blank on n=53, 55, 57 (12 Hz); solid 54, 56, 58-60; gone from 61 | ink 0 on those frames |
| Lockup letters settle | 38-52 (1.58-2.17) | 15 f | left to right: stable-from frame M 41, O 43, N 45, O 47, L 49, I 50, T 51, H 52 (gaps 2,2,2,2,1,1,1); unsettled letters flash on alternate frames (12 Hz). Frame f02 (2.0 s) is n=48: "MONO I H" | ink count per letter slot, x 370-709, y 350-410 |
| Spinner | 61-84 (2.54-3.50) | 24 f | 4 states (vertical bar, slash, dash, backslash), 4 f each = 6 Hz, 45 degrees per step; 36 px line | PCA angle and bbox (522,489)-(557,525) |

### 4.3 Login (3.5-8.7 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Alert X wire box | 85-87 (3.54-3.63) | 3 f | 24 Hz stair-step draw | orange px 28k, 36k, 42k |
| Alert card with "!" | 88-91 (3.67-3.79) | 4 f | hard cut at 88; card x 574-1061, y 32-577 | orange bbox |
| Hazard stripes | 92-94 (3.83-3.92) | 3 f | hard cut; band 17-19 px wide, pitch 73.3 px along x and 82.7 along y (about 48 degrees), duty 25 % | row and column run scans, n=93 |
| Solid panel | 95 (3.96) | 1 f | hard cut to x 540-1079 | |
| Vertical marquee | 86-196 (3.58-8.17) | 111 f | blank on odd frames 87, 89, 91, then continuous; scrolls up 7.12 px/f = 171 px/s, constant | sub-pixel MSE shift of band x 5-50: mean 7.114, sd 0.013 over 93 f; 12 f baselines 7.12-7.14 |
| Login crosshair | 90-195 (3.75-8.12) | | jitters n=90-97, then static 39x38 px at (273,303) | bbox in (230,260)-(320,350) |
| Rotated wordmark strip grows | 105-116 (4.38-4.83) | 12 f | left edge x 539, 526, 513, 508, 505, 503, 501, 500, 499, 498, 497: ease-out (outExpo D=16.4 f rmse 0.9; outQuart D=11.7 rmse 1.5); static afterwards | column extent of luma>150 in (440,0)-(560,608) |
| Form wipe | 97-113 (4.04-4.71) | 17 f | each element wipes left to right; USER field right edge 645, 679, 893, 945, 968, 980, 987, 990 at n=97, 99, 101-106: inOutExpo D=12.0 f (501 ms) rmse 0.8 px. First seen n: USER field 97, tab 99, PASSWORD field 103, tab 105, NODE field 106, tab 108, LOGIN 113. Blank on n=98, 100 | run extents along rows y=175, 215, 258, 298, 340, 380, 425 |
| Typing USER (11 chars) | 120-133 (5.00-5.54) | 14 f | char every 1-2 f (diffs 2,1,1,1,1,1,1,1,2,2): 18.5 chars/s | right edge of ink per frame, advance 10.3 |
| Typing PASSWORD (14 bullets) | 134-151 (5.58-6.29) | 18 f | diffs 1,1,2,1,1,2,2,1,1,1,1,2,1: 18.4 chars/s | same |
| Typing NODE (11 chars) | 156-173 (6.50-7.21) | 18 f | diffs 1,2,1,2,1,2,1,2,1,4: 14.1 chars/s | same |
| Caret | 117-186 (4.88-7.75) | | solid while typing, no blink; USER caret stays 6 f after the last char, off at n=140. NODE caret on from n=151, off n=180-185 (6 f), on n=186: one blink cycle about 13 f (0.54 s, 1.8 Hz). C | thin ink at the field end |
| Panel exit | 184-203 (7.67-8.46) | 20 f | per-frame; left edge x 540, 546, 552, 560, 568, 580, 596, 616, 645, 692, 816, 940, 990, 1020, 1042, 1058, 1070 (n=187-203); inOutExpo free fit D=24.2-25.8 f (1.0-1.07 s), t0=184.1-184.8, rmse 2.2 px; peak 124 px/f | column where more than 50 % of pixels are orange |
| Big wordmark type-on | 192-209 (8.00-8.71) | 18 f | n=194 "MO", 196 "MON", 198 "MONO", 200 "MONOL"; stable-from frame M 198, O 200, N 202, O 204, L 206, I 207, T 208, H 209 (same 2,2,2,2,1,1,1 pattern as the lockup); unsettled letters flash at 12 Hz | slot ink counts, x 241-839 |
| Shrink to header | 209-222 (8.71-9.25) | 14 f | per-frame; width 599, 599, 595, 587, 573, 553, 513, 383, 253, 214, 193, 180, 172, 168: inOutExpo D=13.9 f (580 ms) t0=209.0 rmse 0.85 px | bbox of luma>150 in (120,40)-(1040,560) |
| Hold centred | 222-230 (9.25-9.58) | 9 f | static at x 456-623, y 71-94 | same bbox |
| Slide to top-left | 229-242 (9.54-10.08) | 14 f | left edge 456, 450, 441, 429, 409, 375, 265, 153, 118, 97, 84, 75, 68 (n=230-242): inOutExpo D=15.5 f (646 ms) t0=228.25; sse 0.00037 vs 0.0028 for inOutQuart. Size 168x24 grows to 173x26 at n=237-240 | bbox of luma>150 in (0,55)-(1080,120) |

### 4.4 Menu (8.9-12.7 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Items enter, top to bottom | first visible n=222, 224, 226, 228, 230, 232 | 8-9 f each | stagger 2 f (83 ms); each slides in from the left screen edge to x 70-489. Item 1 right edge n=222-229: 73, 227, 377, 424, 451, 469, 480, 489. inOutExpo D=15.6 f (651 ms) t0=215.2 rmse 1.5 px (outExpo rmse 5.7, outQuint 7.7); only the tail is visible | x extent of the row where luma is 42-75 at y = 152, 205, 258, 310, 363, 415 |
| Background blocks | 224-291 (9.33-12.1) | | hard cuts on a 3x3 grid (cells 360x202.7, blocks may span cells); layout changes at n=224, 226, 228, 231, 234, 240, 246, 252, 258, 264, 276, 282, 288: every 6 f (4 Hz) from n=234 | luma in 9 sample squares |
| Breadcrumb | n=229-230 (9.56) | | absent n=228, present n=230. visual | C |
| Crosshair quarter turns | entry TL n=241-254, BL 242-255, TR 244-257, BR from 226 | 14 f visible | rotates 90 degrees (plus, X at mid, plus), per-frame; TL angles n=242-254: 88, 87, 84, 81, 76, 68, 43, 20, 12, 8, 5, 2, 0. inOutExpo D=18.3 f (764 ms) t0=238.8 rmse 0.7 degrees. Exit spins start about n=268 (BR), 273 (TR), 276 (BL), 279 (TL), same 18.3 f | histogram of arm direction mod 90 in four 100x100 boxes |
| Selection scan | 252-272 (10.50-11.33) | 5 steps | hard step every 4 f (167 ms, 6 Hz): items 6, 5, 4, 3, 2, 1 at n=252, 256, 260, 264, 268, 272; no tween; item 1 stays until exit | orange fraction in 6 row boxes |
| Exit, top to bottom | item starts n=288, 290, 291, 292, 293, 295; last item gone n=305 (12.71) | 10 f per item | stagger 1.4 f average (entry is 2 f). Item 1 left edge n=287-297: 69, 86, 107, 136, 174, 230, 324, 593, 864, 959, 1016; inOutExpo (free end x 1117) D=19.2 f (802 ms) rmse 4.5 px; peak 270 px/f | row x extents |

### 4.5 Loading (12.6-14.1 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Label flash | 302, 304 | | label visible only on n=302 and 304 (blank 303, 305, 306) | |
| Bar appears | 307 (12.79) | | 29 dim segments, 0 lit; label cap y 249-262 | |
| Bar fill | 308-336 (12.83-14.00) | 29 f (1.208 s) | 1 segment per frame = 24 segments/s, linear, no easing. Segment 11.5x47 px, pitch 17.5, x 287-790, y 285-331; unlit luma 85, lit `#EFF1EB` | luma > 180 at 29 centres cx = 292.5 + 17.5 i |
| Bar finish | 336-339 (14.00-14.13) | | full n=336-337, blank 338, full 339, then table | |
| Ghost wordmark rise | 316-339 (13.17-14.13) | 24 f | top y 601 to 523, steps 4 px early, 2 px late: outSine D=38.6 f rmse 0.86 (linear rmse 1.65) | row bands of luma 28-120 with more than 300 px per row, rows 380-607 |

### 4.6 Table (13.9-19.4 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Header build | 334-356 (13.92-14.83) | 23 f | wordmark n=334 (final place), title and dropdowns 336, grey bar 338, footer text 343, ID 344, buttons 346, CONTENTS 347, DESTINATION 350, STATUS 353, PRIORITY 356 (3 f stagger) | first frame with ink above threshold per box |
| Title decode | 336-341 (14.00-14.21) | 6 f | blocks n=336-337, garbled glyphs n=338-340 (3 f hold), clean n=341 | frame strips |
| Row population | 363-383 (15.13-15.96) | 21 f | row first-full-ink n=363, 366, 368, 370, 372, 374, 376, 378, 380, 383: 2 f per row (12 Hz), top to bottom; the 6 cells of a row decode together: blocks n=363-364, garble n=365-367 (3 f hold), clean n=368 | ink per row, 6 column boxes |
| Footer count | 365-416 (15.21-17.33) | 52 f (2.08 s) | updated every frame; inOutSine D=49.9 f t0=366.0 rmse 2.5 of 1159 (linear 17.5, inOutQuad 8.5, outSine 10.4, outCubic 33); peak 36 counts/f at n=391. n=384-416 step 2: 333, 401, 471, 543, 616, 688, 758, 826, 890, 950, 1004, 1052, 1092, 1124, 1146, 1158, 1159 | digit reads and box diff (non-zero on 95 % of frames) |
| Selected row jumps | 388-458 (16.17-19.08) | | hard cuts: row 3 at n=388, row 7 at 403, row 1 at 415, row 4 at 439 (holds 15, 12, 24 f); one blank frame after each jump (389, 404, 416, 440); flicker off at 453, 455, 457 | orange rows in x 100-1000 |
| Exit | 465-467 (19.38-19.46) | | blank n=465, table back n=466, gone n=467 (whole body in one frame) | ink 0 at 465 |

### 4.7 Container log (19.5-24.5 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Header decode | 467-476 (19.46-19.83) | 10 f | blocks n=467-469 (change every frame), garbled glyphs n=470-472 (3 f hold), title clean n=473, nav garbled 473-475, nav clean 476; all glyphs at once, no sweep (visual) | title ink 733, 605, 1040, 1415, 1414, 1473, 1860; strips |
| Content pop-ins | 472-487 (19.67-20.29) | | UNIT ID tag 472 (stable 474), big ID 476 (blank 477, stable 478), STATUS tag 478, DELIVERED 480 (blank 481), UNIT MANIFEST tag 482; key/value rows 1-8 first ink n=476, 478, 479, 481, 482, 484, 485, 487 (1.5 f per row) | ink per box |
| Orbit assembly | 481-488 (20.04-20.33) | 8 f | mosaic resolve: edge run on the sun about 8-9 px (n=481), 4 (482-483), 2-4 (484), 2 (485-487), 1-2 (488); rings are dotted n=482-485, continuous n=486 | run lengths of the sun edge |
| Transfer path draw | about 497-530 | about 1.4 s | yellow path grows from the left marker along the bottom to the right planet. visual; pixel proxy was unreliable | C |
| Orbit motion | 490-587 | | 4 red bodies at 0.19 deg/frame = 4.5 deg/s clockwise (period 79 s), radii 79, 122, 152, 157 px about (708.5,398.5) | linear fit of unwrapped angle, n=490-574: 0.190, 0.190, 0.186, 0.189 deg/f; radius sd 0.4-0.5 px |

### 4.8 Track and trace (24.5-30.4 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Cut in | 588-598 (24.50-24.92) | 11 f | blank n=588, 590, 591; n=589 old screen; n=592 mosaic (blocks over 30 px); resolves 593-598 (image ink 57k, 46k, 49k, 52k, 54k, 54k, 55k). Big ID n=592-593, title and nav 593, squares 594-598, rail 602; text clean n=603-608 | ink per box |
| Shot cuts | 642, 690 (26.75, 28.75) | | hard cuts; shots 2.0 s (n=642-689) and 1.67 s (n=690-729) | scene cuts |
| Image update rate | 602-729 | | content changes about 9.8 Hz: peaks every 2 or 3 frames alternately (n=651, 654, 656, 659, 661, 663, 666, 668, 671, 673), 2.4 f average; between peaks only grain (diff 1.0-1.6) | mean abs diff in (500,146)-(1034,530) |
| Drift in shot | | | shot 1 n=612-640: scale x +1.4 %, y +4.0 %, rotation -2.2 deg, shift (-5.6,+8.2) px. Shot 2 n=646-686: x +3.4 %, y -4.4 %, +0.7 deg, +23 px in x, decelerating. Shot 3 n=693-729: y -2.7 %, +3.3 deg, (-7.1,+7.6) px, constant speed. About 5-14 px/s and 0.4-2.2 deg/s. Conf B (low) | ECC affine on the blurred panel, chained every 4 f |

### 4.9 Yard (30.4-33.8 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Cut in | 730-734 (30.42-30.58) | | blank n=730, on 731, blank 732-733 (header wordmark stays), mosaic n=734 | frame sheet |
| Mosaic resolve | 734-748 (30.58-31.17) | 15 f | mean bright run in the counter column: 40.8, 15.4, 10.7, 8.1, 7.6, 5.9, 5.8, 5.4, 5.1, 5.1, 5.05, 5.0 px (n=734-745): halves in about 1.5 f, settled by n=742 | box (60,150)-(360,440) |
| TOTAL roll-up | 735-780 (30.63-32.50) | 45 f | per-frame; 140 (n=737), 281, 361, 450, 546, 650, 761, 879, 1002 (746), 1833 (752), 2436 (756), 3039 (760), 3609 (764), 4111 (768), 4511 (772), 4776 (776), 4872 (780); speed rises to 151/f at n=752-760, then 24/f at 776-780; not a clean sine (rmse 11 of 4872) | digit reads from frames |
| INBOUND, OUTBOUND, PROCESSING, ON HOLD | 752-803 (31.33-33.46) | 51 f (2.1 s) | one shared tween, inOutSine D=50.9 f t0=752.07, rmse 0.68, 0.75, 0.35, 0.17 counts; finals 312, 298, 113, 17; at n=776 they read 142, 135, 58, 3 | digit reads |
| Map cells | 734-775 | | about 267 cells white by n=748, held n=748-761 (white px 47-52k), drained n=762-775 at 10-28 cells/f in random order (px -3k to -5.8k per frame) to outlines; static n=776-811 (white px 8k, 7.2k after n=804) | white px (luma > 200) in (450,190)-(1010,500); 267 components at n=752 |

### 4.10 SYS BREACH and end (33.8-36.6 s)

| Effect | n (t) | Dur | Rate / easing | Evidence |
|---|---|---|---|---|
| Cut in | 812-817 (33.83-34.04) | 6 f | blank n=812, grey bar with one white block 813, glitch mosaic and red blocks 814-817, partial strip text 816-817 | frame sheet |
| Orange flash | 818-822 (34.08-34.25) | 5 f | orange 818, off 819, on 820, off 821, on 822 and stays: 12 Hz, 4 changes; orange fraction 0.85 vs 0.005 | orange fraction per frame |
| Marquee | 817-865 | 49 f | 12.5 px/f leftward = 300 px/s, constant; repeat 596 px (1.99 s); band y 257-352 (95 px) | column-sum profile of rows 268-340; 12 f baselines -150.1, -149.7, -149.9, -150.0, -150.3; autocorr peak 595 |
| Dissolve | 859-865 (35.79-36.04) | 7 f | black 12x12 px squares at random: coverage 1.7, 3.2, 5.2, 7.9, 10.2, 12.3, 15.4 % (+2.2 % per frame); squares group into bars of 2-4; components 39 to 201 | luma max < 60 in rows 0-249 |
| Black | 866-878 (36.08-36.58) | 13 f | `#000000` | |

### 4.11 Step and flicker catalogue

| Effect | Rate |
|---|---|
| Per-frame eased motion (slides, spins, counters, marquees, orbit) | 24 Hz |
| Typing | 12-24 Hz (1-2 f per char) |
| Table rows, key/value rows, menu stagger | 12 Hz (2 f), 1.5 f, 2 f |
| Selection scan, spinner | 6 Hz (4 f) |
| Background blocks | 4 Hz (6 f) |
| T&T image content | 9.8 Hz (2 and 3 f alternating) |
| Letter strobe, boot log off frames, selected-row pre-exit flicker, orange flash | 12 Hz |
| Caret | 1.8 Hz (one cycle seen) |
| One-frame blanks | n=53, 55, 57, 87, 89, 91, 98, 100, 389, 404, 416, 440, 465, 477, 481, 588, 590, 591, 730, 732, 733, 812, 819, 821 |
| Garble hold | 3 f in three places (rows n=365-367, title and nav n=470-472) |

## 5. Not measured or low confidence

| Item | Why |
|---|---|
| Typeface identity, stems of most faces | not attempted; stems measured only for wordmark, big ID, yard title |
| SYS BREACH glyph grid, triangle icon colour | visual only; the icon is 2 px of stair steps with chroma smear |
| Caret period | one cycle visible before the form leaves; +-1 frame |
| Orbit path draw speed | the yellow-pixel proxy rises then falls; unreliable |
| Image pan and zoom easing | content updates at 9.8 Hz and only net drift per shot was fitted; anisotropic scale suggests perspective; low confidence |
| Menu and login exit fits | free end value, 10-20 samples, rmse 2-5 px |
| Decode direction and glyph substitution | visual from strips; looks simultaneous, not directional |
| Per-cell yard fill order | random; not tracked per cell |
| Hover, focus, pressed states, dropdown open state, pointer | none shown in the reel (the only cursor is the spinner) |
| Lens and perspective warp | edges bow up to 3 px and tilt 0.6-0.8 degrees (header bar bow, nav tops rising 4 px to the right, image panel 385 px tall on the right vs 380 on the left); treat all positions as +-3 px |
| Audio | AAC track present; RMS onsets near n=26, 47, 64, 80, 134, 150, 166, 198, 220, 236, 252, 263, 306, 322, 371, 409, 436, 495, 543, 565, 581, 608; n=134, 198, 252, 306 coincide with the password start, big wordmark type-on, selection scan and loading bar within 1-2 frames; no further analysis |

## 6. Re-run recipe

```python
import numpy as np
V = np.memmap('all709.rgb', np.uint8, 'r', shape=(879, 608, 1080, 3))   # ffmpeg command in section 0
luma = lambda a: a.astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
def patch(n, b):                      # colour: median RGB of box (x0,y0,x1,y1)
    return np.median(V[n, b[1]:b[3], b[0]:b[2]].reshape(-1, 3), axis=0)
def diff(n, b, thr=30):               # timing: changed pixels versus the previous frame
    x0, y0, x1, y1 = b
    d = np.abs(V[n, y0:y1, x0:x1].astype(int) - V[n-1, y0:y1, x0:x1].astype(int))
    return int((d.max(axis=2) > thr).sum())
def runs(m, gap=1):                   # contiguous index runs of a boolean vector
    i = np.flatnonzero(m); out = []
    if len(i) == 0: return out
    s = p = i[0]
    for k in i[1:]:
        if k - p > gap: out.append((s, p)); s = k
        p = k
    return out + [(s, p)]
def ink_bbox(n, b, thr=150):          # text: bounding rows and columns of bright pixels
    x0, y0, x1, y1 = b; m = luma(V[n, y0:y1, x0:x1]) > thr
    ys, xs = np.nonzero(m); return xs.min()+x0, ys.min()+y0, xs.max()+x0, ys.max()+y0
# easing: fit v0+(v1-v0)*bezier((n-t0)/D) with scipy.optimize.least_squares over (D, t0),
# bezier via np.interp on a 4001-point table of cubic-bezier(x1,y1,x2,y2).
```

Decode command for `all709.rgb`: `ffmpeg -i in/VID_danneuenhaus_20261106_170942_da3.mp4 -vf scale=in_range=tv:in_color_matrix=bt709:out_range=pc -f rawvideo -pix_fmt rgb24 all709.rgb` (1.73 GB; scratch under the gitignored temp folder).
