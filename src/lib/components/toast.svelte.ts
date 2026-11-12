import { untrack } from 'svelte';

/** The one button a toast may carry. Running it dismisses the toast. */
export type ToastAction = {
	/** A short verb such as "Undo", set in caps. */
	label: string;
	/** Runs after the toast is dismissed. */
	onclick: () => void;
};

export type ToastOptions = {
	/**
	 * A button after the message. It is a shortcut: the app offers the same
	 * step somewhere that does not go away.
	 */
	action?: ToastAction;
	/** Milliseconds on screen, pauses not counted: 4000, or 8000 with an action. */
	duration?: number;
};

export type ToastHandle = {
	/** Removes this toast now, if it is still the one on screen. */
	dismiss: () => void;
};

/** The toast on screen. */
export type ShownToast = {
	readonly id: number;
	readonly message: string;
	readonly action?: ToastAction;
};

/** Why the timer waits: a pointer over the toast, focus inside it, a hidden page. */
export type ToastHold = 'pointer' | 'focus' | 'hidden';

const TOAST_MS = 4000;
const TOAST_ACTION_MS = 8000;
// setTimeout fires at once when the delay does not fit in 32 bits.
const MAX_DELAY = 2 ** 31 - 1;

/**
 * The one toast slot, in module scope, so `toast()` works from any code
 * without a context and in apps without SvelteKit. It owns the timer; the
 * Toaster that renders the slot reports what holds it.
 */
class ToastSlot {
	current = $state.raw<ShownToast | null>(null);
	#toasters = $state.raw<readonly object[]>([]);
	#holds = new Set<ToastHold>();
	#timer: ReturnType<typeof setTimeout> | undefined;
	#remaining = 0;
	#since = 0;
	#lastId = 0;

	/** Shows a toast in place of the one on screen and starts its timer again. */
	show(message: string, { action, duration }: ToastOptions): ToastHandle {
		const id = ++this.#lastId;
		this.#stop();
		this.current = { id, message, action };
		this.#remaining = Math.min(duration ?? (action ? TOAST_ACTION_MS : TOAST_MS), MAX_DELAY);
		this.#run();
		return { dismiss: () => this.dismiss(id) };
	}

	/** Removes the toast on screen, or only toast `id` when given. */
	dismiss(id?: number) {
		const shown = untrack(() => this.current);
		if (!shown || (id !== undefined && shown.id !== id)) return;
		this.#stop();
		this.current = null;
	}

	/** Pauses the timer for `reason`; it keeps the time left. */
	hold(reason: ToastHold) {
		if (this.#holds.has(reason)) return;
		this.#holds.add(reason);
		if (this.#timer === undefined) return;
		this.#remaining -= performance.now() - this.#since;
		this.#stop();
	}

	/** Ends a pause; with none left, the timer runs out the time left. */
	release(reason: ToastHold) {
		if (this.#holds.delete(reason)) this.#run();
	}

	/** Adds a mounted Toaster and returns its removal. The first one added renders the slot. */
	register(toaster: object): () => void {
		this.#toasters = [...untrack(() => this.#toasters), toaster];
		return () => {
			this.#toasters = this.#toasters.filter((t) => t !== toaster);
		};
	}

	/** Whether `toaster` renders the slot. */
	renders(toaster: object): boolean {
		return this.#toasters[0] === toaster;
	}

	#run() {
		if (this.#timer !== undefined || this.#holds.size > 0 || !untrack(() => this.current)) return;
		this.#since = performance.now();
		this.#timer = setTimeout(() => {
			this.#timer = undefined;
			this.current = null;
		}, Math.max(0, this.#remaining));
	}

	#stop() {
		clearTimeout(this.#timer);
		this.#timer = undefined;
	}
}

export const toastSlot = new ToastSlot();

/**
 * Confirms what just happened in a toast at the bottom of the screen. A new
 * toast replaces the one on screen. Plain text only; errors stay inline,
 * next to where things broke. Needs a `<Toaster />` mounted once in the app.
 */
export function toast(message: string, options: ToastOptions = {}): ToastHandle {
	return toastSlot.show(message, options);
}
