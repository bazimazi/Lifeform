# Lifeform architecture

The app separates a serializable deterministic simulation from browser presentation. Biology, society, industry and space all use the same 30 Hz clock and continuing lineage. No backend, accounts, remote telemetry, DOM nodes or callbacks enter saved state.

## Boundaries

| Area                                              | Responsibility                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/data/content.ts`, `biology.ts`, `society.ts` | Stable content IDs, organ and mutation graphs, biomes, diseases, events, tools, building recipes and technology dependencies |
| `src/core/`                                       | State contracts, saved RNG streams, history, validation, migrations, controls and development commands                       |
| `src/biology/`                                    | One phenotype calculation, body constraints, mutations, mating, inheritance and environmental needs                          |
| `src/world/`                                      | Seeded regions, terrain/moisture/rivers, discovery, pressures and spatial indexing                                           |
| `src/simulation/`                                 | Fixed-step orchestration, scored AI goals, movement, combat, resource cycles and aggregate populations                       |
| `src/progression/`                                | Species branches, fossils, nests, milestones, alternate starts, generated adaptations, objectives and natural selection      |
| `src/society/`                                    | Learning, tools, material accounting, professions, settlements, construction, research, trade, policies and culture          |
| `src/space/`                                      | Generated star systems, missions, biological suitability, colonies, mining and frontier science                              |
| `src/presentation/`                               | Canvas organisms/effects, DOM views, maps and audio; consumes state without owning simulation rules                          |
| `src/main.ts`                                     | Input and browser lifecycle, time scheduling, action dispatch, storage adapter and UI composition                            |

Simulation functions return `ActionResult` with a useful rejection reason. Mutation, research, construction and mission actions validate prerequisites and costs before changing the world. Content additions belong in registries, with mechanical implementations and tests for new capabilities.

## Biology

Phenotype combines base values, installed organs, authored mutations, expressed alleles, inherited variations and behavioral traits. Body slots and an 18-unit mass budget constrain combinations. Flight also requires sufficient lift. A single calculation drives movement, combat, costs, previews and validation.

Mating selects one allele from each parent across five loci, with deterministic mutation. Physical modules, appearance and traits inherit from the controlled parent. Asexual offspring receive a deep copy. Existing relatives retain their own bodies when the controlled individual mutates. Invalid inherited mass configurations fall back to the valid parental genome.

The body editor supports color, proportions and organ offsets through sliders and drag placement. Core and mouth anchor the body. Organ offsets affect rendering and inheritance; they do not independently change collision geometry. Three optional adaptive variations and three behavioral specializations provide constrained procedural choices.

`biology/planning.ts` derives prerequisite routes, unpaid costs and intermediate body conflicts without mutating state. Installed adaptations are idempotent in preview construction. `environmentalExposure` is a pure query shared by live environmental needs and habitat forecasts; forecasts exclude disease damage and movement costs. Remote forecasts sample region centers under current weather. `presentation/graphs.ts` draws connected mutation and species graphs using keyboard-accessible HTML buttons with decorative SVG connectors. Species details use preserved branch founding genomes, while population counts include living representatives, settlements and colonies.

## Simulation frequency and scope

- Fixed step: 30 Hz, persisted integer tick. Rendering is independent.
- AI: every 0.25 seconds; needs, society and space: 2 Hz.
- Population updates: every eight seconds; selection of wild genomes: every sixty seconds.
- Up to eight representatives per wildlife archetype, plus one rare apex organism. Relatives remain active; wildlife within 680 units receives detailed updates. Distant represented cohorts are dormant and included in aggregate births and deaths; losses remove excess dormant representatives.
- Far births/deaths consider food, competition and predation. Materialized agents count toward totals; regional allocations conserve global counts. Replacement cohorts inherit selected wild genomes and spawn in suitable habitats away from the player.
- Predators hunt below a tunable hunger threshold. Threat perception derives from food-web relationships. Traits add migration, grouping, guarding, parental care, solitude and memory goals.
- Resource entries are reused on death and capped at 300. Active biological relatives are capped at 24. Settlements are capped at twelve and each building type at eight per settlement.
- Menus, hidden tabs, pausing and a habitat scrolled out of view stop time. There is no offline progression.

Settlements are aggregate populations with assigned jobs, shared material stocks, housing, health and stability. Building definitions declare production and input rates. Star destinations use aggregate colonies and timed expeditions; there is no separately controlled 3D planet surface. This follows the brief's instruction to avoid oversimulation while preserving biological consequences.

## Continuity

Individual death records a cause, then selects a living relative. A settlement or off-world colony can supply a citizen if represented relatives are gone. Whole-lineage extinction archives genomes, history, species branches, society, space and progression. A species branch only becomes a fossil after its represented and settled populations disappear.

The journal retains 500 events per world; individual ancestry remains separate. Research, technologies and material stocks belong to the current world. Cross-run continuity retains discoveries, starting-path unlocks, legacy marks and archived worlds, without permanent combat-stat bonuses.

## Persistence

Current schema: **7**.

| Migration | Added data                                                                          |
| --------- | ----------------------------------------------------------------------------------- |
| 1 to 2    | Accessibility, stamina, telemetry and legacy summaries                              |
| 2 to 3    | Full archived genomes and history; older summaries remain summaries                 |
| 3 to 4    | Deterministic regions, conditions, species branches and expanded wildlife           |
| 4 to 5    | Society, tools, research, settlement economy and culture                            |
| 5 to 6    | Star systems, expeditions and colonies                                              |
| 6 to 7    | Objectives, procedural adaptations, natural selection and starting-path progression |

Terrain, control bindings and pressure intensity are optional additive fields within schema 7; older saves use compatible defaults. Import validates bodies, numeric values, references, clocks, ancestry, economy assignments, missions and world bounds before replacing anything. Unknown newer versions fail clearly.

`lifeform.save` stores the current world and `lifeform.save.backup` the last validated previous world. Unreadable saves are protected from automatic overwrite until the player starts a new lineage or imports valid data. JSON export uses the same validation as import. The 8 MB limit prevents unbounded import cost; browser quota may be lower.

Randomness uses saved world/species/mutation/event/simulation streams or independent hashes of explicit seed and index. Spatial indexes are rebuilt, so they cannot hide mutable replay state. Replay tests cover biology, research and economies across save boundaries.

## Content and tuning workflow

1. Add stable definitions in the appropriate `src/data` registry. Costs, prerequisites, recipes, outputs and combat/movement tuning are inspectable data.
2. Reuse phenotype and world-query functions. Add a simulation capability when a new stat needs an effect.
3. Validate the dependency path, mass budget and save compatibility. Never repurpose an existing content ID without a migration strategy.
4. Add outcome-focused tests, build, inspect the relevant desktop/mobile UI, and run the profiler for simulation changes.
5. Use `npm run balance` to compare seeded automated scenarios; inspect causes, food intake, births, survival and population totals. These bots are diagnostic tools, not human playtests.
6. Update documentation and commit a verified milestone.
