<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Log ind — Nabo Brejning</title>
</svelte:head>

<section class="login-shell" aria-labelledby="login-heading">
	<p class="eyebrow">Nabo Brejning · Egenkontrol</p>
	<h1 id="login-heading">Log ind</h1>
	<p class="login-intro">Log ind med den e-mailadresse og adgangskode, du har fået udleveret.</p>

	<form method="POST" class="login-form">
		<label for="email">E-mailadresse</label>
		<input
			id="email"
			name="email"
			type="email"
			autocomplete="email"
			required
			value={form?.email ?? ''}
		/>
		<label for="password">Adgangskode</label>
		<input
			id="password"
			name="password"
			type="password"
			autocomplete="current-password"
			minlength="8"
			required
		/>
		{#if form?.error}<p class="field-error" role="alert">{form.error}</p>{/if}
		<button class="primary-button" type="submit">Log ind</button>
	</form>

	<p class="login-footnote">Kun inviterede brugere kan logge ind.</p>
</section>
