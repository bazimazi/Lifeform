import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/core/types';
import { createGame } from '../../src/world/generation';
import { applyMutation } from '../../src/biology/mutation';
import { reproduce } from '../../src/biology/reproduction';
import { foundSettlement } from '../../src/society/society';
import { TECHNOLOGIES } from '../../src/data/society';
import { MATERIALS } from '../../src/society/types';

const snapshot = (page: Page): Promise<GameState> =>
  page.evaluate(() => (window as any).lifeform.snapshot());
const command = (page: Page, text: string) =>
  page.evaluate((value) => (window as any).lifeform.command(value), text);

test('adaptation search and all eleven diagnostic layers are usable', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.all-adaptations').click();
  await page.locator('#mutation-search').fill('Remember, then imagine');
  await expect(page.locator('.mutation-gallery .mutation-card:visible')).toHaveCount(1);
  await page.locator('#mutation-search').fill('');
  await expect(page.locator('.mutation-gallery .mutation-card:visible')).toHaveCount(50);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('[data-action="debug"]').click();
  const values = await page
    .locator('[data-action="debug-layer"]')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.value!));
  expect(values).toHaveLength(11);
  for (const value of values) {
    const control = page.locator(`[data-action="debug-layer"][data-value="${value}"]`);
    await control.click();
    await expect(control).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('[data-action="begin"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-diagnostics.png` });
  expect(errors).toEqual([]);
});

test('organ placement, behavioral choices, key remapping and challenge starts persist', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await command(page, '/points 20');
  await command(page, '/biomass 100');
  await page.locator('.navigation').getByRole('button', { name: 'Creature', exact: true }).click();
  const canvas = page.locator('#body-placement-preview');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65);
  await page.mouse.up();
  expect((await snapshot(page)).player.genome.appearance!.placements.cilia.x).toBeGreaterThan(0);
  await page.locator('[data-action="trait-adopt"][data-value="migratory"]').click();
  expect((await snapshot(page)).player.genome.traits).toContain('migratory');
  await page.locator('[data-action="variation-adopt"]').first().click();
  expect((await snapshot(page)).player.genome.variations).toHaveLength(1);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-editor.png`, fullPage: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#keybindings-form input[name="up"]').fill('i');
  await page.getByRole('button', { name: 'Save keyboard controls' }).click();
  expect((await snapshot(page)).settings.keys!.up).toBe('i');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('.navigation').getByRole('button', { name: 'Habitat', exact: true }).click();
  await page.getByRole('button', { name: 'Begin your lineage' }).click();
  const y = (await snapshot(page)).player.y;
  await page.keyboard.down('i');
  await expect.poll(async () => (await snapshot(page)).player.y).toBeLessThan(y - 15);
  await page.keyboard.up('i');
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /World seed/ }).click();
  await page.locator('#world-challenge').selectOption('tiny');
  await page.getByRole('button', { name: 'Start a new lineage' }).click();
  expect((await snapshot(page)).world.width).toBe(1200);
  expect((await snapshot(page)).settings.keys!.up).toBe('i');
  await page.reload();
  expect((await snapshot(page)).evolution.challenge).toBe('tiny');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('society controls craft, construct, assign work and launch an expedition', async ({
  page,
}, testInfo) => {
  const s = createGame('UI-SOCIETY');
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
    expect(applyMutation(s, id).ok).toBeTruthy();
  for (let i = 0; i < 2; i++) {
    s.player.energy = 150;
    s.player.reproductionCooldown = 0;
    expect(reproduce(s).ok).toBeTruthy();
  }
  for (const m of MATERIALS) s.society.stock[m] = 250;
  s.society.knowledge = 1000;
  s.society.technologies = TECHNOLOGIES.map((t) => t.id);
  expect(foundSettlement(s, 'First Haven').ok).toBeTruthy();
  s.society.settlements[0].buildings.launchpad = 1;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('#import-file').setInputFiles({
    name: 'society.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await page.locator('.navigation').getByRole('button', { name: 'Society', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Life learns to build.' })).toBeVisible();
  await page.getByRole('button', { name: 'Craft tools', exact: true }).click();
  await page
    .locator('.town-card')
    .filter({ has: page.getByRole('heading', { name: 'Stone axe', exact: true }) })
    .getByRole('button', { name: 'Craft', exact: true })
    .click();
  expect((await snapshot(page)).society.tools[0].id).toBe('stone-axe');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Remove gatherer', exact: true }).click();
  await page.getByRole('button', { name: 'Assign engineer', exact: true }).click();
  expect((await snapshot(page)).society.settlements[0].jobs.engineer).toBe(1);
  await page.getByRole('button', { name: 'Construct', exact: true }).click();
  await page
    .locator('.town-card')
    .filter({ has: page.getByRole('heading', { name: 'Waterworks', exact: true }) })
    .getByRole('button', { name: 'Build', exact: true })
    .click();
  await command(page, '/advance 30');
  expect((await snapshot(page)).society.settlements[0].buildings.well).toBe(1);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-society.png`, fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Space exploration & frontier research' }).click();
  await page.locator('[data-action="space-launch"][data-value^="survey:"]').first().click();
  expect((await snapshot(page)).space.missions).toHaveLength(1);
  await command(page, '/advance 30');
  expect((await snapshot(page)).space.planets[0].surveyed).toBeTruthy();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Space exploration & frontier research' }).click();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-space.png`, fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test('habitat renders, fits the viewport, and moves with pointer and keyboard', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The first spark' })).toBeVisible();
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
  baseURL,
}, testInfo) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url());
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
    await expect(page.getByRole('heading', { name: 'Choose your next adaptation' })).toBeVisible();
  } else {
    await page.keyboard.down('w');
    await expect.poll(async () => (await snapshot(page)).player.y).toBeLessThan(before.y - 15);
    await page.keyboard.up('w');
  }
  expect(external).toEqual([]);
});

