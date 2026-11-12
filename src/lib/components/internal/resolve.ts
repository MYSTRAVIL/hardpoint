// Image resolve (BRIEF, motion rule 10; da3-57, da3-59), for MediaImage in
// the expressive tier. Internal: the package does not export it.
//
// An image that arrives after its skeleton showed appears as a mosaic of
// square blocks, each about the average colour of the part of the image it
// covers, and sharpens in discrete steps to the image itself:
//
//   step 1  blocks of about 32 CSS px     step 4  about 4 CSS px
//   step 2  about 16                      step 5  about 2
//   step 3  about 8                       then    the image
//
// Each step lasts `--resolve-step` (42ms, one reel frame at 24 fps; the
// caller reads it from the element when the resolve starts), counted from
// the first frame on screen, so the image shows five steps (210ms) after
// the mosaic first did, inside the rule's 300ms. The reel's photo goes from
// blocks of about 36px to crisp in 7 frames (da3-57), and its mosaics settle
// in about 8 frames, halving about every 1.5 (measurements §4.7 to §4.9);
// this halves every step, a shorter form of the same ramp.
//
// Crisp squares: the canvas bitmap has exactly the device pixels its box
// covers on screen (a ResizeObserver on `device-pixel-content-box`, where
// the browser has it), and every block is a whole number of device pixels:
// `round(2 × devicePixelRatio)` for the finest step, doubled for each
// coarser one, on a grid from the top left corner. So each block splits
// into four of the next step and every edge lands on a device pixel. The
// box rarely holds a whole number of blocks: the last column and row cover
// what is left, and when that is less than half a block, the column or row
// beside it widens over it, so no thin strip lines the right or bottom
// edge. Blocks are drawn by scaling a canvas of one pixel per block with
// smoothing off, by a whole factor except along those edges, and the
// canvas element has `image-rendering: pixelated`, so where the browser
// cannot report device pixels the blocks may differ by a pixel but never
// blur.
//
// No pixel is ever read back. The image is drawn once, whole, into a copy
// of about two pixels per finest block, with high-quality smoothing; that
// draw decodes it. The finest step takes each block's part of the copy down
// to one pixel, and each coarser step is the step before it drawn at half
// size with bilinear smoothing, which makes each block the mean of the four
// under it. Taking the parts from the copy, not from the image, matters:
// in Chrome, four draws of fractional parts of a 1200 x 800 JPEG cost two
// decodes (measured 2026-11-11). So the work is one decode and a few draws
// of small canvases (178 x 119 pixels for the finest step of a 356 x 237
// CSS px box at a ratio of 3), and an image from another origin served
// without CORS headers resolves like any other: drawing it only taints the
// canvases, which stay on screen and are never read.
//
//   const stop = resolveImage(canvas, image, step, done);
//
// The image is drawn as `object-fit: cover` draws it. The caller keeps the
// real <img> (with its alt) in the document under the aria-hidden canvas,
// and removes the canvas when `done` runs. The mosaic is computed and its
// first step drawn before the canvas is first painted, in the
// ResizeObserver callback.

/** Steps from the coarsest blocks to the finest, before the image itself. */
const STEPS = 5;
/** The finest blocks, in CSS px; each coarser step doubles them. */
const FINEST = 2;

interface Step {
	/** The block size in device pixels. */
	block: number;
	/**
	 * One pixel per block of the grid, in the blocks' colours. The last
	 * column and row stand for what is left of the box.
	 */
	cells: HTMLCanvasElement;
	/** The columns and rows drawn: the grid's, less a last one that the one beside it widens over. */
	cols: number;
	rows: number;
	/** The width of the last column and the height of the last row drawn, in device pixels. */
	lastWidth: number;
	lastHeight: number;
}

/**
 * Shows `image` on `canvas` as a mosaic that sharpens one step per `step`
 * ms, then calls `done`. The canvas carries `data-step` (1 to 5) and
 * `data-block` (the block size in device pixels) for the step on screen.
 * When the box is empty or the image has no size, `done` runs at once.
 * Returns a stop function.
 */
export function resolveImage(
	canvas: HTMLCanvasElement,
	image: HTMLImageElement,
	step: number,
	done: () => void
): () => void {
	let stop: (() => void) | undefined;
	// The first report comes after layout and before the canvas is first
	// painted. Later size changes keep the bitmap, scaled. The device-pixel
	// size counts only when it agrees with the CSS size times the ratio
	// (Chromium's device emulation reports it unscaled).
	const observer = new ResizeObserver(([entry]) => {
		observer.disconnect();
		const ratio = devicePixelRatio;
		const css = entry.contentRect;
		const near = (device: number | undefined, size: number) =>
			device !== undefined && Math.abs(device - size * ratio) <= 1 ? device : Math.round(size * ratio);
		const device = entry.devicePixelContentBoxSize?.[0];
		const width = near(device?.inlineSize, css.width);
		const height = near(device?.blockSize, css.height);
		const steps = mosaic(image, width, height, ratio);
		if (!steps) {
			stop = () => {};
			return done();
		}
		stop = play(canvas, width, height, steps, step, done);
	});
	try {
		observer.observe(canvas, { box: 'device-pixel-content-box' });
	} catch {
		observer.observe(canvas);
	}
	return () => {
		observer.disconnect();
		stop?.();
	};
}

/** A canvas of `width` x `height` pixels and its context, smoothing at `quality`. */
function surface(width: number, height: number, quality: ImageSmoothingQuality) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = quality;
	return { canvas, ctx };
}

