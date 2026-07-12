import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';

const publicPaths = new Set(['/login']);

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});

	event.locals.getVerifiedAuth = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) return { session: null, claims: null };

		const { data, error } = await event.locals.supabase.auth.getClaims();
		if (error || !data?.claims?.sub) return { session: null, claims: null };

		return { session, claims: data.claims as App.PageData['claims'] };
	};

	if (!publicPaths.has(event.url.pathname)) {
		const { claims } = await event.locals.getVerifiedAuth();
		if (!claims) redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};
