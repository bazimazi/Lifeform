import type { Genome } from '../core/types';
import { phenotype } from './body';
export function archetypes(g: Genome): string[] {
  const s = phenotype(g);
  const options: [string, boolean][] = [
    ['The Flyer', s.flight > 0],
    ['The Deep-Sea Creature', s.pressureTolerance >= 2],
    ['The Colony', s.communication >= 25],
    ['The Parasite', g.traits?.includes('parasitic') ?? false],
    ['The Swarm', s.offspringCount >= 2],
    ['The Giant', s.mass >= 14],
    ['The Tank', s.defense >= 5],
    ['The Poisoner', s.venom >= 4],
    ['The Speedster', s.speed >= 160],
    ['The Hunter', s.attack >= 14],
    ['The Scavenger', g.traits?.includes('scavenging') ?? false],
    ['The Survivor', s.immunity >= 0.5],
  ];
  return options
    .filter(([, v]) => v)
    .map(([name]) => name)
    .slice(0, 3);
}
