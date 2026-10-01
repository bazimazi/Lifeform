import type { RngStreams } from './types';

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function streams(seed: string): RngStreams {
  return Object.fromEntries(
    ['world', 'species', 'mutation', 'event', 'simulation'].map((key) => [
      key,
      hash(`${seed}:${key}`),
    ]),
  ) as unknown as RngStreams;
}
export function random(rng: RngStreams, stream: keyof RngStreams): number {
  const n = (rng[stream] = (rng[stream] + 0x6d2b79f5) >>> 0);
  let t = Math.imul(n ^ (n >>> 15), n | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
