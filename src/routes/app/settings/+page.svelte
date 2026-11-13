<script lang="ts">
	import { tick } from 'svelte';
	import {
		Button,
		CheckboxGroup,
		Combobox,
		Dialog,
		NativeSelect,
		Switch,
		TextField,
		type CheckboxGroupItem,
		type ComboboxItem,
		type DialogTriggerSnippetProps
	} from '#lib';
	import AppFrame from '../AppFrame.svelte';
	import ThemeSelect from '../../ThemeSelect.svelte';
	import { firstLoad, replayFirstLoads } from '../first-load';

	// The first time a tab opens Settings, the page renders in the expressive
	// tier like the other views. Nothing in a form stagger or resolves, so
	// the tier changes nothing here yet; the record is kept so a component
	// that reacts to it later is covered, and "Replay first loads" below
	// clears it.
	const first = firstLoad('settings');

	// ---- This specimen ------------------------------------------------------

	let replayed = $state(false);
	function replay() {
		replayFirstLoads();
		replayed = true;
	}

	// ---- Profile ------------------------------------------------------------

	let name = $state('Mara Ilves');
	let email = $state('mara.ilves@example.com');
	let nameError = $state<string>();
	let emailError = $state<string>();
	let nameRef = $state<HTMLInputElement | null>(null);
	let emailRef = $state<HTMLInputElement | null>(null);
	// A field is checked on blur only once it has been edited, so tabbing
	// through the form never raises an error.
	let nameEdited = false;
	let emailEdited = false;

	function checkName() {
		nameError = name.trim() ? undefined : 'Enter your name.';
	}
	function checkEmail() {
		emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
			? undefined
			: 'Enter an email address like name@example.com.';
	}

	// Every zone the browser knows, shown with spaces for underscores.
	const timeZones: ComboboxItem[] = Intl.supportedValuesOf('timeZone').map((zone) => ({
		value: zone,
		label: zone.replaceAll('_', ' ')
	}));
	let timeZone = $state('Europe/Berlin');

	// Each name in its own language, so a screen reader says it right.
	const languages = [
		{ value: 'en', label: 'English' },
		{ value: 'de', label: 'Deutsch' },
		{ value: 'es', label: 'Español' },
		{ value: 'fr', label: 'Français' },
		{ value: 'pt', label: 'Português' }
	];
	let language = $state('en');

	// ---- Notifications ------------------------------------------------------

	let emailNotifications = $state(true);
	let weeklySummary = $state(true);
	let desktopNotifications = $state(false);
	const topicItems: CheckboxGroupItem[] = [
		{ value: 'comments', label: 'Comments' },
		{ value: 'status', label: 'Status changes' },
		{ value: 'due', label: 'Due dates' },
		{ value: 'members', label: 'New members' }
	];
	let topics = $state(['comments', 'status', 'due']);

	// ---- Save ---------------------------------------------------------------

	// "Changes saved." holds only while the form still matches what was
	// saved; any later change takes it away.
	const current = $derived(
		JSON.stringify([
			name,
			email,
			timeZone,
			language,
			emailNotifications,
			weeklySummary,
			desktopNotifications,
			topics
		])
	);
	let savedAs = $state('');
	const saved = $derived(savedAs === current);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		checkName();
		checkEmail();
		if (nameError || emailError) {
			// Focus once the error is rendered and linked to the field, so it is
			// read out with it.
			await tick();
			if (nameError) nameRef?.focus();
			else emailRef?.focus();
			return;
		}
		savedAs = current;
	}

	// ---- Notification history -----------------------------------------------

	const unread = 3;
	let read = $state(46);
	let cleared = $state(0);
	let noneLeft = $state<HTMLElement | null>(null);

	function clearRead() {
		cleared = read;
		read = 0;
	}

	// The trigger is gone once nothing is left to clear, so focus goes to the
	// line that took its place rather than to the top of the page.
	function afterClose(event: Event) {
		if (read) return;
		event.preventDefault();
		tick().then(() => noneLeft?.focus());
	}
</script>

<svelte:head>
	<title>Settings · Specimen app · Hardpoint</title>
</svelte:head>

