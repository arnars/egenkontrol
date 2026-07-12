import type { Session, SupabaseClient } from '@supabase/supabase-js';

type VerifiedClaims = {
	sub: string;
	email?: string;
	[key: string]: unknown;
};

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			getVerifiedAuth: () => Promise<{
				session: Session | null;
				claims: VerifiedClaims | null;
			}>;
		}

		interface PageData {
			session: Session | null;
			claims: VerifiedClaims | null;
		}
	}
}

export {};
