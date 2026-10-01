import './style.css';
import { createGame } from './world/generation';
import { Simulation, emptyInput } from './simulation/ecosystem';
import { phenotype } from './biology/body';
import { applyMutation, removeMutation } from './biology/mutation';
import {
  reproduce,
  reproductionReason,
  inheritControl,
  lineagePopulation,
} from './biology/reproduction';
import { saveGame, loadGame, encodeSave, decodeSave } from './core/save';
import { debugCommand } from './core/debug';
import { legacyRecord } from './core/history';
import { TUNING, PRESSURES, SPECIES } from './data/content';
import type { GameState, ActionResult, Settings } from './core/types';
import { WorldRenderer } from './presentation/world';
import { drawPreview } from './presentation/creature';
import { AudioFeedback } from './presentation/audio';
import { icon, escapeHtml as esc } from './presentation/icons';
import * as ui from './presentation/ui';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = ui.shell();
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let storage: Storage | null = null;
try {
  storage = window.localStorage;
} catch {
  /* export remains available */
}
const loaded = storage
  ? loadGame(storage)
  : {
      state: null,
      warning: 'Browser storage is unavailable. Export a save to keep your progress.',
    };
let sim = new Simulation(loaded.state ?? createGame());
const renderer = new WorldRenderer(get<HTMLCanvasElement>('world'), sim.state);
const audio = new AudioFeedback();
const input = emptyInput();
const dialog = get<HTMLDialogElement>('dialog');
const keys = new Set<string>();
let started = false,
  paused = false,
  speed = 1,
  view = 'habitat',
  stageVisible = true;
let saveProtected = !!loaded.warning && !loaded.state;
let toastTimeout = 0,
  lastPanels = '',
  lastEventId = 0,
  lastFood = 0,
  lastDeath = 0;
let previousFrame = performance.now(),
  accumulator = 0,
  uiElapsed = 0,
  autosaveElapsed = 0;
let extinctionShown = sim.state.lineage.extinct;
let lastStepMs = 0,
  maxStepMs = 0;