{#snippet clearTrigger({ props }: DialogTriggerSnippetProps)}
	<Button {...props} type="button">Clear read notifications</Button>
{/snippet}

<AppFrame title="Settings" expressive={first}>
	<form class="settings" novalidate onsubmit={save}>
		<section aria-labelledby="profile">
			<h2 id="profile" class="hp-section-title">Profile</h2>
			<div class="fields">
				<TextField
					label="Name"
					autocomplete="name"
					enterkeyhint="next"
					required
					error={nameError}
					bind:value={name}
					bind:ref={nameRef}
					oninput={() => {
						nameEdited = true;
						if (nameError) checkName();
					}}
					onblur={() => nameEdited && checkName()}
				/>
				<TextField
					label="Email"
					type="email"
					autocomplete="email"
					enterkeyhint="next"
					required
					hint="Notifications go to this address."
					error={emailError}
					bind:value={email}
					bind:ref={emailRef}
					oninput={() => {
						emailEdited = true;
						if (emailError) checkEmail();
					}}
					onblur={() => emailEdited && checkEmail()}
				/>
				<Combobox label="Time zone" items={timeZones} bind:value={timeZone} />
				<NativeSelect label="Language" bind:value={language}>
					{#each languages as option (option.value)}
						<option value={option.value} lang={option.value}>{option.label}</option>
					{/each}
				</NativeSelect>
			</div>
		</section>

		<section aria-labelledby="appearance">
			<h2 id="appearance" class="hp-section-title">Appearance</h2>
			<ThemeSelect hint="Applies at once and stays on this device. System follows your device." />
		</section>

		<section aria-labelledby="notifications">
			<h2 id="notifications" class="hp-section-title">Notifications</h2>
			<div class="fields">
				<Switch
					label="Email notifications"
					hint="Mentions, assignments and due dates."
					bind:checked={emailNotifications}
				/>
				<Switch label="Weekly summary" hint="A digest every Monday morning." bind:checked={weeklySummary} />
				<Switch
					label="Desktop notifications"
					hint="Only while the app is open."
					bind:checked={desktopNotifications}
				/>
				<CheckboxGroup label="Notify me about" items={topicItems} bind:value={topics} />
			</div>
		</section>

		<section aria-labelledby="history">
			<h2 id="history" class="hp-section-title">Notification history</h2>
			<div class="fields">
				<p class="hp-dense hp-num">
					{read ? `${unread} unread and ${read} read notifications.` : `${unread} unread notifications.`}
				</p>
				<div class="row">
					<Dialog
						title="Clear read notifications?"
						description="The {read || cleared} read notifications leave your inbox for good. Unread ones stay."
						trigger={read ? clearTrigger : undefined}
						onCloseAutoFocus={afterClose}
					>
						{#snippet actions({ close })}
							<Button onclick={close}>Cancel</Button>
							<Button
								variant="primary"
								onclick={() => {
									clearRead();
									close();
								}}>Clear</Button
							>
						{/snippet}
					</Dialog>
					{#if !read}
						<p class="none hp-dense" tabindex="-1" bind:this={noneLeft}>No read notifications.</p>
					{/if}
					<p class="hp-dense hp-num" role="status">{cleared ? `Cleared ${cleared} notifications.` : ''}</p>
				</div>
			</div>
		</section>

		<div class="row">
			<Button type="submit" variant="primary">Save changes</Button>
			<p class="hp-dense" role="status">{saved ? 'Changes saved.' : ''}</p>
		</div>
	</form>

	<section class="specimen" aria-labelledby="specimen">
		<h2 id="specimen" class="hp-section-title">This specimen</h2>
		<p class="hp-dense">
			Each view of this app loads with motion the first time you open it in a tab. Closing the tab
			resets that, and so does this button.
		</p>
		<div class="row">
			<Button type="button" onclick={replay}>Replay first loads</Button>
			<p class="hp-dense" role="status">{replayed ? 'Each view will animate again.' : ''}</p>
		</div>
	</section>
</AppFrame>

<style>
	/* One column of fields at a width a form reads well at; on phones it is
	   the screen's width. Sections sit twice as far apart as the fields in
	   one, and a heading sits closer to its fields than they do to each
	   other. */
	.settings {
		display: grid;
		gap: var(--space-12);
		max-width: 480px;
	}
	section {
		display: grid;
		gap: var(--space-4);
	}
	.fields {
		display: grid;
		gap: var(--space-6);
	}

	.none {
		color: var(--muted);
	}

	/* Under the form, as far from it as its sections are from each other. */
	.specimen {
		margin-top: var(--space-12);
		max-width: 480px;
	}

	/* An action with its status line beside it, or under it when the line
	   does not fit. The status line stays rendered, so a screen reader
	   announces the text when it appears. */
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}
</style>
