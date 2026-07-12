import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const loginSchema = z.object({
	email: z.email('Indtast en gyldig e-mailadresse.'),
	password: z.string().min(8, 'Adgangskoden skal være på mindst 8 tegn.')
});

export const load: PageServerLoad = async ({ locals }) => {
	const { claims } = await locals.getVerifiedAuth();
	if (claims) redirect(303, '/');

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const parsed = loginSchema.safeParse({
			email: formData.get('email'),
			password: formData.get('password')
		});

		if (!parsed.success) {
			return fail(400, {
				email: String(formData.get('email') ?? ''),
				error: parsed.error.issues[0]?.message ?? 'Kontrollér e-mailadressen.'
			});
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email: parsed.data.email,
			password: parsed.data.password
		});

		if (error) {
			return fail(400, {
				email: parsed.data.email,
				error: 'E-mail eller adgangskode er forkert.'
			});
		}

		redirect(303, '/');
	}
};
