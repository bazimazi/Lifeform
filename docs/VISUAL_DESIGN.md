# Habitat-first game interface — 2026-10-02

The habitat occupies the main desktop play area. Compact translucent overlays show creature health, energy, living relatives and one current quest. A framed action dock contains Bite, Evolve, Reproduce and Explore. Midnight blue surfaces, chartreuse actions, amber quest markers, cyan sensory adaptations, lavender defense adaptations and coral offense adaptations establish the game's identity. The chapter and era track follow actual saved progression.

The first three quest checkpoints are Eat, Evolve and Multiply. A ring and dashed path identify compatible food; the food action moves the player toward it. Guidance accounts for direct versus automatic eating, actual body-dependent birth costs, maturity and cooldowns. Completed adaptation milestones persist after removing an organ. Quest completion banners and affordable-upgrade indicators reflect gameplay, without adding a separate points or XP economy.

Evolve opens three suggested adaptations, ordered by affordability. Each card shows benefits, tradeoffs and resource costs. Previews show changed stats and a purchase action first; habitat forecasts and body analysis expand on demand. Creature details, the complete stat list and quick adaptations are also expandable. The complete adaptation library, species trees and later-era systems remain available.

`src/presentation/theme.css` owns the visual theme and responsive overrides. `WorldRenderer` paints local environmental artwork below interactive organisms and resources in aquatic habitats, with a procedural fallback while the image loads. The art is decorative and does not define collision or food locations. Live organism previews use canvas scanner rings and genetic appearance data. Existing large-text, reduced-motion, keyboard and touch settings remain available.

On phones, the current quest sits above the habitat. Touch controls appear after starting and gameplay quick actions sit below the water, above bottom navigation at the standard phone viewport. Short screens scroll. Menus, creature editing, lineage, discoveries, society and space share the same surface and typography treatment. Reduced motion, larger text and keyboard controls remain available.

## Original artwork

- File: `public/art/primordial-tidepool.png` (1536 × 1024, approximately 2.97 MB).
- Generated with the built-in image generation tool using the imagegen skill; no external runtime image service or API key is required.
- Original generation is retained in the Codex generated-images directory; the shipped copy is inside the repository.
- Final generation prompt:

> Use case: stylized-concept. Asset type: environmental background artwork for LIFEFORM, an evolutionary sandbox browser game. Create a spectacular painterly 3D cinematic microscopic primordial tidepool, wide landscape 1536x1024. Top-down macro view into deep midnight navy and petroleum teal water, illuminated translucent jade aquatic fronds and delicate chartreuse algae, tiny turquoise bioluminescent spores and luminous coral clusters around the edges, layered dark smooth rocks, beautiful refracted underwater light rays from upper left, incredible organic detail, dreamy mysterious scientific exploration mood. Composition: center 65 percent is quiet deep clear water with subtle caustics and generous open space for live game creatures; lush intricate plant silhouettes around corners and bottom edges. Colors luminous teal, icy cyan, small acid lime accents against blue-black shadows. High-end indie game art direction, elegant, atmospheric depth, no huge creatures, no fish, no text, no lettering, no UI, no logos, no borders or watermark.

## Verification

The production build, 64 logic tests and all 22 desktop/mobile browser interaction tests passed, including the guided food-to-offspring flow and saved quest progression. The production smoke test passed feeding, mutation, save export and a space survey with no browser errors or external requests. Screens were inspected at 1440, 768, 390 and 320 pixels, with no horizontal overflow. Screenshots are stored in the ignored `artifacts/` directory. Physical-device testing remains separate from browser emulation.
