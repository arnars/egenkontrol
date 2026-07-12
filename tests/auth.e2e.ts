import { expect, test } from '@playwright/test';

test('redirects anonymous users away from internal controls', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveURL(/\/login\?next=%2F$/);
	await expect(page.getByRole('heading', { name: 'Log ind' })).toBeVisible();
	await expect(page.getByText('Kun inviterede brugere kan logge ind.')).toBeVisible();
});

test('validates login fields before contacting Supabase', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('E-mailadresse').fill('ikke-en-email');
	await page.getByLabel('Adgangskode').fill('kort');
	await page.locator('form').evaluate((form) => form.setAttribute('novalidate', ''));

	await page.getByRole('button', { name: 'Log ind' }).click();

	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByLabel('E-mailadresse')).toHaveValue('ikke-en-email');
	await expect(page.getByRole('alert')).toContainText('gyldig e-mailadresse');
});
