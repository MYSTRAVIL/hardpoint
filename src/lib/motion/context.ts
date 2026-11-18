import { createContext } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';

/** `quiet` runs motion rules 1 to 5; `expressive` adds rules 6 to 10 (BRIEF, Motion). */
export type MotionTier = 'quiet' | 'expressive';

const [getTier, setTier, hasTier] = createContext<() => MotionTier>();
const [getPaused, setPaused, hasPaused] = createContext<() => boolean>();

/**
 * Sets the motion tier for this component and its descendants. Call during
 * component initialisation. Pass a getter so the tier can change.
 * `<Motion tier="…">` wraps this for markup.
 */
export function setMotionTier(tier: () => MotionTier): void {
	setTier(tier);
}

/**
 * Pauses ongoing motion (the pulse of a live Status) for this component and
 * its descendants. Call during component initialisation. Pass a getter so the
 * state can change. `<Motion paused>` wraps this for markup.
 */
export function setMotionPaused(paused: () => boolean): void {
	setPaused(paused);
}

export interface MotionState {
	/** The tier set by the nearest `<Motion>`, or `quiet`. */
	readonly tier: MotionTier;
	/** The user asked the system for reduced motion. */
	readonly reduced: boolean;
	/**
	 * The app paused ongoing motion with `<Motion paused>`. Motion that runs
	 * longer than 5 s beside other content (a live Status's pulse) holds still
	 * while this is true (WCAG 2.2.2). A transition that answers an action
	 * ignores it.
	 */
	readonly paused: boolean;
	/** Expressive effects may run: the tier is expressive and motion is not reduced. */
	readonly expressive: boolean;
}

/** Reads the motion state. Call during component initialisation; read the fields later, reactively. */
export function useMotion(): MotionState {
	const tier = hasTier() ? getTier() : () => 'quiet' as const;
	const paused = hasPaused() ? getPaused() : () => false;
	return {
		get tier() {
			return tier();
		},
		get reduced() {
			return prefersReducedMotion.current;
		},
		get paused() {
			return paused();
		},
		get expressive() {
			return tier() === 'expressive' && !prefersReducedMotion.current;
		}
	};
}
