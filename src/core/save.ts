import type { Creature, GameState, Genome } from './types';
import { createGame } from '../world/generation';
import { validateBody } from '../biology/body';
import { mutationById, resourceById, speciesById, TUNING } from '../data/content';

export const SAVE_KEY = 'lifeform.save';
export const BACKUP_KEY = 'lifeform.save.backup';
export const SAVE_VERSION = 3;
const MAX_SAVE_BYTES = 8_000_000;
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min = 0): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min;
const string = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 4000;
const list = (value: unknown, max = 100000): value is unknown[] =>
  Array.isArray(value) && value.length <= max;
const strings = (value: unknown): value is string[] => list(value) && value.every(string);
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid save: ${message}`);
}
function genome(value: unknown): asserts value is Genome {
  assert(object(value) && strings(value.organs) && strings(value.mutations), 'genome data');
  assert(!validateBody(value as unknown as Genome), 'body configuration');
}
function position(value: ObjectValue, state: ObjectValue) {
  const world = state.world as ObjectValue;
  assert(
    number(value.x) &&
      number(value.y) &&
      value.x <= (world.width as number) &&
      value.y <= (world.height as number),
    'world position',
  );
}
function entity(value: unknown, state: ObjectValue): asserts value is Creature {
  assert(object(value), 'creature');
  assert(
    string(value.id) &&
      string(value.speciesId) &&
      (value.speciesId === 'player' || !!speciesById[value.speciesId]),
    'species reference',
  );
  genome(value.genome);
  position(value, state);
  for (const key of [
    'generation',
    'health',
    'energy',
    'stamina',
    'age',
    'attackCooldown',
    'reproductionCooldown',
    'poison',
    'juvenile',
    'aiTimer',
  ])
    assert(number(value[key], key === 'aiTimer' ? -1 : 0), `creature ${key}`);
  assert(
    number(value.angle, -Math.PI * 2) &&
      object(value.intent) &&
      number(value.intent.x, -100000) &&
      number(value.intent.y, -100000) &&
      string(value.behavior),
    'creature movement',
  );
}
export function migrateSave(data: unknown): unknown {
  assert(object(data), 'save object');
  if (data.schemaVersion === 1) {
    // v1 used the same simulation records, without accessibility, telemetry, or legacies.
    const next = structuredClone(data);
    const defaults = createGame(typeof next.seed === 'string' ? next.seed : 'FIRST-LIGHT');
    next.schemaVersion = 2;
    next.settings = { ...defaults.settings, ...(object(next.settings) ? next.settings : {}) };
    next.telemetry = { ...defaults.telemetry, ...(object(next.telemetry) ? next.telemetry : {}) };
    next.legacies = next.legacies ?? [];
    const entities = [next.player, ...(list(next.creatures) ? next.creatures : [])];
    for (const c of entities) if (object(c)) c.stamina = c.stamina ?? 100;
    return migrateSave(next);
  }
  if (data.schemaVersion === 2) {
    const next = structuredClone(data);
    next.schemaVersion = 3;
    if (list(next.legacies))
      for (const legacy of next.legacies) {
        if (object(legacy)) {
          legacy.archive ??= [];
          legacy.history ??= [];
        }
      }
    return next;
  }
  assert(
    data.schemaVersion === SAVE_VERSION,
    (data.schemaVersion as number) > SAVE_VERSION
      ? 'this save needs a newer version of Lifeform'
      : 'unsupported schema version',
  );
  return data;
}
export function validateSave(data: unknown): asserts data is GameState {
  assert(
    object(data) && data.schemaVersion === SAVE_VERSION && string(data.seed),
    'version or seed',
  );
  for (const key of ['time', 'tick', 'nextId', 'nextEventAt']) assert(number(data[key]), key);
  assert(
    Number.isInteger(data.tick) &&
      Math.abs((data.time as number) - (data.tick as number) * TUNING.step) < 0.001,
    'simulation clock',
  );
  assert(
    object(data.rng) &&
      ['world', 'species', 'mutation', 'event', 'simulation'].every((k) =>
        number((data.rng as ObjectValue)[k]),
      ),
    'random streams',
  );
  assert(
    object(data.world) &&
      number(data.world.width, 100) &&
      number(data.world.height, 100) &&
      data.world.width <= 10000 &&
      data.world.height <= 10000 &&
      string(data.world.biome) &&
      strings(data.world.visited) &&
      list(data.world.features, 1000),
    'world',
  );
  for (const f of data.world.features) {
    assert(
      object(f) &&
        ['rock', 'reed', 'patch'].includes(f.kind as string) &&
        number(f.size) &&
        number(f.angle, -10),
      'terrain feature',
    );
    position(f, data);
  }
  entity(data.player, data);
  assert(data.player.speciesId === 'player', 'controlled species');
  assert(list(data.creatures, 500), 'creature cohort');
  for (const c of data.creatures) entity(c, data);
  assert(
    new Set([data.player.id, ...(data.creatures as Creature[]).map((c) => c.id)]).size ===
      data.creatures.length + 1,
    'duplicate creature IDs',
  );
  assert(list(data.resources, 1000), 'resource pool');
  for (const r of data.resources) {
    assert(
      object(r) &&
        number(r.id) &&
        string(r.type) &&
        !!resourceById[r.type] &&
        typeof r.active === 'boolean' &&
        number(r.regrowAt),
      'resource',
    );
    position(r, data);
  }
  assert(
    new Set(data.resources.map((r) => (r as ObjectValue).id)).size === data.resources.length,
    'duplicate resource IDs',
  );
  assert(list(data.populations, 5) && data.populations.length === 5, 'populations');
  for (const p of data.populations) {
    assert(
      object(p) && string(p.speciesId) && !!speciesById[p.speciesId] && string(p.cause),
      'population reference',
    );
    for (const k of ['count', 'births', 'deaths', 'food', 'fitness'])
      assert(number(p[k]), `population ${k}`);
    assert(
      Number.isInteger(p.count) &&
        (p.count as number) >=
          (data.creatures as Creature[]).filter((c) => c.speciesId === p.speciesId).length,
      'population conservation',
    );
  }
  assert(
    new Set(data.populations.map((p) => (p as ObjectValue).speciesId)).size === 5,
    'duplicate populations',
  );
  assert(
    object(data.lineage) &&
      string(data.lineage.name) &&
      typeof data.lineage.extinct === 'boolean' &&
      list(data.lineage.archive),
    'lineage',
  );
  for (const k of ['points', 'biomass', 'peak', 'legacy'])
    assert(number(data.lineage[k]), `lineage ${k}`);
  for (const a of data.lineage.archive) {
    assert(
      object(a) &&
        string(a.id) &&
        number(a.generation, 1) &&
        number(a.born) &&
        (a.died === null || number(a.died)) &&
        (a.cause === null || string(a.cause)) &&
        (a.parent === null || string(a.parent)),
      'ancestor',
    );
    genome(a.genome);
  }
  const archive = data.lineage.archive as ObjectValue[];
  assert(new Set(archive.map((a) => a.id)).size === archive.length, 'duplicate ancestors');
  assert(
    archive.every((a) => a.parent === null || archive.some((p) => p.id === a.parent)),
    'ancestor parent',
  );
  const livingIds = [data.player, ...(data.creatures as Creature[])]
    .filter((c) => c.speciesId === 'player' && c.health > 0)
    .map((c) => c.id);
  assert(
    archive.filter((a) => a.died === null).length === livingIds.length &&
      livingIds.every((id) => archive.some((a) => a.id === id && a.died === null)),
    'living lineage records',
  );
  assert(data.lineage.extinct === (livingIds.length === 0), 'extinction state');
  assert(list(data.history, TUNING.historyLimit), 'history');
  for (const h of data.history)
    assert(
      object(h) &&
        number(h.id) &&
        number(h.time) &&
        number(h.generation, 1) &&
        string(h.title) &&
        string(h.type) &&
        string(h.detail),
      'historical event',
    );
  const largestGeneratedId = Math.max(
    0,
    ...data.resources.map((r) => (r as ObjectValue).id as number),
    ...data.history.map((h) => (h as ObjectValue).id as number),
  );
  assert(
    Number.isInteger(data.nextId) && (data.nextId as number) > largestGeneratedId,
    'unique ID sequence',
  );
  assert(
    object(data.discoveries) &&
      strings(data.discoveries.species) &&
      data.discoveries.species.every((x) => !!speciesById[x]) &&
      strings(data.discoveries.resources) &&
      data.discoveries.resources.every((x) => !!resourceById[x]) &&
      strings(data.discoveries.mutations) &&
      data.discoveries.mutations.every((x) => !!mutationById[x]),
    'discoveries',
  );
  assert(
    data.pressure === null ||
      (object(data.pressure) &&
        ['drought', 'bloom'].includes(data.pressure.id as string) &&
        number(data.pressure.remaining)),
    'environmental pressure',
  );
  assert(
    object(data.settings) &&
      ['reducedMotion', 'particles', 'sound', 'textScale', 'leftHanded'].every(
        (k) => typeof (data.settings as ObjectValue)[k] === 'boolean',
      ) &&
      ['hybrid', 'direct', 'touch'].includes(data.settings.control as string),
    'settings',
  );
  assert(
    object(data.telemetry) &&
      object(data.telemetry.mutations) &&
      Object.entries(data.telemetry.mutations).every(([k, v]) => !!mutationById[k] && number(v)),
    'telemetry',
  );
  for (const k of [
    'foodEaten',
    'hunts',
    'births',
    'deaths',
    'distance',
    'lifespan',
    'mutationRejected',
  ])
    assert(number(data.telemetry[k]), `telemetry ${k}`);
  assert(list(data.legacies), 'legacy archive');
  for (const l of data.legacies) {
    assert(
      object(l) &&
        string(l.name) &&
        string(l.seed) &&
        string(l.cause) &&
        number(l.duration) &&
        number(l.peak) &&
        strings(l.adaptations) &&
        l.adaptations.every((x) => !!mutationById[x]) &&
        list(l.archive) &&
        list(l.history, TUNING.historyLimit),
      'legacy record',
    );
    for (const a of l.archive) {
      assert(
        object(a) &&
          string(a.id) &&
          number(a.generation, 1) &&
          number(a.born) &&
          (a.died === null || number(a.died)) &&
          (a.cause === null || string(a.cause)) &&
          (a.parent === null || string(a.parent)),
        'legacy ancestor',
      );
      genome(a.genome);
    }
    for (const h of l.history)
      assert(
        object(h) &&
          number(h.id) &&
          number(h.time) &&
          number(h.generation, 1) &&
          string(h.title) &&
          string(h.type) &&
          string(h.detail),
        'legacy historical event',
      );
  }
}
export function decodeSave(text: string): GameState {
  if (text.length > MAX_SAVE_BYTES) throw new Error('This save is too large to load.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not a valid JSON save.');
  }
  const migrated = migrateSave(raw);
  validateSave(migrated);
  return migrated;
}
export function encodeSave(state: GameState): string {
  validateSave(state);
  const encoded = JSON.stringify(state);
  if (encoded.length > MAX_SAVE_BYTES)
    throw new Error('The lineage archive exceeds this prototype’s 8 MB save limit.');
  return encoded;
}
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function saveGame(state: GameState, storage: StorageAdapter): ActionSave {
  try {
    const encoded = encodeSave(state);
    const previous = storage.getItem(SAVE_KEY);
    // Preserve only a known-good previous save as the recovery copy.
    if (previous) {
      try {
        decodeSave(previous);
        storage.setItem(BACKUP_KEY, previous);
      } catch {
        /* leave the last good backup intact */
      }
    }
    storage.setItem(SAVE_KEY, encoded);
    return { ok: true, message: 'Lineage saved.' };
  } catch (error) {
    return {
      ok: false,
      message: `Could not save your lineage. ${error instanceof Error ? error.message : 'Storage unavailable.'} Export a save file to keep your progress.`,
    };
  }
}
type ActionSave = { ok: boolean; message: string };
export function loadGame(storage: StorageAdapter): {
  state: GameState | null;
  warning: string | null;
} {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { state: null, warning: null };
    try {
      return { state: decodeSave(raw), warning: null };
    } catch (error) {
      const backup = storage.getItem(BACKUP_KEY);
      if (backup) {
        try {
          return {
            state: decodeSave(backup),
            warning: 'The latest save was damaged. Your previous save has been recovered.',
          };
        } catch {
          /* report failure below */
        }
      }
      return {
        state: null,
        warning: `Your saved lineage could not be loaded. ${error instanceof Error ? error.message : ''} The original save is still in storage.`,
      };
    }
  } catch {
    return {
      state: null,
      warning: 'Browser storage is unavailable. Export a save file to keep your progress.',
    };
  }
}
