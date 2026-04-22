import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('health check — page loads without server error', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('login page renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForTimeout(2000);

    // Filter out expected noise (network errors when backend is down, etc.)
    const realErrors = errors.filter(
      (e) => !e.includes('net::ERR') && !e.includes('Failed to fetch') && !e.includes('NetworkError')
    );
    expect(realErrors.length).toBe(0);
  });

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    // Should either redirect to login or show a not-found page, not crash
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
  });
});