function running() {
  return (
    started &&
    !paused &&
    view === 'habitat' &&
    stageVisible &&
    !dialog.open &&
    !document.hidden &&
    !sim.state.lineage.extinct
  );
}
function notify(message: string, error = false) {
  const toast = get('toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.hidden = false;
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => (toast.hidden = true), error ? 9000 : 5000);
}
function showDialog(html: string) {
  dialog.innerHTML = html;
  if (!dialog.open) dialog.showModal();
  clearControls();
  // Updating an open dialog should also place keyboard focus inside its new content.
  dialog.querySelector<HTMLButtonElement>('button')?.focus();
}
function result(action: ActionResult, sound?: 'mutation' | 'birth') {
  notify(action.message, !action.ok);
  if (action.ok) {
    if (sound && sim.state.settings.sound) audio.play(sound);
    sim.refresh();
    refreshPanels(true);
    save();
  }
}
function save() {
  if (saveProtected) {
    notify(
      'The unreadable save is protected. Export this world, or start a new lineage explicitly before replacing it.',
      true,
    );
    return;
  }
  if (!storage) {
    notify('Browser storage is unavailable. Export a save file to keep your progress.', true);
    return;
  }
  const saved = saveGame(sim.state, storage);
  get('save-status').textContent = saved.ok ? 'Lineage saved' : 'Save unavailable';
  if (!saved.ok) notify(saved.message, true);
}
function clearControls() {
  keys.clear();
  input.x = 0;
  input.y = 0;
  input.action = false;
  input.sprint = false;
  input.target = null;
  renderer.target = null;
  stickX = 0;
  stickY = 0;
  touchAction = false;
  touchSprint = false;
  (get('joystick').firstElementChild as HTMLElement).style.transform = '';
}
function setView(next: string) {
  if (!['habitat', 'creature', 'lineage', 'discovery'].includes(next)) return;
  view = next;
  clearControls();
  if (dialog.open) dialog.close();
  get('habitat-panel').hidden = view !== 'habitat';
  get('secondary-panel').hidden = view === 'habitat';
  document.querySelectorAll<HTMLButtonElement>('.nav-button').forEach((b) => {
    b.classList.toggle('active', b.dataset.value === view);
    b.setAttribute('aria-current', b.dataset.value === view ? 'page' : 'false');
  });
  refreshPanels(true);
}
function refreshPanels(force = false) {
  const s = sim.state;
  const key = `${s.player.id}:${s.player.genome.mutations.join(',')}:${s.lineage.points}:${Math.floor(s.lineage.biomass)}:${s.history.at(-1)?.id}:${view}`;
  if (!force && key === lastPanels) return;
  lastPanels = key;
  get('body-summary').innerHTML = ui.bodySummary(s.player.genome);
  get('mutation-cards').innerHTML = ui.suggestedMutations(s);
  if (view !== 'habitat')
    get('secondary-panel').innerHTML =
      view === 'creature'
        ? ui.creatureView(s)
        : view === 'lineage'
          ? ui.lineageView(s)
          : ui.discoveryView(s);
}
function updateHud() {
  const s = sim.state,
    p = s.player,
    stats = phenotype(p.genome);
  get('generation').textContent = `GEN ${String(p.generation).padStart(2, '0')}`;
  get('lineage-name').textContent = s.lineage.name;
  get('organism-subtitle').textContent =
    p.poison > 0
      ? `Venom ? ${Math.ceil(p.poison)}s remaining`
      : p.juvenile > 0
        ? 'A new life, still growing'
        : p.genome.mutations.length === 0
          ? 'A small beginning'
          : `${p.genome.mutations.length} choices made you`;
  get('health-value').textContent = `${Math.ceil(p.health)} / ${stats.health}`;
  get('energy-value').textContent = `${Math.ceil(p.energy)} / ${stats.energy}`;
  get('health-bar').style.width = `${Math.max(0, (p.health / stats.health) * 100)}%`;
  get('energy-bar').style.width = `${(p.energy / stats.energy) * 100}%`;
  get('mobile-health').style.width = `${Math.max(0, (p.health / stats.health) * 100)}%`;
  get('mobile-energy').style.width = `${(p.energy / stats.energy) * 100}%`;
  get('mobile-health-value').textContent = `${Math.ceil(p.health)}`;
  get('mobile-energy-value').textContent = `${Math.ceil(p.energy)}`;
  get('hunger-value').textContent =
    p.energy / stats.energy > 0.6
      ? 'Satiated'
      : p.energy / stats.energy > 0.25
        ? 'An appetite'
        : p.energy > 0
          ? 'Hungry · find food'
          : 'Starving';
  get('hunger-value').classList.toggle('danger-text', p.energy / stats.energy < 0.25);
  get('stamina-value').textContent = `${Math.ceil(p.stamina)}%`;
  get('mobile-stamina').style.width = `${p.stamina}%`;
  get('mobile-stamina-value').textContent = `${Math.ceil(p.stamina)}`;
  get('age-value').textContent =
    `${Math.floor(p.age)} seconds${p.juvenile > 0 ? ' · juvenile' : ''}`;
  get('population-value').textContent = `${lineagePopulation(s)}`;
  get('lineage-hint').textContent =
    lineagePopulation(s) > 1
      ? 'The future has a little company.'
      : 'One life. A thousand possibilities.';
  get('world-age').textContent = ui.timeLabel(s.time);
  get('mutation-points').textContent = `${s.lineage.points}`;
  get('biomass-value').textContent = `${Math.floor(s.lineage.biomass)}`;
  get('total-species').textContent = `${s.populations.filter((p) => p.count > 0).length} species`;
  get('seed-label').textContent = s.seed;
  get('latest-event').textContent = s.history.at(-1)?.title ?? 'A new beginning.';
  get('birth-cost').textContent =
    `${Math.ceil(TUNING.reproductionBiomass * stats.reproductionCost)} biomass`;
  const reason = reproductionReason(s);
  document.querySelectorAll<HTMLButtonElement>('[data-action="reproduce"]').forEach((button) => {
    button.classList.toggle('ready', !reason);
    button.title = reason ?? 'Create offspring that inherit your current body.';
  });
  get('pause-button').innerHTML = icon(running() ? 'pause' : 'play');
  get('pause-button').setAttribute('aria-label', running() ? 'Pause world' : 'Resume world');
  get('paused-badge').hidden = !started || running() || s.lineage.extinct;
  get('welcome').hidden = started || s.lineage.extinct;
  const pressure = PRESSURES.find((x) => x.id === s.pressure?.id);
  get('environment-badge').innerHTML =
    `${icon(pressure?.id === 'drought' ? 'drop' : 'sun')}<span>${pressure ? esc(pressure.name) : 'Gentle waters'}<small>${pressure ? `${Math.ceil(s.pressure!.remaining)}s · ${pressure.id === 'drought' ? 'Algae growth slowed' : 'Faster resource growth'}` : 'A good place to begin'}</small></span>`;
  get('environment-badge').classList.toggle('pressure', !!pressure);
  document.body.classList.toggle('large-text', s.settings.textScale);
  document.body.classList.toggle('left-handed', s.settings.leftHanded);
  document.body.classList.toggle('reduced-motion', s.settings.reducedMotion);
  document.body.dataset.control = s.settings.control;
  const fed = s.telemetry.foodEaten > 0,
    adapted = p.genome.mutations.length > 0,
    born = s.telemetry.births > 0;
  get('goal-food').classList.toggle('complete', fed);
  get('goal-adapt').classList.toggle('complete', adapted);
  get('goal-birth').classList.toggle('complete', born);
  get('objective-title').textContent = !fed
    ? 'Find your first meal.'
    : !adapted
      ? 'Choose a new possibility.'
      : !born
        ? 'Leave a new generation.'
        : 'See how far life can go.';
  get('objective-detail').textContent = !fed
    ? 'Swim toward the glowing algae. Every small discovery opens a new possibility.'
    : !adapted
      ? 'Use your mutation points. Preview a new organ, and feel the difference it makes.'
      : !born
        ? 'Gather 10 biomass, grow for 12 seconds, and reproduce. Protect your young as they grow.'
        : 'Discover all five neighbors, try another adaptation, and guide your offspring through the shallows.';
  refreshPanels();
  if ((s.history.at(-1)?.id ?? 0) > lastEventId) {
    const last = s.history.at(-1)!;
    if (started && ['inheritance', 'environment', 'opportunity'].includes(last.type))
      notify(last.title);
    lastEventId = s.history.at(-1)?.id ?? 0;
  }
  if (s.settings.sound && s.telemetry.foodEaten > lastFood) audio.play('food');
  if (s.settings.sound && s.telemetry.deaths > lastDeath) audio.play('death');
  lastFood = s.telemetry.foodEaten;
  lastDeath = s.telemetry.deaths;
  if (s.lineage.extinct && !extinctionShown) {
    extinctionShown = true;
    save();
    showDialog(ui.extinctionDialog(s));
  }
}

