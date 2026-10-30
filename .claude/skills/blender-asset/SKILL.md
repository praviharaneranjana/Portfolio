---
name: blender-asset
description: Build, edit or re-render the portfolio's Blender-generated 3D assets (the intro vault gate in blender/build_gate.py → public/models/gate.glb), make a model look more realistic, or add a new scripted Blender asset for the site. Use for any request mentioning Blender, the gate/vault/door model, textures, preview renders, or "looks cartoon".
---

# Blender assets for the portfolio

Read `docs/BLENDER.md` first: node-name contract, realism checklist, material recipe.

## Ground rules

- **The script is the source.** Edit `blender/build_gate.py` and re-run it. Never hand-edit `gate.glb`, and don't edit `gate.blend` without porting the change back into the script.
- **Keep the contract.** `GateCanvas.tsx` animates nodes by name (`Dial`, `DoorL`, `DoorR`, `Pin_*`, `Bolt_0/1`, `SeamGlow`, material `Glow`). If you rename or move a pivot, update `GateCanvas.tsx` in the same change. `DOOR_TRAVEL` must match in both files.
- **Realistic, not cartoon:** surface variation (roughness + normal maps), multi-segment bevels, depth (recesses, no floating parts), dark restrained palette with coral only as a tiny accent, no emissive UI decorations on the model.
- **Budget:** `.glb` ≤ ~1.5 MB (Draco + JPEG). Textures 1024² tileable, shared between materials.

## Run

```bash
"D:/Softwares/blender-5.2.3-windows-x64/blender.exe" --background --factory-startup --python blender/build_gate.py
# geometry/export only:
"D:/Softwares/blender-5.2.3-windows-x64/blender.exe" --background --factory-startup --python blender/build_gate.py -- --no-render
```

The Cycles previews take ~1 minute on CPU, so run them in the background. Then **look at** `blender/preview.png` and `blender/preview_open.png` (Read the images) before touching the web code.

## Inspect the export

```bash
D:/node-v24.19.0-win-x64/node.exe .claude/skills/blender-asset/inspect-glb.mjs public/models/gate.glb
```

Check that metal materials have `metallicRoughnessTexture` + `roughnessFactor`, normal scales are present, images are JPEG and shared (4 images), and all contract node names exist.

## Adding a new scripted asset

1. Copy the structure of `build_gate.py`: `clear_scene()`, `build_textures()`, `make_material(...)`, the `Part` builder (bmesh primitives → one object, box UVs, bevel modifier), preview rig, export, `pack_all`, background render.
2. Output to `public/models/<name>.glb` and `blender/<name>.blend`; add a `## <name>` section to `docs/BLENDER.md` with its node contract.
3. Load it in a client-only canvas (see the `add-3d-scene` skill), lit with drei `<Environment>` + `<Lightformer>`s. Metal without an environment map looks black and flat.

## Verify in the browser

`npm run build`, `npx next start -p 3123`, then screenshot with `playwright-core` driving installed Chrome (`--use-angle=d3d11` uses the real GPU). See the `add-3d-scene` skill for the snippet.
