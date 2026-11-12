<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import TextField from '#lib/components/TextField.svelte';

	let projectName = $state('');
	let ownerEmail = $state('');
	let phone = $state('');

	// The live form: the page validates, the field shows the error it is
	// given. Validate on blur and on submit; once a field shows an error,
	// check it again on input so the error clears as soon as it is fixed.
	let inviteName = $state('');
	let inviteEmail = $state('');
	let nameError = $state<string>();
	let emailError = $state<string>();
	let nameRef = $state<HTMLInputElement | null>(null);
	let emailRef = $state<HTMLInputElement | null>(null);
	let sent = $state('');

	function checkName() {
		nameError = inviteName.trim() ? undefined : 'Enter the person’s name.';
	}
	function checkEmail() {
		const v = inviteEmail.trim();
		emailError = !v
			? 'Enter an email address.'
			: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
				? undefined
				: 'Enter an email address in the form name@example.com.';
	}
	function submit(event: SubmitEvent) {
		event.preventDefault();
		checkName();
		checkEmail();
		sent = '';
		if (nameError) nameRef?.focus();
		else if (emailError) emailRef?.focus();
		else sent = `Invite sent to ${inviteEmail.trim()}.`;
	}

	let find = $state('');
	let seats = $state('12');
</script>

<svelte:head>
	<title>Text field · Components · Hardpoint</title>
</svelte:head>

<header><h1 class="hp-view-title">Text field</h1></header>

