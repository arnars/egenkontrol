import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	webServer: {
		command: 'pnpm build && pnpm preview --host 127.0.0.1',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'ipad-portrait',
			use: { ...devices['iPad (gen 7)'], browserName: 'chromium' }
		},
		{
			name: 'ipad-landscape',
			use: { ...devices['iPad (gen 7) landscape'], browserName: 'chromium' }
		}
	]
});