/**
 * The grid's whole blocks and its last block along one axis, as
 * `[first cell, cells, device px from, device px across]`: `count` cells of
 * `block` px over `size` px, the last one covering what is left.
 */
function spans(count: number, block: number, size: number): [number, number, number, number][] {
	const whole = (count - 1) * block;
	const last: [number, number, number, number] = [count - 1, 1, whole, size - whole];
	return count > 1 ? [[0, count - 1, 0, whole], last] : [last];
}

/**
 * Halving `count` cells along one axis, as `[from, cells, to, cells]`:
 * pairs draw at half size into one cell each, and an odd last cell is
 * copied as it is.
 */
function halves(count: number): [number, number, number, number][] {
	const paired = count - (count % 2);
	const out: [number, number, number, number][] = [];
	if (paired) out.push([0, paired, 0, paired / 2]);
	if (count % 2) out.push([count - 1, 1, paired / 2, 1]);
	return out;
}

/** The mosaic steps of `image` over a `width` x `height` device pixel box, coarsest first. */
function mosaic(image: HTMLImageElement, width: number, height: number, ratio: number): Step[] | null {
	const iw = image.naturalWidth;
	const ih = image.naturalHeight;
	if (width < 1 || height < 1 || iw < 1 || ih < 1) return null;

	// The image as `object-fit: cover` draws it: `scale` device pixels per
	// image pixel, centred.
	const scale = Math.max(width / iw, height / ih);
	const left = (iw - width / scale) / 2;
	const top = (ih - height / scale) / 2;

	// The image drawn once, whole, at about two pixels per finest block (at
	// most its own size): the one draw that decodes it.
	let block = Math.max(1, Math.round(FINEST * ratio));
	const shrink = Math.min(1, (2 * scale) / block);
	const copy = surface(Math.max(1, Math.round(iw * shrink)), Math.max(1, Math.round(ih * shrink)), 'high');
	if (!copy) return null;
	copy.ctx.drawImage(image, 0, 0, copy.canvas.width, copy.canvas.height);
	const kx = copy.canvas.width / iw;
	const ky = copy.canvas.height / ih;

	// The finest step: each block's part of the copy drawn down to one pixel.
	let cols = Math.ceil(width / block);
	let rows = Math.ceil(height / block);
	let cells = surface(cols, rows, 'low');
	if (!cells) return null;
	for (const [dx, dw, sx, sw] of spans(cols, block, width)) {
		for (const [dy, dh, sy, sh] of spans(rows, block, height)) {
			const x = (left + sx / scale) * kx;
			const y = (top + sy / scale) * ky;
			cells.ctx.drawImage(copy.canvas, x, y, (sw / scale) * kx, (sh / scale) * ky, dx, dy, dw, dh);
		}
	}

	const steps: Step[] = [];
	for (let k = 0; ; k++) {
		const restX = width - (cols - 1) * block;
		const restY = height - (rows - 1) * block;
		const joinX = cols > 1 && restX < block / 2;
		const joinY = rows > 1 && restY < block / 2;
		steps.unshift({
			block,
			cells: cells.canvas,
			cols: joinX ? cols - 1 : cols,
			rows: joinY ? rows - 1 : rows,
			lastWidth: joinX ? block + restX : restX,
			lastHeight: joinY ? block + restY : restY
		});
		if (k === STEPS - 1) return steps;
		// Four blocks make one of the next step: half size, bilinear, so each
		// new pixel is the mean of the four under it.
		const next = surface(Math.ceil(cols / 2), Math.ceil(rows / 2), 'low');
		if (!next) return null;
		for (const [sx, sw, dx, dw] of halves(cols)) {
			for (const [sy, sh, dy, dh] of halves(rows)) {
				next.ctx.drawImage(cells.canvas, sx, sy, sw, sh, dx, dy, dw, dh);
			}
		}
		cells = next;
		cols = next.canvas.width;
		rows = next.canvas.height;
		block *= 2;
	}
}

/** Draws the first step now and one more per `step` ms after it, then calls `done`. */
function play(
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	steps: Step[],
	step: number,
	done: () => void
): () => void {
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		done();
		return () => {};
	}
	ctx.imageSmoothingEnabled = false;
	let shown = 0;
	const show = (n: number) => {
		const { block, cells, cols, rows, lastWidth, lastHeight } = steps[n];
		// Whole blocks at a whole scale, then the last column, the last row
		// and the corner, stretched to the edges. Cleared first, so an image
		// with transparent parts never stacks two steps.
		const c = cols - 1;
		const r = rows - 1;
		const x = c * block;
		const y = r * block;
		ctx.clearRect(0, 0, width, height);
		if (c && r) ctx.drawImage(cells, 0, 0, c, r, 0, 0, x, y);
		if (r) ctx.drawImage(cells, c, 0, 1, r, x, 0, lastWidth, y);
		if (c) ctx.drawImage(cells, 0, r, c, 1, 0, y, x, lastHeight);
		ctx.drawImage(cells, c, r, 1, 1, x, y, lastWidth, lastHeight);
		canvas.dataset.step = String(n + 1);
		canvas.dataset.block = String(block);
		shown = n;
	};
	show(0);

	// The first step is painted with this frame, once the work above is
	// done, so its time starts now.
	const start = performance.now();
	let raf = 0;
	const tick = (now: number) => {
		const n = Math.floor((now - start) / step);
		if (n >= steps.length) return done();
		if (n > shown) show(n);
		raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);
	return () => cancelAnimationFrame(raf);
}
