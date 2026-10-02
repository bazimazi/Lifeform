import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGame } from '../src/world/generation';
import { applyMutation } from '../src/biology/mutation';
import { reproduce } from '../src/biology/reproduction';
import { foundSettlement } from '../src/society/society';
import { TECHNOLOGIES } from '../src/data/society';
import { MATERIALS } from '../src/society/types';
import { decodeSave } from '../src/core/save';
const base = process.env.LIFEFORM_PREVIEW ?? 'http://127.0.0.1:4173';
await fetch(base).then((r) => {
  if (!r.ok) throw new Error('Start npm run preview before this smoke test.');
});
mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    }),
    page = await context.newPage(),
    errors: string[] = [],
    external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith(base) && !r.url().startsWith('blob:')) external.push(r.url());
  });
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => typeof (window as any).lifeform), 'undefined');
  assert.equal(await page.locator('[data-action="debug"]').count(), 0);
  await page.locator('[data-action="begin"]').click();
  await page.keyboard.down('d');
  await page.waitForTimeout(1200);
  await page.keyboard.up('d');
  await page.keyboard.press('p');
  await page.locator('[data-action="choose-adaptation"]:visible').first().click();
  await page.locator('.recommended-adaptations [data-action="mutation-preview"]').first().click();
  await page.locator('[data-action="mutate"]').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs('artifacts/production-v7-save.json');
  const saved = decodeSave(readFileSync('artifacts/production-v7-save.json', 'utf8'));
  assert.ok(saved.telemetry.foodEaten > 0);
  assert.ok(saved.player.genome.mutations.length > 0);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  const s = createGame('PRODUCTION-SOCIETY');
  s.lineage.points = 100;
  s.lineage.biomass = 500;
  s.player.age = 20;
  for (const id of [
    'light-eye',
    'associative-brain',
    'jointed-legs',
    'manipulating-digits',
    'vocal-language',
    'social-memory',
    'air-lungs',
  ])
    assert.ok(applyMutation(s, id).ok);
  for (let i = 0; i < 2; i++) {
    s.player.energy = 150;
    s.player.reproductionCooldown = 0;
    assert.ok(reproduce(s).ok);
  }
  for (const m of MATERIALS) s.society.stock[m] = 250;
  s.society.knowledge = 1000;
  s.society.technologies = TECHNOLOGIES.map((t) => t.id);
  assert.ok(foundSettlement(s, 'Starlight Haven').ok);
  s.society.settlements[0].buildings.launchpad = 1;
  await page.locator('#import-file').setInputFiles({
    name: 'society.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await page.locator('.navigation [data-value="society"]').click();
  await page.getByRole('button', { name: 'Space exploration & frontier research' }).click();
  await page.locator('[data-action="space-launch"][data-value^="survey:"]').first().click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('.navigation [data-value="habitat"]').click();
  await page.locator('[data-action="begin"]').click();
  await page.locator('[data-action="speed"][data-value="4"]').click();
  await page.waitForTimeout(8500);
  await page.keyboard.press('p');
  await page.locator('.navigation [data-value="society"]').click();
  await page.getByRole('button', { name: 'Space exploration & frontier research' }).click();
  assert.ok((await page.getByText('SURVEYED', { exact: false }).count()) > 0);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  for (const [width, height] of [
    [1440, 1000],
    [768, 1024],
    [390, 664],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator('.navigation [data-value="creature"]').click();
    await page.locator('#body-placement-preview').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/production-${width}-editor.png`, fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.navigation [data-value="society"]').click();
    await page.getByRole('button', { name: 'Space exploration & frontier research' }).click();
    await page.screenshot({ path: `artifacts/production-${width}-space.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Close dialog' }).click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.navigation [data-value="habitat"]').click();
  await page.locator('#pause-button').click();
  const timings = await page.evaluate<number[]>(
    'new Promise(resolve=>{const frames=[];let previous=performance.now();const step=(now)=>{frames.push(now-previous);previous=now;if(frames.length===120)resolve(frames);else requestAnimationFrame(step);};requestAnimationFrame(step);})',
  );
  timings.shift();
  timings.sort((a, b) => a - b);
  const result = {
    productionSmoke: 'passed',
    errors,
    externalRequests: external,
    viewports: 4,
    frameMedian: timings[Math.floor(timings.length * 0.5)],
    frameP95: timings[Math.floor(timings.length * 0.95)],
    saveVersion: saved.schemaVersion,
  };
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  writeFileSync('artifacts/production-results.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
