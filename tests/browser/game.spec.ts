import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/core/types';

const snapshot = (page: Page): Promise<GameState> =>
  page.evaluate(() => (window as any).lifeform.snapshot());
const command = (page: Page, text: string) =>
  page.evaluate((value) => (window as any).lifeform.command(value), text);

test('habitat renders, fits the viewport, and moves with pointer and keyboard', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Every life leaves a story.' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('button', { name: 'Begin your lineage' })).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-initial.png`, fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  const before = await snapshot(page);
  await page.getByRole('button', { name: 'Begin your lineage' }).click();
  const canvas = page.locator('#world'),
    bounds = (await canvas.boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width * 0.68, bounds.y + bounds.height * 0.5);
  await expect
    .poll(async () => (await snapshot(page)).player.x)
    .toBeGreaterThan(before.player.x + 30);
  await page.keyboard.press('p');
  const pausedTime = (await snapshot(page)).time;
  await page.waitForTimeout(250);
  expect((await snapshot(page)).time).toBe(pausedTime);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-playing.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile quick actions remain above navigation and touch movement works; desktop keyboard moves', async ({
  page,
}, testInfo) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5173')) external.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Begin your lineage' }).click();
  const before = (await snapshot(page)).player;
  if (testInfo.project.name === 'mobile') {
    const quick = (await page.locator('.mobile-quickbar').boundingBox())!,
      nav = (await page.locator('.navigation').boundingBox())!;
    expect(quick.y + quick.height).toBeLessThanOrEqual(nav.y);
    await expect(page.locator('.mobile-vitals')).toBeVisible();
    const stick = (await page.locator('#joystick').boundingBox())!;
    await page.mouse.move(stick.x + stick.width / 2, stick.y + stick.height / 2);
    await page.mouse.down();
    await page.mouse.move(stick.x + stick.width - 2, stick.y + stick.height / 2);
    await expect.poll(async () => (await snapshot(page)).player.x).toBeGreaterThan(before.x + 15);
    await page.mouse.up();
    await page.getByRole('button', { name: 'Adapt your body' }).click();
    await expect(page.getByRole('heading', { name: 'What could you become?' })).toBeVisible();
  } else {
    await page.keyboard.down('w');
    await expect.poll(async () => (await snapshot(page)).player.y).toBeLessThan(before.y - 15);
    await page.keyboard.up('w');
  }
  expect(external).toEqual([]);
});

test('preview and install a mutation, reproduce, grow, and inherit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /A new way to see/ }).click();
  await expect(page.getByRole('dialog')).toContainText('130');
  await page.getByRole('button', { name: 'Adapt · 1 point + 4 biomass' }).click();
  expect((await snapshot(page)).player.genome.organs).toContain('eye');
  await command(page, '/biomass 30');
  await command(page, '/advance 13');
  await page
    .locator('.bottom-bar')
    .getByRole('button', { name: /Reproduce/ })
    .click();
  expect((await snapshot(page)).lineage.archive).toHaveLength(2);
  await command(page, '/advance 31');
  await page.locator('.navigation').getByRole('button', { name: 'Lineage' }).click();
  await expect(page.getByText('One life becomes many.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue as this individual' }).click();
  expect((await snapshot(page)).player.generation).toBe(2);
  await command(page, '/die');
  expect((await snapshot(page)).lineage.extinct).toBe(false);
  expect((await snapshot(page)).player.generation).toBe(1);
});

test('save and resume preserve adaptations; invalid imports leave the current world intact', async ({
  page,
}) => {
  await page.goto('/');
  await command(page, '/points 10');
  await command(page, '/biomass 40');
  await command(page, '/mutation mineral-shell');
  await page.getByRole('button', { name: 'Save lineage', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue your lineage' })).toBeVisible();
  expect((await snapshot(page)).player.genome.organs).toContain('shell');
  const before = await snapshot(page);
  await page.locator('#import-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{oops'),
  });
  await expect(page.getByRole('status')).toContainText('not a valid JSON');
  expect(await snapshot(page)).toEqual(before);
});

test('settings, discovery, world map, extinction, and new seeded lineage work', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: /Reduced motion/ }).check();
  await page.getByRole('checkbox', { name: /Larger text/ }).check();
  await page.getByRole('combobox', { name: 'Control style' }).selectOption('direct');
  expect((await snapshot(page)).settings.control).toBe('direct');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('.navigation').getByRole('button', { name: 'Discoveries' }).click();
  await expect(page.getByRole('heading', { name: 'Curiosity is an adaptation.' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.locator('.navigation').getByRole('button', { name: 'Habitat' }).click();
  await page.getByRole('button', { name: 'Open world map', exact: true }).click();
  await expect(page.locator('#large-map')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await command(page, '/die');
  await expect(page.getByRole('heading', { name: 'A life ends. A story remains.' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin another lineage' }).click();
  await page.getByRole('textbox', { name: 'WORLD SEED' }).fill('TEST-NEW-WORLD');
  await page.getByRole('button', { name: 'Start a new lineage' }).click();
  expect((await snapshot(page)).seed).toBe('TEST-NEW-WORLD');
  expect((await snapshot(page)).legacies).toHaveLength(1);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-accessibility.png`,
    fullPage: true,
  });
});
