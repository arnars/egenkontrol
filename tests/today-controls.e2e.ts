import { expect, test } from '@playwright/test';

test('completes a normal refrigerator temperature control', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Dagens kontroller' })).toBeVisible();
	await expect(page.getByText('5 kontroller', { exact: true }).first()).toBeVisible();

	await page.getByRole('button', { name: /Køleskab 1/ }).click();
	await page.getByLabel('Målt temperatur').fill('4,2');
	await page.getByRole('button', { name: 'Gem kontrol' }).click();

	await expect(page.getByText('4,2 °C')).toBeVisible();
	await expect(page.getByText('4 kontroller', { exact: true })).toBeVisible();
});

test('requires an explicit deviation above the configured limit', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /Køleskab 1/ }).click();
	await page.getByLabel('Målt temperatur').fill('6');
	await page.getByRole('button', { name: 'Gem kontrol' }).click();

	await expect(page.getByText(/Markér afvigelse for at fortsætte/)).toBeVisible();
	await page.getByLabel('Markér afvigelse').check();
	await page.getByRole('button', { name: 'Gem kontrol' }).click();

	await expect(page.getByText('6 °C · afvigelse')).toBeVisible();
});
