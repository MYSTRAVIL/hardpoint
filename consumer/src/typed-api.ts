// Type-level checks on the shipped declarations. svelte-check compiles this
// file, so it fails when an accessible name stops being required or when a
// primary Button accepts a tone. Nothing here runs.
import type { ButtonProps, MeterProps, StatProps, ProgressProps, SliderProps, TabNavProps, TextFieldType } from '@mystravil/hardpoint';

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

// @ts-expect-error a slider needs its label
export const sliderWithoutLabel: SliderProps = { value: 1 };
// @ts-expect-error a tab navigation needs its name
export const tabNavWithoutLabel: TabNavProps = { items: [] };
// @ts-expect-error a slider's value is a number
export const sliderStringValue: SliderProps = { label: 'Level', value: '1' };

export const typedFields: TextFieldType[] = ['number', 'date', 'time', 'datetime-local'];
export const slider: SliderProps = { label: 'Level', value: 1, min: 0, max: 10, step: 1, format: (n) => String(n), valueText: (n) => `Level ${n}`, hint: 'Hint' };
// Slider's label sits beside the track as on the other fields, or is hidden.
import type { SliderLabelBeside } from '@mystravil/hardpoint';
export const sliderBeside: SliderLabelBeside[] = [true, false, 'medium', 'expanded', 'large'];
export const sliderHidden: SliderProps = { label: 'Zoom', labelHidden: true, labelBeside: 'medium' };
// @ts-expect-error labelBeside takes the field breakpoints only
export const sliderBesideWrong: SliderProps = { label: 'Zoom', labelBeside: 'compact' };
export const tabNav: TabNavProps = { label: 'Pages', items: [{ href: '/a', label: 'A' }], current: '/a' };

// Charts: a name is required, and a tone is a status hue, never a category.
import type { BarChartProps, BarChartSeries, SparklineProps } from '@mystravil/hardpoint';
// @ts-expect-error a bar chart needs an accessible name
export const chartWithoutName: BarChartProps = { items: [], series: [] };
// @ts-expect-error a sparkline needs a label
export const sparklineWithoutName: SparklineProps = { values: [] };
// @ts-expect-error a category is a color, not a tone
export const categoryTone: BarChartSeries = { key: 'a', label: 'A', tone: 'category-1' };
export const charts: [BarChartProps, SparklineProps] = [
	{ label: 'Named', items: [{ label: 'One', values: { a: 1 } }], series: [{ key: 'a', label: 'A', color: 'muted' }] },
	{ label: 'Named', values: [1, null, 2], tone: 'danger' }
];

// Table: a sort names a field of the row, in aria-sort's words.
import type { TableSort } from '@mystravil/hardpoint';
type FileRow = { name: string; size: number };
// @ts-expect-error a sort key is a field of the row
export const sortUnknownKey: TableSort<FileRow> = { key: 'owner', direction: 'ascending' };
// @ts-expect-error the direction is aria-sort's word
export const sortShortDirection: TableSort<FileRow> = { key: 'size', direction: 'desc' };
export const sortBySize: TableSort<FileRow> = { key: 'size', direction: 'descending' };

// Stat: the value is `value` or `children`, exactly one.
import type { Snippet } from 'svelte';
declare const valueMarkup: Snippet;
// @ts-expect-error value and children together
export const statBoth: StatProps = { label: 'A', value: 1, children: valueMarkup };
// @ts-expect-error neither a value nor children
export const statNeither: StatProps = { label: 'A' };
export const statValue: StatProps = { label: 'A', value: '1,204', unit: 'jobs', delta: 2 };
export const statMarkup: StatProps = { label: 'A', children: valueMarkup, unit: 'jobs', delta: 2, variant: 'display' };

// A column's live mark answers a boolean for the row.
import type { Column } from '@mystravil/hardpoint';
export const liveColumn: Column<FileRow> = { key: 'size', label: 'Size', mark: () => 'ok', markLive: (row) => row.size > 0 };
// @ts-expect-error markLive answers a boolean
export const liveColumnWrong: Column<FileRow> = { key: 'size', label: 'Size', markLive: () => 'yes' };

// NativeSelect's label can be hidden, and a hidden label overrides labelBeside.
import type { ComponentProps } from 'svelte';
import type { NativeSelect } from '@mystravil/hardpoint';
export const nativeSelectHidden: ComponentProps<typeof NativeSelect> = { label: 'Sort', labelHidden: true, labelBeside: 'medium', items: [{ value: 'a', label: 'A' }] };
// @ts-expect-error labelHidden is a boolean
export const nativeSelectHiddenWrong: ComponentProps<typeof NativeSelect> = { label: 'Sort', labelHidden: 'yes' };
