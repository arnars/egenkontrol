<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Log ind — Nabo Brejning</title>
</svelte:head>

<section
	class="mx-auto mt-[8vh] w-[min(34rem,100%)] border border-line bg-paper p-[clamp(2rem,6vw,4rem)]"
	aria-labelledby="login-heading"
>
	<p class="m-0 font-mono text-[.72rem] tracking-[.11em] text-muted uppercase">
		Nabo Brejning · Egenkontrol
	</p>
	<h1
		class="mt-2.5 mb-4 font-sans text-[clamp(3rem,8vw,4.5rem)] leading-[.95] font-semibold tracking-[-.065em]"
		id="login-heading"
	>
		Log ind
	</h1>
	<p class="font-sans leading-relaxed text-muted">
		Log ind med den e-mailadresse og adgangskode, du har fået udleveret.
	</p>

	<form method="POST" class="mt-8 grid gap-3">
		<label class="font-mono text-[.72rem] tracking-[.11em] uppercase" for="email"
			>E-mailadresse</label
		>
		<input
			class="min-h-14 w-full rounded-none border border-line bg-page px-4 font-sans text-base"
			id="email"
			name="email"
			type="email"
			autocomplete="email"
			required
			value={form?.email ?? ''}
		/>
		<label class="font-mono text-[.72rem] tracking-[.11em] uppercase" for="password"
			>Adgangskode</label
		>
		<input
			class="min-h-14 w-full rounded-none border border-line bg-page px-4 font-sans text-base"
			id="password"
			name="password"
			type="password"
			autocomplete="current-password"
			minlength="8"
			required
		/>
		{#if form?.error}<p
				class="m-0 min-h-5 font-sans text-sm leading-relaxed text-danger"
				role="alert"
			>
				{form.error}
			</p>{/if}
		<button
			class="mt-1.5 min-h-14 cursor-pointer border border-ink bg-ink px-5 font-mono text-[.72rem] tracking-[.11em] text-paper uppercase"
			type="submit">Log ind</button
		>
	</form>

	<p class="mb-0 font-sans text-sm leading-relaxed text-muted">
		Kun inviterede brugere kan logge ind.
	</p>
</section>
