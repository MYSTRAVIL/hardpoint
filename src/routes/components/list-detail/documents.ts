// Sample content for the list-detail demos: documents grouped by folder.

export type Doc = {
	id: string;
	folder: string;
	title: string;
	owner: string;
	modified: string;
	words: number;
	body: string[];
};

/** The folders in list order. New documents go to Drafts, which shows first once it has any. */
export const folders = ['Drafts', 'Planning', 'Design', 'Research', 'Finance', 'Handbook'];

const paragraphs = [
	'This document collects the decisions made so far and the questions that are still open. Add a comment where something is unclear rather than changing the text directly.',
	'Each section starts with what changed since the last version. Older notes stay at the end, so the history of a decision is easy to follow.',
	'The owner reviews the document every two weeks. A section that no longer applies moves to the archive folder instead of being deleted.',
	'Dates are written as year, month and day. Names refer to the person responsible for a point, not to everyone who took part in the discussion.',
	'Links to other documents use their titles, so they still read well when printed. Attachments live in the same folder as this document.',
	'When a decision needs a vote, the options and what each one costs are listed first. The outcome and the date it was made follow underneath.',
	'Questions that come up in meetings are added here within a day, with the name of the person who will answer them.',
	'Figures in this document are rounded to whole numbers. The exact values are in the spreadsheet linked at the end.'
];

const rows: [folder: string, title: string, owner: string, modified: string, words: number][] = [
	['Planning', 'Roadmap for the spring release', 'Mara Ilves', '2026-11-09', 2140],
	['Planning', 'Team goals for next quarter', 'Jonas Berg', '2026-11-04', 860],
	['Planning', 'Launch checklist', 'Ana Kovač', '2026-10-30', 420],
	['Planning', 'Hiring plan', 'Mara Ilves', '2026-10-21', 1310],
	['Planning', 'Offsite agenda', 'Priya Nair', '2026-10-12', 380],
	['Design', 'Onboarding flow review', 'Lena Fischer', '2026-11-08', 1720],
	['Design', 'Colour and type notes', 'Omar Haddad', '2026-11-02', 940],
	['Design', 'Settings page sketches', 'Lena Fischer', '2026-10-27', 510],
	['Design', 'Copy for empty screens', 'Sam Okafor', '2026-10-19', 670],
	['Research', 'Interview notes: small teams', 'Ingrid Berg', '2026-11-07', 3050],
	['Research', 'Survey results, October', 'Priya Nair', '2026-11-01', 1180],
	['Research', 'Search habits study', 'Ingrid Berg', '2026-10-15', 2460],
	['Research', 'Accessibility review summary', 'Sam Okafor', '2026-10-09', 1590],
	['Finance', 'Budget for next year', 'Jonas Berg', '2026-11-06', 1270],
	['Finance', 'Travel expense policy', 'Ana Kovač', '2026-10-25', 730],
	['Finance', 'Supplier contracts overview', 'Omar Haddad', '2026-10-18', 990],
	['Handbook', 'Welcome to the team', 'Mara Ilves', '2026-09-30', 1450],
	['Handbook', 'How we run meetings', 'Priya Nair', '2026-09-22', 820],
	['Handbook', 'Time off and holidays', 'Ana Kovač', '2026-09-15', 610],
	['Handbook', 'Writing style guide', 'Lena Fischer', '2026-09-08', 2280],
	['Handbook', 'Equipment and accounts', 'Sam Okafor', '2026-09-01', 540]
];

export const documents: Doc[] = rows.map(([folder, title, owner, modified, words], i) => ({
	id: `doc-${i + 1}`,
	folder,
	title,
	owner,
	modified,
	words,
	// Six paragraphs each, so a document scrolls on a phone.
	body: Array.from({ length: 6 }, (_, k) => paragraphs[(i + k) % paragraphs.length])
}));