test('preview and install a mutation, reproduce, grow, and inherit', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="choose-adaptation"]:visible').first().click();
  await page.getByRole('button', { name: /A new way to see/ }).click();
  await expect(page.getByRole('dialog')).toContainText('130');
  await page.getByRole('button', { name: 'Adapt · 1 point + 4 biomass' }).click();
  expect((await snapshot(page)).player.genome.organs).toContain('eye');
  await command(page, '/biomass 30');
  await command(page, '/advance 13');
  await page.locator('[data-action="reproduce"]:visible').first().click();
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
  await page.getByRole('button', { name: 'Begin your lineage' }).click();
  await page.getByRole('button', { name: 'Open explored world map', exact: true }).click();
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

test('guided quests lead from food to an adaptation and a saved new generation', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#objective-title')).toHaveText('Find your first meal');
  await expect(page.locator('.quick-adaptations')).not.toHaveAttribute('open', '');
  const questBounds = (await page.locator('#quest-action').boundingBox())!;
  expect(questBounds.y + questBounds.height).toBeLessThan(testInfo.project.use.viewport!.height);
  await page.locator('#quest-action').click();
  await expect.poll(async () => (await snapshot(page)).telemetry.foodEaten).toBeGreaterThan(0);
  await expect(page.locator('#objective-title')).toHaveText('Evolve your creature');
  await page.locator('#quest-action').click();
  await expect(page.locator('.recommended-adaptations .mutation-card')).toHaveCount(3);
  await page.locator('.recommended-adaptations [data-value="light-eye"]').click();
  await page.locator('[data-action="mutate"]').click();
  await expect(page.locator('#objective-title')).toHaveText('Start a new generation');
  await page.keyboard.press('p');
  // Isolate quest readiness from random wildlife encounters during fast-forward.
  for (const population of (await snapshot(page)).populations)
    await command(page, `/population ${population.speciesId} 0`);
  await command(page, '/biomass 40');
  await command(page, '/energy 100');
  await command(page, '/advance 13');
  await expect(page.locator('#objective-detail')).toHaveText(
    'You are ready. Create offspring to keep your lineage alive.',
  );
  await expect(page.locator('#quest-action')).toContainText('Reproduce now');
  await page.locator('#quest-action').click();
  await expect(page.locator('.objective-steps .complete')).toHaveCount(3);
  await expect(page.locator('#objective-title')).toHaveText('Beyond the shallows');
  await page.reload();
  await expect(page.locator('#objective-title')).toHaveText('Beyond the shallows');
  await expect(page.locator('.objective-steps .complete')).toHaveCount(3);
});

test('connected mutation routes preview habitats and purchase prerequisites without spending on inspection', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const before = await snapshot(page);
  await page.locator('.all-adaptations').click();
  await page.getByRole('button', { name: 'Explore the evolution tree' }).click();
  await page.locator('#evolution-goal').selectOption('vocal-language');
  await expect(page.locator('.graph-node')).toHaveCount(3);
  await expect(page.locator('.evolution-graph > svg > path')).toHaveCount(2);
  expect((await snapshot(page)).lineage.points).toBe(before.lineage.points);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-mutation-tree.png` });
  await page.locator('.graph-node[data-value="light-eye"]').click();
  await expect(page.locator('.forecast-grid article')).toHaveCount(6);
  await page.getByText('Habitat suitability & body analysis', { exact: true }).click();
  await expect(page.getByText('Base energy use:', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to evolution tree' }).click();
  await expect(page.locator('#evolution-goal')).toHaveValue('vocal-language');
  await page.locator('.graph-node[data-value="light-eye"]').click();
  await page.locator('[data-action="mutate"]').click();
  expect((await snapshot(page)).player.genome.mutations).toContain('light-eye');
  await page.locator('.all-adaptations').click();
  await page.getByRole('button', { name: 'Explore the evolution tree' }).click();
  await expect(page.locator('.graph-node[data-value="light-eye"]')).toHaveClass(/complete/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('connected species branches preserve their founding bodies and expose recovered fossil sites', async ({
  page,
}, testInfo) => {
  const s = createGame('UI-SPECIES-TREE');
  const root = s.evolution.branches[0];
  const branch = {
    ...structuredClone(root),
    id: 'branch-dead',
    name: 'Velari ancient',
    parentId: root.id,
    generation: 2,
    members: [],
    extinct: true,
    extinctionCause: 'Winter exposure',
  };
  s.evolution.branches.push(branch);
  s.evolution.fossils.push({
    id: 'fossil-ui',
    name: branch.name,
    branchId: branch.id,
    adaptations: [],
    age: 0,
    x: s.player.x + 30,
    y: s.player.y,
    discovered: true,
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('#import-file').setInputFiles({
    name: 'branches.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await page.locator('.navigation').getByRole('button', { name: 'Lineage', exact: true }).click();
  await page.getByRole('button', { name: 'Explore the species tree' }).click();
  await expect(page.locator('.graph-node')).toHaveCount(2);
  await expect(page.locator('.evolution-graph > svg > path')).toHaveCount(1);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-species-tree.png` });
  await page.locator('.graph-node[data-value="branch-dead"]').click();
  await expect(page.getByText('Extinction cause: Winter exposure')).toBeVisible();
  await expect(page.locator('[data-preview="branch:branch-dead"]')).toBeVisible();
  await page.getByRole('button', { name: 'Back to species tree' }).click();
  await page.getByRole('button', { name: 'Return to fossil site' }).click();
  await expect(page.locator('#habitat-panel')).toBeVisible();
  await expect(page.locator('#dialog')).not.toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
