import type { SupabaseClient } from '@supabase/supabase-js';

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
				claims: VerifiedClaims | null;
			}>;
		}

		interface PageData {
			claims: VerifiedClaims | null;
		}
	}
}

export {};
