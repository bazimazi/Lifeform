# Lifeform architecture

This is the first biological vertical slice from the [product brief](PRODUCT_BRIEF.md). It is a TypeScript simulation with a Canvas 2D presentation and a DOM interface. The simulation runs without the browser, which makes deterministic tests and balancing inexpensive. There is no backend, account requirement, or remote telemetry.

## Boundaries

| Area                           | Responsibility                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `src/data/content.ts`          | Organ, mutation, species, resource, pressure, base stat, and tuning definitions     |
| `src/core/types.ts`            | Serializable contracts; no browser references                                       |
| `src/core/random.ts`           | Seed hashing and explicit world/species/mutation/event/simulation RNG streams       |
| `src/core/history.ts`          | Bounded event journal and complete lineage snapshots                                |
| `src/core/save.ts`             | Schema migrations, validation, serialization, storage recovery                      |
| `src/core/debug.ts`            | Explicit local development commands                                                 |
| `src/biology/body.ts`          | Sole phenotype calculation, diet capabilities, slots, mass budget                   |
| `src/biology/mutation.ts`      | Prerequisites, exclusions, previews, application and removal                        |
| `src/biology/reproduction.ts`  | Birth conditions, inherited bodies, descendants, voluntary succession               |
| `src/world/generation.ts`      | Seeded terrain, food, species cohorts and safe initial feeding trail                |
| `src/world/spatial.ts`         | Generic spatial hash for neighborhood queries                                       |
| `src/simulation/ai.ts`         | Utility-scored flee, hunt, feed, follow, and wander goals                           |
| `src/simulation/population.ts` | Aggregate birth/death pressures and explicit food-web relationships                 |
| `src/simulation/ecosystem.ts`  | Fixed-step orchestration, movement, feeding, combat, needs, discovery and mortality |
| `src/presentation/`            | Procedural visuals, UI templates, sound cues; consumes simulation state             |
| `src/main.ts`                  | Browser composition, input, clock scheduling, storage adapter and action dispatch   |

Biology never imports presentation. `ActionResult` communicates success or an explainable rejection; the interface chooses how to present it. Saves contain plain data, not DOM nodes, callbacks, or class instances. All random choices use saved RNG streams; rendering uses deterministic hashes and simulation time.

## Bodies and adaptations

A genome contains organ IDs and mutation IDs. Organs occupy body slots. A mutation can install an organ, replace the organ in a slot, modify stats, or add a diet capability. Base stats plus organ modifiers plus mutation modifiers produce the phenotype. The same calculation drives movement, combat, biology previews, resource costs and save validation.

The mass cap is 18 units. Some branches exclude one another (filter feeding versus a predatory jaw; lighter versus larger bodies; improved cilia versus a tail). Others depend on earlier adaptations. Validation completes before biomass or mutation points are spent. Removing a prerequisite is rejected while dependent mutations remain; removing a tail restores basic cilia. Removal does not refund mutation opportunities. Discoveries remain archived.

The present creature editor supports installing, upgrading and removing adaptations. Free organ positioning, color customization and arbitrary body proportions are future work.

## Time and simulation fidelity

- Simulation uses a 30 Hz fixed step and a persisted integer tick.
- AI chooses utility goals every 0.25 seconds; existing intents continue between evaluations.
- Needs update at 2 Hz. Population accounting updates every eight seconds.
- Input/rendering use `requestAnimationFrame`; catch-up is bounded to 12 steps per frame.
- Each species has at most eight materialized representatives (six for the initial apex population).
- Representatives within 680 world units of the controlled creature receive movement, AI and needs updates. Lineage relatives continue their local simulation so offspring can mature and survive.
- Other members are aggregate counts. Food, prey supply, competition for finite resources, predator pressure, births and deaths change these counts. Materialized representatives count toward the total and are never added twice.
- The representative cohort outside the active radius is dormant. The aggregate reserve changes statistically. Full migration and complete far-cohort dematerialization are beyond this slice.
- Spatial indexes are derived and rebuilt each step. This avoids hidden cache state changing the result after loading a save. Save/replay equality is tested across seeds and spatial boundaries.
- Resource entries are reused on death; the resource pool is capped at 300. Population representatives are bounded. The live lineage cap is 24.

Pausing, opening a dialog, inspecting another screen, hiding the tab, or scrolling the habitat out of view stops the clock. There is no offline progression. Reduced motion removes cellular and ambient animation; it does not stop gameplay movement.

## Life, death, and historical continuity

Reproduction is deliberately simple: early organisms reproduce asexually. Offspring receive a deep copy of their parent's current genome and then mature. Parental care changes growth time through the phenotype. Mutating later does not retroactively alter existing relatives.

On individual death, the archive records the cause and control transfers to the highest-generation living relative, including juveniles. With no relatives, the lineage becomes extinct and a full snapshot of its individual genomes and retained journal is archived. Starting a new seeded world keeps previous legacy records, discoveries, settings and legacy marks. Legacy marks commemorate events; this slice does not sell or apply permanent stat bonuses.

The retained event journal is capped at 500 entries per lineage; individual genome records are retained separately. Species splitting, sexual genetics, intelligence and later eras remain future systems.

## Save contract

Current schema: **3**.

1. Version 1 → 2 fills accessibility defaults, stamina, telemetry and legacy summary fields.
2. Version 2 → 3 adds full archived genomes and historical records to legacy entries. Older summaries retain their content, with empty detailed archives where that data never existed.
3. Unknown newer versions fail with an actionable error. Invalid references, bodies, clocks, positions, numeric data, ID sequences, population counts and lineage ownership are rejected before replacing a world.

`lifeform.save` is the current browser save; `lifeform.save.backup` is the last validated previous save. Writes keep a known-good recovery copy. A corrupt primary can recover from the backup. If neither loads, the unreadable original is protected from automatic overwrite until the player explicitly starts a new lineage or imports a valid save. Storage failures leave gameplay available and recommend export. Export/import uses the same validation path. The prototype bounds a save to 8 MB; large archives may reach the browser's quota sooner.

Save schema migrations address structural changes. A future update that rebalances existing organ IDs must also consider the effect on old phenotypes and body budgets; that is not solved by a schema number alone.

## Content workflow

1. Add a definition to `content.ts`, with a stable ID and all relevant tuning data.
2. Reference existing organ slots, visual modules, diet capabilities and stat modifiers where possible. An entirely new ability needs a new simulation capability and corresponding tests.
3. Connect mutation prerequisites/exclusions; check that every path is reachable within the mass budget.
4. Add species food/prey/predator relationships rather than species-specific branches in the AI.
5. Verify save compatibility whenever changing an ID, slot, prerequisite, or persisted field.
6. Run simulation tests, build, browser tests, and the profile before committing.

The original brief is a long-term vision. This slice intentionally provides one coherent biological loop to playtest before expanding its era or content count.
