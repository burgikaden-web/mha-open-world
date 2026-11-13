# Hero City — Browser 3D Prototype

This repository is now a **browser-based 3D game**. It is no longer a Godot project.

## Run it

1. Install **Node.js 20 or newer**.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local URL printed by Vite (usually `http://localhost:5173`).

For a production build, run `npm run build`. The finished static site is written to `dist/` and can be hosted on GitHub Pages, Netlify, Vercel, or another static web host.

## Current prototype

- Babylon.js 9 browser renderer with **WebGPU when available** and a **WebGL 2 fallback**.
- Third-person camera with mouse look and pointer lock.
- WASD movement, sprinting, jumping, and collision-aware movement.
- A compact city district with roads, sidewalks, buildings, windows, trees, streetlights, and a U.A.-style training yard.
- A rigged humanoid GLB hero model, with simple procedural movement posing.
- Four selectable quirks: One For All, Half-Cold Half-Hot, Explosion, and Engine (press 1–4 to switch).
- Each quirk has a distinct Q attack and E mobility/utility move; Half-Cold Half-Hot alternates between fire and ice attacks.
- Expanded procedural rig posing for idle, walk, sprint, jump, strike, and dash states. The bundled GLB still has no authored animation clips, so these poses are generated at runtime.
- Three practice targets, hit feedback, an objective counter, and a browser HUD.
- Vite + TypeScript build pipeline.

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Mouse | Look around |
| Shift | Sprint |
| Space | Jump |
| Q | Energy Pulse |
| E | Burst Step |
| Esc | Release the mouse |

Click the game canvas to recapture the mouse after releasing it.

## Character model and licensing

The starter hero is the **Superhero Male** base from Quaternius's *Universal Base Characters — Standard* pack. The model is rigged and supplied as a GLB in `public/assets/hero.glb`. The pack is distributed under **CC0 1.0 Universal**; its license notice is preserved in `public/assets/QUATERNIUS-LICENSE.txt`.

- Pack page: https://quaternius.com/packs/universalbasecharacters.html
- Official download page: https://quaternius.itch.io/universal-base-characters
- License: https://creativecommons.org/publicdomain/zero/1.0/

The bundled base model does not include animation clips. This prototype applies procedural gait and action poses to the rig; it does not yet use authored motion-capture or hand-keyed animation clips. The next model pass should add a full animation set, modular hair/outfit pieces, facial options, and original hero-specific materials. MHA characters, costumes, logos, and anime models are not bundled.

## Architecture

- `src/main.ts` — engine boot, city construction, player controls, training abilities, camera, and HUD updates.
- `src/styles.css` — browser HUD and menus.
- `public/assets/hero.glb` — CC0 rigged base character.
- `public/assets/QUATERNIUS-LICENSE.txt` — original model license notice.

## Roadmap

1. Replace the starter suit material with a customizable hero costume and character creator.
2. Add authored idle, walk, run, jump, land, and ability animation clips.
3. Expand the district into a streamed city with traffic, pedestrians, interiors, and side activities.
4. Add a modular quirk framework with ability progression and VFX.
5. Add story missions, save data, and online features only after the single-player game loop is stable.

This is an early playable foundation, **not a finished AAA game**. The browser build still needs real-device performance testing and further art, animation, audio, level design, and gameplay work.
