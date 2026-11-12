import { createContext } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';

/** `quiet` runs motion rules 1 to 5; `expressive` adds rules 6 to 10 (BRIEF, Motion). */
export type MotionTier = 'quiet' | 'expressive';

const [getTier, setTier, hasTier] = createContext<() => MotionTier>();

/**
 * Sets the motion tier for this component and its descendants. Call during
 * component initialisation. Pass a getter so the tier can change.
 * `<Motion tier="…">` wraps this for markup.
 */
export function setMotionTier(tier: () => MotionTier): void {
	setTier(tier);
}

export interface MotionState {
	/** The tier set by the nearest `<Motion>`, or `quiet`. */
	readonly tier: MotionTier;
	/** The user asked the system for reduced motion. */
	readonly reduced: boolean;
	/** Expressive effects may run: the tier is expressive and motion is not reduced. */
	readonly expressive: boolean;
}

/** Reads the motion state. Call during component initialisation; read the fields later, reactively. */
export function useMotion(): MotionState {
	const tier = hasTier() ? getTier() : () => 'quiet' as const;
	return {
		get tier() {
			return tier();
		},
		get reduced() {
			return prefersReducedMotion.current;
		},
		get expressive() {
			return tier() === 'expressive' && !prefersReducedMotion.current;
		}
	};
}
