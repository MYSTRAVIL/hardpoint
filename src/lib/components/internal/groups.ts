// Options in named groups, in one list (Select, Combobox, NativeSelect).
// Items without a group come first, before any heading; then each group,
// in the order its first item appears. Items keep their order inside a
// group. An empty `group` counts as none, because a heading needs text.

export type OptionGroup<T> = { name: string; items: T[] };

export type GroupedOptions<T> = {
	/** The items without a group, in their order. */
	loose: T[];
	groups: OptionGroup<T>[];
	/** Every item in the order the list shows them. */
	ordered: T[];
};

export function groupOptions<T extends { group?: string }>(items: readonly T[]): GroupedOptions<T> {
	const loose: T[] = [];
	const byName = new Map<string, T[]>();
	for (const item of items) {
		if (!item.group) {
			loose.push(item);
			continue;
		}
		const members = byName.get(item.group);
		if (members) members.push(item);
		else byName.set(item.group, [item]);
	}
	if (!byName.size) return { loose, groups: [], ordered: loose };
	const groups = Array.from(byName, ([name, members]) => ({ name, items: members }));
	return { loose, groups, ordered: loose.concat(...groups.map((g) => g.items)) };
}
