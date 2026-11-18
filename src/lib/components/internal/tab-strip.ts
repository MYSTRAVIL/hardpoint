// What Tabs and TabNav share besides base.css's `.hp-tab-strip` look: showing
// the selected tab inside the strip, and doing it again when the strip or a
// tab changes size.

/**
 * Shows `tab` whole inside `list`, with part of the next one (the list's
 * scroll-padding). It scrolls the list alone, never the page
 * (scrollIntoView would), and jumps: selection snaps (motion rule 3).
 */
export function revealTab(list: HTMLElement, tab: HTMLElement | undefined) {
	if (!tab) return;
	const style = getComputedStyle(list);
	// The tab's edges in the list's scroll coordinates, from rects: offsetLeft
	// and offsetWidth round to whole pixels. The target rounds outward, so
	// the padding never comes up a fraction short.
	const listLeft = list.getBoundingClientRect().left + list.clientLeft;
	const rect = tab.getBoundingClientRect();
	const left = rect.left - listLeft + list.scrollLeft;
	const start = Math.floor(left - (parseFloat(style.scrollPaddingLeft) || 0));
	const end = Math.ceil(left + rect.width + (parseFloat(style.scrollPaddingRight) || 0));
	if (start < list.scrollLeft) {
		list.scrollTo({ left: start, behavior: 'instant' });
	} else if (end > list.scrollLeft + list.clientWidth) {
		list.scrollTo({ left: end - list.clientWidth, behavior: 'instant' });
	}
}

/**
 * Calls `reveal` whenever `list` or one of its children changes size: the web
 * font arrives, the screen turns, or a hidden parent shows the list. Returns
 * the cleanup. Call it again when the set of tabs changes, so a tab an app
 * swaps in for another is watched too.
 */
export function watchTabStrip(list: HTMLElement, reveal: () => void): () => void {
	const observer = new ResizeObserver(reveal);
	observer.observe(list);
	for (const tab of list.children) observer.observe(tab);
	return () => observer.disconnect();
}