<main id="main" tabindex="-1">
	<p class="intro">
		A single line of text. <code>TextField</code> is a native <code>&lt;input&gt;</code> in the black
		well, with a plain caps label above it, never a placeholder alone. A hint and an inline error sit
		under the well and are linked to it. Its text is 16px at every width, so iOS does not zoom on
		focus.
	</p>

	<section aria-labelledby="usage">
		<h2 id="usage" class="hp-section-title">Usage</h2>
		<ul class="notes">
			<li>
				<strong>Label.</strong> <code>label</code> is required and shows as a caps label above the well,
				linked to the input. <code>labelBeside</code> moves it beside the well: <code>true</code> at every
				width, or <code>'medium'</code>, <code>'expanded'</code> or <code>'large'</code> from 600px, 900px
				or 1200px up.
			</li>
			<li>
				<strong>Hint and error.</strong> <code>hint</code> shows guidance under the well in the muted
				ink. <code>error</code> shows a message under it with an icon, sets
				<code>aria-invalid</code> and turns the boundary red. Both are linked by
				<code>aria-describedby</code>, the error first. Say how to fix the problem. An error that
				appears after the first render fades in with the red boundary over <code>--dur-message</code>
				(120ms); one that clears goes at once.
			</li>
			<li>
				<strong>Validation stays with the app.</strong> The field shows the error it is given. Validate
				on blur and on submit; on submit, focus the first field with an error through
				<code>bind:ref</code>. Never disable the submit button to signal errors.
			</li>
			<li>
				<strong>Attributes.</strong> <code>type</code> is <code>text</code>, <code>email</code>,
				<code>password</code>, <code>search</code>, <code>tel</code> or <code>url</code>. Set
				<code>inputmode</code>, <code>autocomplete</code> and <code>enterkeyhint</code> for the phone
				keyboard; for numbers use <code>inputmode="numeric"</code>. These, <code>name</code>,
				<code>required</code>, event handlers and <code>class</code> go to the
				<code>&lt;input&gt;</code>. <code>bind:value</code> holds the text.
			</li>
		</ul>
	</section>

	<section aria-labelledby="hints">
		<h2 id="hints" class="hp-section-title">Label and hint</h2>
		<p class="lede">The default: the label above, the hint below. The keyboard follows the type.</p>
		<div class="form">
			<TextField
				label="Project name"
				hint="Shown in lists and in the page title."
				autocomplete="off"
				enterkeyhint="next"
				bind:value={projectName}
			/>
			<TextField
				label="Owner email"
				type="email"
				autocomplete="email"
				enterkeyhint="next"
				hint="Gets a message when the project changes state."
				bind:value={ownerEmail}
			/>
			<TextField label="Phone" type="tel" autocomplete="tel" enterkeyhint="done" bind:value={phone} />
		</div>
	</section>

	<section aria-labelledby="errors">
		<h2 id="errors" class="hp-section-title">Inline error</h2>
		<p class="lede">
			The error sits under the well with an icon and text, and the boundary turns red. The hint stays.
		</p>
		<div class="form">
			<TextField
				label="Project key"
				value="Web app"
				hint="Letters, numbers and hyphens. Used in links."
				error="Use only letters, numbers and hyphens, for example web-app."
				autocomplete="off"
			/>
			<TextField
				label="Repository address"
				type="url"
				value="git.example.com/web"
				error="Start the address with https://."
			/>
		</div>
	</section>

	<section aria-labelledby="form">
		<h2 id="form" class="hp-section-title">In a form</h2>
		<p class="lede">
			Leave a field empty and move on, or send the form: the first field with an error takes focus.
		</p>
		<form class="form" novalidate onsubmit={submit}>
			<TextField
				label="Name"
				autocomplete="name"
				enterkeyhint="next"
				required
				error={nameError}
				bind:value={inviteName}
				bind:ref={nameRef}
				onblur={checkName}
				oninput={() => nameError && checkName()}
			/>
			<TextField
				label="Email"
				type="email"
				autocomplete="email"
				enterkeyhint="send"
				required
				hint="The invite goes to this address."
				error={emailError}
				bind:value={inviteEmail}
				bind:ref={emailRef}
				onblur={checkEmail}
				oninput={() => emailError && checkEmail()}
			/>
			<div class="actions">
				<Button type="submit" variant="primary">Send invite</Button>
			</div>
			<p class="sent" role="status">{sent}</p>
		</form>
	</section>

	<section aria-labelledby="beside">
		<h2 id="beside" class="hp-section-title">Label beside</h2>
		<p class="lede">
			<code>labelBeside="expanded"</code>: above the well below 900px, beside it from 900px, as in a
			filter row. With <code>labelBeside</code> at every width, the hint stays under the well.
		</p>
		<div class="filters">
			<TextField
				label="Find"
				type="search"
				labelBeside="expanded"
				placeholder="Name or key"
				enterkeyhint="search"
				bind:value={find}
			/>
		</div>
		<div class="form beside">
			<TextField
				label="Seats"
				labelBeside
				inputmode="numeric"
				autocomplete="off"
				hint="Whole seats, 1 to 500."
				bind:value={seats}
			/>
		</div>
		<p class="value hp-caption">
			<span class="hp-mono">find = '{find}'</span> · <span class="hp-mono">seats = '{seats}'</span>
		</p>
	</section>

	<section aria-labelledby="states">
		<h2 id="states" class="hp-section-title">States</h2>
		<p class="lede">
			A placeholder shows an example, never the label. A long value ends in an ellipsis until the field
			has focus. A disabled field takes muted text and the quieter boundary. Press <kbd>Tab</kbd> to see
			the focus contour.
		</p>
		<div class="form">
			<TextField label="Search files" type="search" placeholder="File name or path" enterkeyhint="search" />
			<TextField
				label="Description"
				value="Quarterly planning for the web, mobile and desktop releases, with owners for each milestone"
			/>
			<TextField
				label="Password"
				type="password"
				autocomplete="new-password"
				hint="Use 12 or more characters."
			/>
			<TextField
				label="Workspace ID"
				value="ws-4821-k9"
				disabled
				hint="Set when the workspace was created."
			/>
		</div>
	</section>
</main>

<style>
	.intro,
	.lede {
		max-width: var(--measure);
		color: var(--muted);
	}
	.lede {
		margin: var(--space-2) 0 var(--space-5);
	}

	section {
		margin-top: var(--space-12);
	}

	/* Token names never break at their hyphens. */
	code,
	kbd {
		font-size: 0.875em;
		white-space: nowrap;
	}

	.notes {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		margin: var(--space-3) 0 0;
		padding-left: var(--space-5);
		color: var(--muted);
	}
	.notes strong {
		color: var(--text);
		font-weight: 500;
	}

	/* One column of fields; the gap between fields is more than twice the
	   gap inside one. */
	.form {
		display: grid;
		gap: var(--space-6);
		max-width: 424px;
	}
	.beside {
		margin-top: var(--space-6);
	}
	.actions {
		display: flex;
	}

	.filters {
		max-width: 424px;
	}
	@media (min-width: 900px) {
		.filters {
			max-width: 360px;
		}
	}

	.value {
		margin: var(--space-3) 0 0;
		color: var(--muted);
	}
	/* The status region stays rendered, so a screen reader announces the
	   text when it appears. */
	.sent {
		margin: 0;
	}
</style>
