// The specimen app's projects: the specimen list page's ten hand-written
// rows and 94 generated ones, so paging and filters work.

export type Status = 'Active' | 'Planned' | 'Blocked' | 'On hold' | 'Done';
export type Priority = 'High' | 'Medium' | 'Low';
export type Project = {
	id: string;
	name: string;
	owner: string;
	updated: string;
	priority: Priority;
	status: Status;
	progress: number;
};

/** The signed-in person: the Mine view lists the projects they own. */
export const me = 'Mara Ilves';

export const statuses: Status[] = ['Active', 'Planned', 'Blocked', 'On hold', 'Done'];
export const priorities: Priority[] = ['High', 'Medium', 'Low'];
// Colour only where the word means that status (BRIEF, Tokens).
export const tone: Partial<Record<Status, 'warn' | 'ok'>> = { Blocked: 'warn', Done: 'ok' };

const firstPage: Project[] = [
	{ id: 'PRJ-0142', name: 'Customer portal redesign', owner: 'Mara Ilves', updated: '2026-11-08', priority: 'High', status: 'Blocked', progress: 62 },
	{ id: 'PRJ-0139', name: 'Invoice export to CSV', owner: 'Tomás Reyes', updated: '2026-11-07', priority: 'Medium', status: 'Active', progress: 35 },
	{ id: 'PRJ-0137', name: 'Onboarding checklist v2', owner: 'Ana Kovač', updated: '2026-11-07', priority: 'High', status: 'Active', progress: 48 },
	{ id: 'PRJ-0136', name: 'Search relevance tuning', owner: 'Joel Brandt', updated: '2026-11-06', priority: 'Low', status: 'Planned', progress: 0 },
	{ id: 'PRJ-0133', name: 'Offline mode for the mobile app', owner: 'Mara Ilves', updated: '2026-11-05', priority: 'High', status: 'Active', progress: 21 },
	{ id: 'PRJ-0131', name: 'Accessibility audit fixes', owner: 'Ines Duarte', updated: '2026-11-04', priority: 'Medium', status: 'Done', progress: 100 },
	{ id: 'PRJ-0128', name: 'Billing address validation', owner: 'Tomás Reyes', updated: '2026-11-03', priority: 'Low', status: 'On hold', progress: 14 },
	{ id: 'PRJ-0126', name: 'Team permissions', owner: 'Ana Kovač', updated: '2026-11-02', priority: 'Medium', status: 'Done', progress: 100 },
	{ id: 'PRJ-0121', name: 'Weekly digest email', owner: 'Joel Brandt', updated: '2026-10-30', priority: 'Low', status: 'Planned', progress: 0 },
	{ id: 'PRJ-0117', name: 'Data retention settings', owner: 'Ines Duarte', updated: '2026-10-29', priority: 'Medium', status: 'Active', progress: 57 }
];

// The other 94 rows, generated deterministically.
const areas = ['Billing', 'Search', 'Reports', 'Admin console', 'Notifications', 'Data import', 'Help centre', 'Checkout', 'Profile settings', 'Audit log', 'Calendar sync', 'File uploads', 'Public API'];
const works = ['performance pass', 'copy review', 'error states', 'keyboard support', 'empty states', 'usage metrics', 'cleanup', 'translations'];
const owners = ['Mara Ilves', 'Tomás Reyes', 'Ana Kovač', 'Joel Brandt', 'Ines Duarte'];
const statusCycle: Status[] = ['Active', 'Done', 'Active', 'Planned', 'Done', 'Active', 'On hold', 'Done', 'Planned', 'Active', 'Blocked', 'Done'];

function generated(): Project[] {
	const rows: Project[] = [];
	const day = Date.UTC(2026, 9, 28);
	for (let i = 0; i < 94; i++) {
		const status = statusCycle[(i * 5) % statusCycle.length];
		const date = new Date(day - Math.floor(i * 1.6) * 86_400_000);
		rows.push({
			id: `PRJ-${String(116 - i).padStart(4, '0')}`,
			name: `${areas[(i * 7) % areas.length]} ${works[i % works.length]}`,
			owner: owners[(i * 3) % owners.length],
			updated: date.toISOString().slice(0, 10),
			priority: priorities[(i * 2 + (i >> 2)) % 3],
			status,
			progress: status === 'Done' ? 100 : status === 'Planned' ? 0 : (i * 37) % 96 + 3
		});
	}
	return rows;
}

export const projects: Project[] = [...firstPage, ...generated()];
