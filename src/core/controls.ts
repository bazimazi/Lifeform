export const DEFAULT_KEYS = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
  action: ' ',
  sprint: 'shift',
  pause: 'p',
  reproduce: 'r',
};
export type KeyBindings = typeof DEFAULT_KEYS;
export function validBindings(value: unknown): value is KeyBindings {
  if (!value || typeof value !== 'object') return false;
  const keys = value as KeyBindings;
  const values = Object.keys(DEFAULT_KEYS).map((k) => keys[k as keyof KeyBindings]);
  return (
    values.every(
      (v) =>
        typeof v === 'string' &&
        (/^[a-z0-9 ]$/.test(v) ||
          ['shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(v)),
    ) && new Set(values).size === values.length
  );
}
