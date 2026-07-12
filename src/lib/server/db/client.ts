import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

function createDatabase(connectionString: string) {
	const client = postgres(connectionString, {
		max: 1,
		prepare: false,
		idle_timeout: 20,
		connect_timeout: 10
	});

	return drizzle(client, { schema });
}

export function isDatabaseConfigured(): boolean {
	return Boolean(env.DATABASE_URL);
}

export function getDatabase(): Database {
	if (!env.DATABASE_URL) {
		throw new Error('DATABASE_URL mangler; server-side persistens er ikke konfigureret.');
	}

	database ??= createDatabase(env.DATABASE_URL);
	return database;
}
