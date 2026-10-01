# Playtest and release validation

The repository now spans biology through interplanetary life. Automated tests establish mechanical outcomes and persistence; they do not establish enjoyment, long-term balance, or physical-phone performance.

## Short biological session

1. Start a fresh seed and find food without reading developer tools. Observe whether health, energy and compatible resources are understandable.
2. Preview a mutation and explain its benefit and cost before installing it. Try a different body in a second run.
3. Reproduce, protect offspring and continue as a relative. Confirm that the older body remains a distinct individual.
4. Travel into a new biome, feel its traversal and climate requirements, investigate a site, and return to shelter.
5. Try a generated variation, mating, a behavioral trait and species splitting. Check whether their consequences are visible.
6. Survive or avoid an apex organism and environmental event. Record whether the cause of failure is understandable.

## Longer progression session

1. Deliberately evolve toward intelligence using the eye, brain, digits, language and memory branches.
2. Gather materials, research stone tools, craft a useful tool, and follow a remembered location.
3. Found a settlement with three living relatives. Assign gatherers, builders and scholars; create food, water and housing.
4. Compare agriculture on land and aquaculture in water. Let inputs run short and verify that output/stability consequences are legible.
5. Trade, choose a government/law, build industry, and compare polluting production with renewable energy.
6. Reach rocketry, survey a world, start a colony, send supplies and improve its habitat. Compare suitability for different genomes.
7. Open another system and complete renewable objectives without a conventional victory screen.

Record time to first food, mutation, death, reproduction, biome, tool and settlement; confusing requirements; unhelpful screens; and dominant strategies. Local developer metrics and `npm run balance` assist diagnosis. Do not treat the automated agent's survival rate as a human difficulty rating.

## Device matrix

Test real touch hardware in addition to the automated 390x664 and 320x568 viewports. Check sustained frame pacing, heat, memory, browser tab suspension, audio activation, vibration support, pointer cancellation, save quota, import/export and left-handed controls. Cover Safari/iOS and Firefox as well as Chromium.

Use keyboard-only navigation, screen magnification, larger text and reduced motion. Verify focus in dialogs and text labels for every color cue. The world canvas has labeled controls and a DOM state inspector; it is not a fully nonvisual spatial gameplay interface.

## Known representation limits

- Settlements and colonies are aggregate simulations. Territory and diplomacy are compact systems rather than a full strategy-game map.
- Planetary exploration uses surveys and colonies; it does not introduce a separate 3D landing scene.
- Organ offsets are visual and inherited; they do not create separate per-organ collision hitboxes.
- Distant creatures use population approximations, and there is no offline clock advancement.
- Individual records and legacy archives can eventually reach the 8 MB save cap or browser quota. Export worlds regularly during extended tests.
- Content counts are stated in the coverage ledger. The brief's larger long-term catalogs are future scaling targets, not completed authored content.

A release decision should use real 10-20-minute biology sessions, longer progression sessions and physical-phone measurements. The current work delivers a playable prototype across the progression, not that human release decision.
