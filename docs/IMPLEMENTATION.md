# Full-plan implementation ledger

The delivered commit `ea37dc9` completed a first biological vertical slice. It did **not** complete the full product brief. This ledger tracks the expanded request to continue through the remaining plan.

Completion means working simulation behavior, usable UI, persisted state and migrations, automated verification, and documentation. A catalog entry or a locked button alone does not count as an implemented system. Human judgments such as “fun for twenty minutes” remain playtest findings, not facts established by code tests.

| Milestone                                                    | Brief sections         | Status at expansion start                                    |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------ |
| Deterministic foundation, clock, storage, tests, debug tools | 62–72, 75, 113–120     | Working foundation; expand alongside systems                 |
| Modular organism and readable phenotype                      | 6–11, 25, 51–59, 76    | Partial: ten organs; advanced traversal/editor missing       |
| Resources, food web, utility AI, population fidelity         | 12–16, 77, 81          | Partial: five species and one local biome                    |
| Combat, conditions, diseases, parasites, symbiosis           | 29–30, 48–50, 78       | Partial: bite, armor and venom                               |
| Mutation branches and build diversity                        | 9–11, 45, 79, 100      | Partial: twenty mutations                                    |
| Mating, genetics, offspring, growth                          | 23–25, 80              | Partial: asexual inherited genomes                           |
| Speciation, extinction records, fossils, species tree        | 26–28, 82, 92–94       | Partial: family tree and legacy archive                      |
| Regions, biomes, procedural exploration and pressures        | 17–22, 46, 83, 95      | Partial: one seeded biome, two pressures                     |
| Persistent discovery unlocks and alternate starts            | 42–44, 84              | Partial: discoveries/legacy retained; starting paths missing |
| Brain, memory, communication, tools and social behavior      | 31–35, 85              | Not implemented                                              |
| Families, tribes, shelter, food storage and agriculture      | 32, 36, 61, 86         | Not implemented                                              |
| Settlements, professions, economy, culture, technology       | 37–39, 60, 87          | Not implemented                                              |
| Industry, energy, transport and research institutions        | 88                     | Not implemented                                              |
| Orbit, expeditions, planets and interplanetary life          | 40, 89                 | Not implemented                                              |
| Procedural challenges, generated cultures/content            | 41, 90–91, 96, 105     | Not implemented                                              |
| Mobile UX, accessibility, audio, VFX and milestones          | 47, 52–56, 93, 101–110 | Partial; continue usability and device verification          |

Sections 1–5, 97–104, 112, and 123–125 provide design and sequencing constraints across the milestones. Optional live-service chores and free-to-play monetization (106, 111) are conditional product decisions, not assumed requirements to add purchases or a backend.

## Current work

Expand the biological game first: environmental traversal, regions, diseases/statuses, richer content, mating/genetics, speciation and discovery unlocks. Keep existing v1–v3 saves readable. Validate each milestone before moving to the next.

## Release gates

- All simulation and browser regression tests pass.
- Deterministic save/load replay remains intact.
- Stateful additions have migrations, validation and inspectable causes.
- Mobile layouts and actual gameplay actions are inspected.
- Physical-device performance and human balance/fun testing are reported separately from automated checks.
