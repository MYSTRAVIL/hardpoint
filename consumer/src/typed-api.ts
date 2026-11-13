// Type-level checks on the shipped declarations. svelte-check compiles this
// file, so it fails when an accessible name stops being required or when a
// primary Button accepts a tone. Nothing here runs.
import type { ButtonProps, MeterProps, ProgressProps } from '@mystravil/hardpoint';

// @ts-expect-error an icon button needs an accessible name
export const iconWithoutName: ButtonProps = { icon: true };
// @ts-expect-error a primary button takes no tone
export const primaryTone: ButtonProps = { variant: 'primary', tone: 'danger' };
// @ts-expect-error a progress bar needs an accessible name
export const progressWithoutName: ProgressProps = { value: 1 };
// @ts-expect-error a meter needs an accessible name
export const meterWithoutName: MeterProps = { value: 1 };
// @ts-expect-error exactly one name
export const progressTwoNames: ProgressProps = { value: 1, label: 'A', 'aria-label': 'B' };

export const named: [ButtonProps, ButtonProps, ButtonProps, ProgressProps, ProgressProps, MeterProps] = [
	{ icon: true, 'aria-label': 'Named' },
	{ icon: true, 'aria-labelledby': 'named' },
	{ variant: 'tertiary', tone: 'danger' },
	{ value: 1, 'aria-labelledby': 'named' },
	{ value: 1, label: 'Named' },
	{ value: 1, 'aria-label': 'Named' }
];
