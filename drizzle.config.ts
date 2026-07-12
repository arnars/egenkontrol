import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	breakpoints: true,
	strict: true,
	verbose: true,
	migrations: {
		prefix: 'supabase'
	},
	...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {})
});