app.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-action]');
  if (!button || (button instanceof HTMLButtonElement && button.disabled)) return;
  event.preventDefault();
  const action = button.dataset.action,
    value = button.dataset.value ?? '';
  switch (action) {
    case 'begin':
      started = true;
      paused = false;
      get<HTMLCanvasElement>('world').focus({ preventScroll: true });
      break;
    case 'view':
      setView(value);
      break;
    case 'pause':
      if (!started) started = true;
      else paused = !paused;
      clearControls();
      break;
    case 'speed':
      speed = Number(value);
      document
        .querySelectorAll('.speed-button')
        .forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.value === value));
      break;
    case 'zoom-in':
      renderer.zoom = Math.min(1.6, renderer.zoom + 0.15);
      break;
    case 'zoom-out':
      renderer.zoom = Math.max(0.65, renderer.zoom - 0.15);
      break;
    case 'vision':
      renderer.showVision = !renderer.showVision;
      button.classList.toggle('active', renderer.showVision);
      break;
    case 'mutation-preview':
      showDialog(ui.mutationDialog(sim.state, value));
      break;
    case 'mutations':
      showDialog(ui.adaptationsDialog(sim.state));
      break;
    case 'mutate': {
      const change = applyMutation(sim.state, value);
      if (change.ok) dialog.close();
      result(change, 'mutation');
      break;
    }
    case 'remove-mutation':
      result(removeMutation(sim.state, value));
      break;
    case 'reproduce':
      result(reproduce(sim.state), 'birth');
      break;
    case 'inherit':
      result(inheritControl(sim.state, value));
      break;
    case 'help':
      showDialog(ui.helpDialog());
      break;
    case 'settings':
      showDialog(ui.settingsDialog(sim.state));
      break;
    case 'world-settings':
      showDialog(ui.worldSettingsDialog(sim.state));
      break;
    case 'close-dialog':
      dialog.close();
      break;
    case 'save':
      save();
      break;
    case 'export':
      exportSave();
      break;
    case 'import':
      get<HTMLInputElement>('import-file').click();
      break;
    case 'map':
      showDialog(
        ui.dialogFrame(
          'A world worth knowing.',
          `<p class="dialog-intro">${sim.state.world.visited.length} territories explored. The outlined area is your current view.</p><canvas id="large-map" class="large-map" width="720" height="540" aria-label="Explored world and known species"></canvas><div class="map-legend"><span><i style="background:#b8e998"></i>Your lineage</span>${SPECIES.filter(
            (s) => sim.state.discoveries.species.includes(s.id),
          )
            .map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`)
            .join('')}</div>`,
        ),
      );
      break;
    case 'debug':
      if (import.meta.env.DEV) showDebug();
      break;
    case 'debug-command':
      if (import.meta.env.DEV) {
        result(debugCommand(sim, value));
        showDebug();
      }
      break;
  }
  updateHud();
});
app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const key = target.dataset.setting as keyof Settings | undefined;
  if (!key) return;
  if (key === 'control' && ['hybrid', 'direct', 'touch'].includes(target.value))
    sim.state.settings.control = target.value as Settings['control'];
  else if (target instanceof HTMLInputElement && target.type === 'checkbox' && key !== 'control')
    sim.state.settings[key] = target.checked;
  updateHud();
  save();
});
app.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  if (form.id === 'new-world-form') {
    const seed = String(new FormData(form).get('seed') ?? '').trim();
    if (!seed) return;
    const old = sim.state,
      next = createGame(seed);
    next.legacies = structuredClone(old.legacies);
    if (!old.lineage.extinct) next.legacies.push(legacyRecord(old, 'Retired by the player'));
    next.lineage.legacy = old.lineage.legacy;
    next.discoveries = structuredClone(old.discoveries);
    next.settings = structuredClone(old.settings);
    replaceWorld(next);
    saveProtected = false;
    save();
    dialog.close();
    notify('A new beginning. Your earlier lineages remain in the archive.');
  } else if (form.id === 'debug-form' && import.meta.env.DEV) {
    result(debugCommand(sim, String(new FormData(form).get('command'))));
    showDebug();
  }
});
function replaceWorld(state: GameState) {
  sim = new Simulation(state);
  clearControls();
  started = false;
  paused = false;
  accumulator = 0;
  renderer.camera = { x: state.player.x, y: state.player.y };
  lastEventId = state.history.at(-1)?.id ?? 0;
  lastFood = state.telemetry.foodEaten;
  lastDeath = state.telemetry.deaths;
  extinctionShown = false;
  setView('habitat');
  refreshPanels(true);
  updateHud();
}
function exportSave() {
  try {
    const blob = new Blob([encodeSave(sim.state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = `lifeform-${sim.state.seed.replace(/[^a-z0-9-]/gi, '_')}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Your world has been exported.');
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not export this world.', true);
  }
}
get<HTMLInputElement>('import-file').addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 8_000_000) throw new Error('This save is too large to import.');
    const next = decodeSave(await file.text());
    // Validation completes before the current world is replaced.
    replaceWorld(next);
    saveProtected = false;
    save();
    notify('Your lineage has returned.');
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not import this save.', true);
  }
  input.value = '';
});
function showDebug() {
  if (!import.meta.env.DEV) return;
  const s = sim.state,
    metrics = sim.getMetrics();
  showDialog(
    ui.dialogFrame(
      'Simulation observatory',
      `<p class="dialog-intro">Local development tools. The world is paused. No telemetry leaves this browser.</p><div class="debug-metrics">${Object.entries(
        {
          ...metrics,
          'last step ms': lastStepMs.toFixed(2),
          'max step ms': maxStepMs.toFixed(2),
          'food eaten': s.telemetry.foodEaten,
          births: s.telemetry.births,
          deaths: s.telemetry.deaths,
          'longest life': Math.round(s.telemetry.lifespan),
          'mutation choices': Object.values(s.telemetry.mutations).reduce((a, b) => a + b, 0),
        },
      )
        .map(([k, v]) => `<span>${k}<b>${v}</b></span>`)
        .join(
          '',
        )}</div><div class="table-scroll"><table><thead><tr><th>Species</th><th>Pop.</th><th>Births</th><th>Deaths</th><th>Food</th><th>Fitness</th></tr></thead><tbody>${s.populations.map((p) => `<tr><td>${p.speciesId}</td><td>${p.count}</td><td>${p.births}</td><td>${p.deaths}</td><td>${p.food.toFixed(2)}</td><td>${p.fitness.toFixed(2)}</td></tr>`).join('')}</tbody></table></div><div class="button-row">${[
        ['drought', 'Drought'],
        ['bloom', 'Food bloom'],
        ['advance 30', '+30 seconds'],
        ['die', 'Test succession'],
      ]
        .map(
          ([cmd, label]) =>
            `<button class="secondary-button" data-action="debug-command" data-value="${cmd}">${label}</button>`,
        )
        .join(
          '',
        )}</div><form id="debug-form"><label class="field-label" for="debug-command">COMMAND</label><input name="command" id="debug-command" placeholder="/points 5" autocomplete="off" /><button class="primary-button" type="submit">Run command</button></form><p class="dialog-note">/energy N · /biomass N · /points N · /mutation ID · /reproduce · /drought · /bloom · /die · /advance seconds · /spawn ID · /population ID N</p><div class="button-row"><button class="text-button" data-action="vision">Toggle perception</button></div>`,
    ),
  );
}

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (!!target.closest('input, select, textarea') || target.isContentEditable);
window.addEventListener('keydown', (event) => {
  if (editable(event.target) || dialog.open) return;
  const key = event.key.toLowerCase();
  if (
    [
      ' ',
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'w',
      'a',
      's',
      'd',
      'shift',
      'p',
      'r',
    ].includes(key)
  )
    event.preventDefault();
  if (!event.repeat && key === 'p') {
    if (!started) started = true;
    else paused = !paused;
    clearControls();
    updateHud();
    return;
  }
  if (!event.repeat && key === 'r' && started) {
    result(reproduce(sim.state), 'birth');
    return;
  }
  keys.add(key);
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', clearControls);
document.addEventListener('visibilitychange', () => {
  clearControls();
  accumulator = 0;
  if (document.hidden && started && !saveProtected) save();
});
window.addEventListener('pagehide', () => {
  if (started && !saveProtected) save();
});
dialog.addEventListener('close', () => {
  clearControls();
  updateHud();
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  }
});
get<HTMLCanvasElement>('world').addEventListener('pointerdown', (event) => {
  if (!running()) return;
  input.target = renderer.screenToWorld(event.clientX, event.clientY);
  renderer.target = input.target;
  get<HTMLCanvasElement>('world').focus({ preventScroll: true });
});
let stickX = 0,
  stickY = 0,
  stickPointer: number | null = null,
  touchAction = false,
  touchSprint = false;
const joystick = get('joystick');
function moveStick(event: PointerEvent) {
  const rect = joystick.getBoundingClientRect(),
    dx = event.clientX - rect.left - rect.width / 2,
    dy = event.clientY - rect.top - rect.height / 2;
  const length = Math.max(1, Math.hypot(dx, dy) / 33);
  stickX = dx / length / 33;
  stickY = dy / length / 33;
  input.target = null;
  (joystick.firstElementChild as HTMLElement).style.transform =
    `translate(${stickX * 24}px, ${stickY * 24}px)`;
}
joystick.addEventListener('pointerdown', (event) => {
  stickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  moveStick(event);
});
joystick.addEventListener('pointermove', (event) => {
  if (stickPointer === event.pointerId) moveStick(event);
});
const releaseStick = () => {
  stickPointer = null;
  stickX = 0;
  stickY = 0;
  (joystick.firstElementChild as HTMLElement).style.transform = '';
};
joystick.addEventListener('pointerup', releaseStick);
joystick.addEventListener('pointercancel', releaseStick);
joystick.addEventListener('lostpointercapture', releaseStick);
for (const [id, setter] of [
  ['touch-action', (v: boolean) => (touchAction = v)],
  ['touch-sprint', (v: boolean) => (touchSprint = v)],
] as const) {
  const el = get(id);
  el.addEventListener('pointerdown', (event) => {
    el.setPointerCapture(event.pointerId);
    setter(true);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    el.addEventListener(type, () => setter(false));
}

function frame(now: number) {
  const dt = Math.min((now - previousFrame) / 1000, 0.1);
  previousFrame = now;
  if (running()) {
    input.x =
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
      (keys.has('a') || keys.has('arrowleft') ? 1 : 0) +
      stickX;
    input.y =
      (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
      (keys.has('w') || keys.has('arrowup') ? 1 : 0) +
      stickY;
    input.action = keys.has(' ') || touchAction;
    input.sprint = keys.has('shift') || touchSprint;
    if (input.x || input.y) input.target = null;
    accumulator = Math.min(accumulator + dt * speed, TUNING.step * 12);
    while (accumulator >= TUNING.step) {
      const before = performance.now();
      sim.step(input);
      lastStepMs = performance.now() - before;
      maxStepMs = Math.max(maxStepMs, lastStepMs);
      accumulator -= TUNING.step;
    }
    autosaveElapsed += dt;
    if (autosaveElapsed >= TUNING.autosaveInterval) {
      autosaveElapsed = 0;
      if (!saveProtected) save();
    }
  } else accumulator = 0;
  renderer.target = input.target;
  if (view === 'habitat') {
    renderer.draw(sim.state, sim.state.time, dt);
    renderer.drawMap(get<HTMLCanvasElement>('minimap'), sim.state);
  }
  const map = document.querySelector<HTMLCanvasElement>('#large-map');
  if (map) renderer.drawMap(map, sim.state, true);
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-preview]').forEach((canvas) => {
    if (canvas.clientWidth > 0)
      drawPreview(
        canvas,
        ui.previewGenome(sim.state, canvas.dataset.preview!),
        sim.state.settings.reducedMotion ? 0 : sim.state.time,
      );
  });
  uiElapsed += dt;
  if (uiElapsed >= 0.2) {
    uiElapsed = 0;
    updateHud();
  }
  requestAnimationFrame(frame);
}
if (loaded.state)
  get('welcome').innerHTML =
    `<span class="eyebrow">YOUR STORY CONTINUES</span><h3>Welcome back to the shallows.</h3><p>Your world waited for you. Generation ${sim.state.player.generation} is ready.</p><button class="primary-button" data-action="begin">Continue your lineage ${icon('arrow')}</button>`;
if (!loaded.state && matchMedia('(prefers-reduced-motion: reduce)').matches)
  sim.state.settings.reducedMotion = true;
new IntersectionObserver(
  (entries) => {
    stageVisible = entries[0].isIntersecting;
    if (!stageVisible) clearControls();
  },
  { threshold: 0.15 },
).observe(get('world-stage'));
refreshPanels(true);
updateHud();
if (loaded.warning) notify(loaded.warning, true);
if (sim.state.lineage.extinct) showDialog(ui.extinctionDialog(sim.state));
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  // Read-only snapshots plus explicit commands support local balancing and browser regression tests.
  Object.defineProperty(window, 'lifeform', {
    value: {
      snapshot: () => structuredClone(sim.state),
      command: (command: string) => {
        const response = debugCommand(sim, command);
        sim.refresh();
        refreshPanels(true);
        updateHud();
        return response;
      },
      metrics: () => ({ ...sim.getMetrics(), lastStepMs, maxStepMs }),
    },
    configurable: true,
  });
}
