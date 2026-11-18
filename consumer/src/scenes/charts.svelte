<script lang="ts">
	import { BarChart, Button, Sparkline, type BarChartSeries } from '@mystravil/hardpoint';

	const series: BarChartSeries[] = [
		{ key: 'a', label: 'Alpha' },
		{ key: 'b', label: 'Beta', color: 'muted' },
		{ key: 'c', label: 'Gamma', tone: 'danger' }
	];
	let offset = $state(0);
	const items = $derived(
		Array.from({ length: 12 }, (_, i) => ({
			label: `Bar ${i + 1 + offset}`,
			axisLabel: String(i + 1 + offset),
			values: { a: 3 + ((i * 5) % 7), b: 2 + (i % 3), c: i % 4 === 0 ? 1 : 0 }
		}))
	);
</script>

<main class="page">
	<p id="away">Charts</p>
	<Button id="before">Before</Button>
	<BarChart id="stacked" label="Stacked bars" {items} {series} />
	<Button onclick={() => offset++}>Shift</Button>
	<BarChart
		id="negative"
		class="low-chart"
		label="Below zero"
		items={[
			{ label: 'One', values: { v: 3 } },
			{ label: 'Two', values: { v: -2 } }
		]}
		series={[{ key: 'v', label: 'Value', color: 'text' }]}
	/>
	<p>Trend <Sparkline id="spark" label="Trend" values={[1, 4, null, 3, 6]} format={(n) => `${n} units`} /></p>
	<Sparkline id="spark-tone" class="wide-spark" label="Failures" values={[0, 2, 1, 5]} tone="danger" />
</main>
