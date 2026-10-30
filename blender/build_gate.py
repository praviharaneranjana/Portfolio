"""
Builds the intro vault gate for the portfolio and exports it for the web.

Run headless (from the repo root):
    "D:/Softwares/blender-5.2.3-windows-x64/blender.exe" --background --factory-startup --python blender/build_gate.py

or open Blender > Scripting > open this file > Run Script (it clears the current scene).
Pass `-- --no-render` after the script path to skip the Cycles previews.

Outputs
    public/models/gate.glb        -> loaded by src/components/gate/GateCanvas.tsx
    blender/gate.blend            -> editable source scene (camera + lights, textures packed)
    blender/preview.png           -> Cycles still, doors closed (headless runs only)
    blender/preview_open.png      -> Cycles still, doors half open

Node names are the contract with the web code -- keep them if you edit the model (see docs/BLENDER.md):
    Wall, Frame, Chamber, StatusLight, SeamGlow, Dial,
    DoorL (children Pin_*), DoorR (children Pin_*, Bolt_0, Bolt_1)
    material "Glow" (the web animates its emissive intensity)

Blender is Z-up and the gate faces -Y. The glTF exporter converts to Y-up, so in three.js
the gate faces +Z, X stays X, and the dial spins around Z.

Realism comes from: tileable procedural roughness/normal maps (generated below with numpy and packed into
the GLB), world-space box UVs (constant texel density), multi-segment bevels that catch highlights, and a
recessed doorway with pocket doors so nothing floats in front of the wall.
"""

import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

# ----------------------------------------------------------------------------- paths
try:
    HERE = os.path.dirname(os.path.abspath(__file__))
except NameError:  # run from Blender's text editor
    HERE = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.getcwd()
ROOT = os.path.dirname(HERE) if os.path.basename(HERE) == "blender" else HERE
GLB_PATH = os.path.join(ROOT, "public", "models", "gate.glb")
BLEND_PATH = os.path.join(ROOT, "blender", "gate.blend")
TEX_DIR = os.path.join(ROOT, "blender", "textures")  # generated, git-ignored, packed into .blend/.glb
PREVIEW_PATH = os.path.join(ROOT, "blender", "preview.png")
PREVIEW_OPEN_PATH = os.path.join(ROOT, "blender", "preview_open.png")
ARGS = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
RENDER = bpy.app.background and "--no-render" not in ARGS

# ----------------------------------------------------------------------------- dimensions (Blender units ~ metres)
OPEN_W, OPEN_H = 4.05, 2.65  # half-size of the doorway
FRAME_W, FRAME_H = 5.4, 3.4  # half-size of the bezel around it
DOOR_W, DOOR_H = 4.25, 2.8  # doors overlap the doorway so their edges hide behind the facade
DOOR_FRONT, DOOR_BACK = -0.2, 0.25
DOOR_TRAVEL = 5.0  # how far each door slides into its pocket -- mirrored in GateCanvas.tsx
FACADE_FRONT, FACADE_BACK = -1.0, -0.82  # everything mounted on the doors stays behind FACADE_BACK
BACK_WALL = (0.32, 0.9)  # pocket back wall
CHAMBER_DEPTH = 12.0
SEAM = 0.006
BAR_Z = 2.0  # height of the two locking cross-bars
PIN_ANGLES = [math.radians(22.5 + 45 * k) for k in range(8)]
TEX_SIZE = 1024


# ----------------------------------------------------------------------------- procedural textures (tileable)
rng = np.random.default_rng(7)


def norm01(a):
    a = a - a.min()
    return a / (a.max() + 1e-8)


def spectral_noise(n, beta, stretch_x=1.0):
    """Tileable fractal noise: white noise shaped by 1/f^beta in the frequency domain.
    stretch_x > 1 lengthens features along X (brushed-metal streaks)."""
    w = rng.standard_normal((n, n))
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(n)[None, :] * stretch_x
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    spec = np.fft.fft2(w) / f**beta
    spec[0, 0] = 0
    return norm01(np.real(np.fft.ifft2(spec)))


def blur(a, passes=1):
    for _ in range(passes):
        a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5
    return a


def scratches(n, count, horizontal_bias):
    h = np.zeros((n, n), np.float32)
    for _ in range(count):
        x0, y0 = rng.uniform(0, n, 2)
        spread = math.pi * (1 - horizontal_bias)
        ang = rng.normal(0, spread / 2) if rng.random() < horizontal_bias else rng.uniform(0, math.pi)
        length = rng.uniform(10, 140)
        t = np.linspace(0, length, int(length * 2))
        xs = (x0 + np.cos(ang) * t).astype(int) % n
        ys = (y0 + np.sin(ang) * t).astype(int) % n
        np.maximum.at(h, (ys, xs), rng.uniform(0.25, 1.0))
    return blur(h, 1)


def height_to_normal(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    nz = np.ones_like(h)
    length = np.sqrt(dx * dx + dy * dy + nz * nz)
    return np.stack([-dx / length, -dy / length, nz / length], -1) * 0.5 + 0.5


def save_image(name, rgb):
    """rgb: (n, n, 3), or (n, n) roughness in 0..1. Saved as PNG in TEX_DIR and returned as a Non-Color image.
    Roughness is packed glTF-style (G = roughness, B = metallic = 1) so metallicFactor alone sets metalness."""
    if rgb.ndim == 2:
        one = np.ones_like(rgb)
        rgb = np.stack([one, rgb, one], -1)
    n = rgb.shape[0]
    rgba = np.concatenate([rgb, np.ones((n, n, 1))], -1).astype(np.float32)
    img = bpy.data.images.new(name, n, n, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(rgba.ravel())
    os.makedirs(TEX_DIR, exist_ok=True)
    img.filepath_raw = os.path.join(TEX_DIR, f"{name}.png")
    img.file_format = "PNG"
    img.save()
    return img


def build_textures():
    n = TEX_SIZE
    smudge = spectral_noise(n, 1.8)
    streaks = spectral_noise(n, 1.2, stretch_x=24)
    fine = spectral_noise(n, 0.6)
    scr = scratches(n, 220, horizontal_bias=0.8) * 0.6
    # Roughness lives in 0.55..1 so a per-material factor (Math > Multiply) sets the absolute level.
    metal_r = np.clip(0.72 + 0.22 * (smudge - 0.5) + 0.12 * (streaks - 0.5) + 0.05 * (fine - 0.5) - 0.14 * scr, 0.45, 1)
    metal_n = height_to_normal(0.55 * streaks + 0.12 * fine - 0.35 * scr, strength=1.8)

    blotch = spectral_noise(n, 2.0)
    grain = spectral_noise(n, 0.9)
    pits = (spectral_noise(n, 0.2) > 0.86).astype(np.float32)
    pits = blur(pits, 1)
    conc_r = np.clip(0.86 + 0.18 * (blotch - 0.5) + 0.08 * (grain - 0.5) + 0.1 * pits, 0.6, 1)
    conc_n = height_to_normal(0.35 * blotch + 0.45 * grain - 0.8 * pits, strength=3.0)

    return {
        "metal_r": save_image("T_Metal_Roughness", metal_r),
        "metal_n": save_image("T_Metal_Normal", metal_n),
        "conc_r": save_image("T_Concrete_Roughness", conc_r),
        "conc_n": save_image("T_Concrete_Normal", conc_n),
    }


# ----------------------------------------------------------------------------- helpers
def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.images):
        for block in list(coll):
            coll.remove(block)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))


# UV tile size (world units per texture repeat) by material name; materials not listed get no UV scaling.
TILE = {}


def make_material(name, color, metallic, roughness, emission=None, strength=0.0, tex=None, normal=0.0, tile=2.5):
    """Principled BSDF in a layout the glTF exporter understands:
    Image -> Separate Color (G) -> Math Multiply(roughness) -> Roughness  => metallicRoughnessTexture + factor
    Image -> Normal Map(strength)                                   -> Normal     => normalTexture + scale"""
    m = bpy.data.materials.new(name)
    if m.node_tree is None:  # pre-5.0 Blender
        m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*hex_rgb(color), 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = (*hex_rgb(emission), 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    if tex:
        rough_img, normal_img = tex
        r = nodes.new("ShaderNodeTexImage")
        r.image = rough_img
        sep = nodes.new("ShaderNodeSeparateColor")
        mul = nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY"
        mul.inputs[1].default_value = roughness / 0.75  # texture averages ~0.75
        links.new(r.outputs["Color"], sep.inputs["Color"])
        links.new(sep.outputs["Green"], mul.inputs[0])
        links.new(mul.outputs["Value"], bsdf.inputs["Roughness"])
        if normal > 0:
            nimg = nodes.new("ShaderNodeTexImage")
            nimg.image = normal_img
            nmap = nodes.new("ShaderNodeNormalMap")
            nmap.inputs["Strength"].default_value = normal
            links.new(nimg.outputs["Color"], nmap.inputs["Color"])
            links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
        TILE[name] = tile
    m.diffuse_color = (*hex_rgb(color), 1.0)
    return m


class Part:
    """Accumulates primitives into one bmesh (one object, one draw call per material)."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def _finish(self, verts, mat, smooth=True):
        if mat not in self.mats:
            self.mats.append(mat)
        idx = self.mats.index(mat)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = idx
            f.smooth = smooth

    def box(self, x0, x1, y0, y1, z0, z1, mat):
        c = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
        m = Matrix.Translation(c) @ Matrix.Diagonal((abs(x1 - x0), abs(y1 - y0), abs(z1 - z0), 1.0))
        res = bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        self._finish(res["verts"], mat, smooth=False)

    def cyl(self, center, axis, radius, length, mat, segs=32):
        rot = Vector((0, 0, 1)).rotation_difference(Vector(axis).normalized()).to_matrix().to_4x4()
        m = Matrix.Translation(Vector(center)) @ rot
        res = bmesh.ops.create_cone(
            self.bm, cap_ends=True, cap_tris=False, segments=segs,
            radius1=radius, radius2=radius, depth=length, matrix=m,
        )
        self._finish(res["verts"], mat)

    def sphere(self, center, radius, mat, segs=16):
        m = Matrix.Translation(Vector(center))
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=segs // 2, radius=radius, matrix=m)
        self._finish(res["verts"], mat)

    def ring(self, r0, r1, y0, y1, a0, a1, mat, segs=128):
        """Annulus (or arc of one) in the XZ plane, extruded from y0 to y1."""
        full = abs((a1 - a0) - 2 * math.pi) < 1e-6
        n = segs if full else max(2, int(segs * (a1 - a0) / (2 * math.pi))) + 1
        rows = []
        for i in range(n):
            a = a0 + (a1 - a0) * i / (segs if full else n - 1)
            c, s = math.cos(a), math.sin(a)
            rows.append([self.bm.verts.new((r * c, y, r * s)) for r, y in ((r0, y0), (r1, y0), (r1, y1), (r0, y1))])
        for i in range(n if full else n - 1):
            a, b = rows[i], rows[(i + 1) % n]
            for k in range(4):
                self.bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
        if not full:
            self.bm.faces.new(rows[0][::-1])
            self.bm.faces.new(rows[-1])
        self._finish([v for row in rows for v in row], mat)

    def torus(self, center, major, minor, mat, segs=96, minor_segs=16):
        """Torus lying in the XZ plane (axis along Y)."""
        cx, cy, cz = center
        rows = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            row = []
            for j in range(minor_segs):
                b = 2 * math.pi * j / minor_segs
                r = major + minor * math.cos(b)
                row.append(self.bm.verts.new((cx + r * math.cos(a), cy + minor * math.sin(b), cz + r * math.sin(a))))
            rows.append(row)
        for i in range(segs):
            a, b = rows[i], rows[(i + 1) % segs]
            for j in range(minor_segs):
                self.bm.faces.new((a[j], b[j], b[(j + 1) % minor_segs], a[(j + 1) % minor_segs]))
        self._finish([v for row in rows for v in row], mat)

    def _box_uv(self):
        """World-space box projection: every part shares one texel density, so seams between parts line up."""
        uv = self.bm.loops.layers.uv.verify()
        for f in self.bm.faces:
            tile = TILE.get(self.mats[f.material_index].name, 2.5) if self.mats else 2.5
            nx, ny, nz = (abs(c) for c in f.normal)
            for loop in f.loops:
                x, y, z = loop.vert.co
                if ny >= nx and ny >= nz:
                    u, v = x, z  # front/back faces: brushed streaks run horizontally
                elif nx >= nz:
                    u, v = y, z
                else:
                    u, v = x, y
                loop[uv].uv = (u / tile, v / tile)

    def build(self, bevel=0.012, segments=3, parent=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        self.bm.normal_update()
        self._box_uv()
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        if bevel:
            mod = ob.modifiers.new("Bevel", "BEVEL")
            mod.width = bevel
            mod.segments = segments
            mod.limit_method = "ANGLE"
            mod.angle_limit = math.radians(35)
            mod.harden_normals = True
        if parent:
            ob.parent = parent
        return ob


# ----------------------------------------------------------------------------- materials
clear_scene()
T = build_textures()
metal = (T["metal_r"], T["metal_n"])
concrete = (T["conc_r"], T["conc_n"])
M = {
    "wall": make_material("Wall", "#1a1b1d", 0.0, 0.82, tex=concrete, normal=0.6, tile=5.0),
    "chamber": make_material("ChamberWall", "#121315", 0.0, 0.9, tex=concrete, normal=0.5, tile=5.0),
    "frame": make_material("Frame", "#1d1e21", 1.0, 0.5, tex=metal, normal=0.35, tile=3.0),
    "gun": make_material("Gunmetal", "#2a2c31", 1.0, 0.36, tex=metal, normal=0.3, tile=2.5),
    "panel": make_material("Panel", "#1b1c20", 1.0, 0.52, tex=metal, normal=0.3, tile=2.0),
    "steel": make_material("Steel", "#a3a7ae", 1.0, 0.24, tex=metal, normal=0.2, tile=1.2),
    "bolt": make_material("BoltSteel", "#62666d", 1.0, 0.4, tex=metal, normal=0.2, tile=1.2),
    "tick": make_material("Tick", "#c9ccd2", 0.7, 0.32),
    "paint": make_material("CoralPaint", "#d8432b", 0.0, 0.48),  # dial index mark only
    # Shared by SeamGlow + StatusLight; the web code animates its emissive intensity on unlock.
    "glow": make_material("Glow", "#ff4d30", 0.0, 0.4, emission="#ff4d30", strength=1.0),
}

# ----------------------------------------------------------------------------- wall: facade + pocket back wall
wall = Part("Wall")
FF, FB = FACADE_FRONT, FACADE_BACK
# Facade plate with a doorway cut out. Doors slide into the gap between it and the back wall.
wall.box(-40, -OPEN_W, FF, FB, -30, 30, M["wall"])
wall.box(OPEN_W, 40, FF, FB, -30, 30, M["wall"])
wall.box(-OPEN_W, OPEN_W, FF, FB, OPEN_H, 30, M["wall"])
wall.box(-OPEN_W, OPEN_W, FF, FB, -30, -OPEN_H, M["wall"])
# Back wall of the pockets (behind the doors), open where the chamber is.
y0, y1 = BACK_WALL
wall.box(-40, -OPEN_W, y0, y1, -30, 30, M["wall"])
wall.box(OPEN_W, 40, y0, y1, -30, 30, M["wall"])
wall.box(-OPEN_W, OPEN_W, y0, y1, OPEN_H, 30, M["wall"])
wall.box(-OPEN_W, OPEN_W, y0, y1, -30, -OPEN_H, M["wall"])
# Formwork panel joints: shallow grooves are faked with thin proud strips in a darker material.
for x in (-15.0, -9.2, 9.2, 15.0):
    wall.box(x - 0.025, x + 0.025, FF - 0.01, FF, -30, 30, M["panel"])
for z in (-6.2, 6.2):
    wall.box(-40, 40, FF - 0.01, FF, z - 0.025, z + 0.025, M["panel"])
for sx in (-1, 1):  # steel pilasters either side of the bezel
    wall.box(sx * 6.0, sx * 6.7, FF - 0.14, FF, -30, 30, M["frame"])
    wall.box(sx * 7.7, sx * 7.85, FF - 0.06, FF, -30, 30, M["frame"])
wall.box(-6.7, 6.7, FF - 0.14, FF, FRAME_H + 0.5, FRAME_H + 0.95, M["frame"])  # lintel
wall.box(-6.7, 6.7, FF - 0.14, FF, -FRAME_H - 0.95, -FRAME_H - 0.5, M["frame"])  # sill
wall.build(bevel=0.02)

# ----------------------------------------------------------------------------- frame: bezel + jamb linings
frame = Part("Frame")
by0, by1 = FF - 0.22, FF  # bezel sits proud of the facade
frame.box(-FRAME_W, FRAME_W, by0, by1, OPEN_H, FRAME_H, M["frame"])
frame.box(-FRAME_W, FRAME_W, by0, by1, -FRAME_H, -OPEN_H, M["frame"])
frame.box(-FRAME_W, -OPEN_W, by0, by1, -OPEN_H, OPEN_H, M["frame"])
frame.box(OPEN_W, FRAME_W, by0, by1, -OPEN_H, OPEN_H, M["frame"])
# chamfered inner trim
t = 0.14
frame.box(-OPEN_W - t, OPEN_W + t, by0 - 0.06, by0, OPEN_H, OPEN_H + t, M["gun"])
frame.box(-OPEN_W - t, OPEN_W + t, by0 - 0.06, by0, -OPEN_H - t, -OPEN_H, M["gun"])
frame.box(-OPEN_W - t, -OPEN_W, by0 - 0.06, by0, -OPEN_H, OPEN_H, M["gun"])
frame.box(OPEN_W, OPEN_W + t, by0 - 0.06, by0, -OPEN_H, OPEN_H, M["gun"])
# head and sill linings run back to the door face (the doors slide sideways, never through these)
frame.box(-OPEN_W, OPEN_W, FF, DOOR_FRONT - 0.005, OPEN_H, OPEN_H + 0.05, M["gun"])
frame.box(-OPEN_W, OPEN_W, FF, DOOR_FRONT - 0.005, -OPEN_H - 0.05, -OPEN_H, M["gun"])
# side linings only cover the facade thickness, leaving the pocket slot behind them
for sx in (-1, 1):
    frame.box(*sorted((sx * OPEN_W, sx * (OPEN_W + 0.05))), FF, FB, -OPEN_H, OPEN_H, M["gun"])
# hex bolt heads around the bezel
mid_h = (OPEN_H + FRAME_H) / 2
mid_w = (OPEN_W + FRAME_W) / 2
for i in range(13):
    x = -4.8 + i * 0.8
    if abs(x) < 0.9:
        continue  # leave room for the status light
    for z in (mid_h, -mid_h):
        frame.cyl((x, by0 - 0.035, z), (0, 1, 0), 0.075, 0.07, M["bolt"], segs=6)
        frame.cyl((x, by0 - 0.005, z), (0, 1, 0), 0.105, 0.012, M["bolt"], segs=24)  # washer
for i in range(7):
    z = -2.4 + i * 0.8
    for x in (mid_w, -mid_w):
        frame.cyl((x, by0 - 0.035, z), (0, 1, 0), 0.075, 0.07, M["bolt"], segs=6)
        frame.cyl((x, by0 - 0.005, z), (0, 1, 0), 0.105, 0.012, M["bolt"], segs=24)
# status light housing
frame.box(-0.75, 0.75, by0 - 0.08, by0, mid_h - 0.12, mid_h + 0.12, M["panel"])
frame.build(bevel=0.018)

status = Part("StatusLight")
status.box(-0.6, 0.6, by0 - 0.1, by0 - 0.08, mid_h - 0.03, mid_h + 0.03, M["glow"])
status.build(bevel=0)

# ----------------------------------------------------------------------------- chamber behind the doors
chamber = Part("Chamber")
cy0, cy1 = DOOR_BACK, DOOR_BACK + CHAMBER_DEPTH
cw, ch, th = OPEN_W, OPEN_H, 0.3
chamber.box(-cw - th, cw + th, cy0, cy1, -ch - th, -ch, M["chamber"])  # floor
chamber.box(-cw - th, cw + th, cy0, cy1, ch, ch + th, M["chamber"])  # ceiling
chamber.box(-cw - th, -cw, cy0, cy1, -ch, ch, M["chamber"])  # left wall
chamber.box(cw, cw + th, cy0, cy1, -ch, ch, M["chamber"])  # right wall
chamber.box(-cw, cw, cy1, cy1 + th, -ch, ch, M["chamber"])  # back
for k in range(1, 8):  # steel ring ribs receding into the dark
    y = cy0 + k * 1.45
    for x0, x1, z0, z1 in ((-cw, -cw + 0.16, -ch, ch), (cw - 0.16, cw, -ch, ch), (-cw, cw, ch - 0.16, ch)):
        chamber.box(x0, x1, y - 0.12, y + 0.12, z0, z1, M["frame"])
for x in (-1.2, 1.2):  # floor rails
    chamber.box(x - 0.05, x + 0.05, cy0, cy1, -ch, -ch + 0.06, M["steel"])
chamber.build(bevel=0.015, segments=2)


# ----------------------------------------------------------------------------- doors
def build_door(side):
    """side = -1 (left) or +1 (right). Geometry is in world space; object stays at origin."""
    s = side
    p = Part("DoorL" if s < 0 else "DoorR")
    X = lambda a, b: (min(s * a, s * b), max(s * a, s * b))  # noqa: E731  mirror an |x| range
    f = DOOR_FRONT

    p.box(*X(SEAM, DOOR_W), f, DOOR_BACK, -DOOR_H, DOOR_H, M["gun"])  # slab
    p.box(*X(SEAM, 0.1), f - 0.04, f, -DOOR_H + 0.05, DOOR_H - 0.05, M["gun"])  # raised seam edge
    # interlocking lugs on the meeting edge (visible as the doors part)
    for i in range(7):
        z = -2.1 + i * 0.7
        if (i % 2 == 0) == (s > 0):
            p.box(*X(SEAM - 0.001, 0.05), f + 0.05, DOOR_BACK - 0.05, z - 0.18, z + 0.18, M["steel"])

    # side panel with ribs
    p.box(*X(1.65, 3.75), f - 0.06, f, -1.35, 1.35, M["gun"])
    p.box(*X(1.8, 3.6), f - 0.09, f - 0.06, -1.2, 1.2, M["panel"])
    for z in (-0.8, -0.4, 0.0, 0.4, 0.8):
        p.box(*X(1.95, 3.45), f - 0.115, f - 0.09, z - 0.03, z + 0.03, M["gun"])

    # top / bottom plates that carry the cross-bars
    for zs in (1, -1):
        p.box(*X(0.25, 3.75), f - 0.05, f, *sorted((zs * 1.55, zs * 2.45)), M["panel"])

    # rivets along the outer edge and top/bottom
    for i in range(15):
        z = -2.45 + i * 0.35
        p.cyl((s * 3.9, f - 0.02, z), (0, 1, 0), 0.04, 0.05, M["steel"], segs=16)
    for i in range(11):
        x = 0.35 + i * 0.345
        for z in (2.52, -2.52):
            p.cyl((s * x, f - 0.02, z), (0, 1, 0), 0.04, 0.05, M["steel"], segs=16)
    for x in (1.72, 3.68):  # panel corners
        for z in (1.27, -1.27):
            p.cyl((s * x, f - 0.07, z), (0, 1, 0), 0.035, 0.04, M["steel"], segs=16)

    # half of the lock ring, its outer collar and the tick marks
    a0, a1 = (math.pi / 2 + 0.004, 3 * math.pi / 2 - 0.004) if s < 0 else (-math.pi / 2 + 0.004, math.pi / 2 - 0.004)
    p.ring(0.98, 1.32, f - 0.16, f, a0, a1, M["frame"], segs=192)
    p.ring(1.32, 1.48, f - 0.07, f, a0, a1, M["gun"], segs=192)
    for i in range(60):
        a = math.radians(i * 6 + 3)
        if (math.cos(a) < 0) != (s < 0):
            continue
        long = i % 5 == 0
        r0, r1 = (1.06 if long else 1.14), 1.28
        rm = (r0 + r1) / 2
        rot = Matrix.Rotation(-a, 4, "Y")  # spin the tick around the dial axis
        m = Matrix.Translation((rm * math.cos(a), f - 0.165, rm * math.sin(a))) @ rot
        res = bmesh.ops.create_cube(p.bm, size=1.0, matrix=m @ Matrix.Diagonal((r1 - r0, 0.012, 0.02 if long else 0.014, 1)))
        p._finish(res["verts"], M["tick"], smooth=False)

    # cross-bar hardware: guides on the right door, catch blocks on the left
    for zs in (1, -1):
        z = zs * BAR_Z
        if s > 0:
            for x0, x1 in ((1.0, 1.3), (2.2, 2.5)):
                p.box(x0, x1, f - 0.27, f - 0.05, z - 0.2, z + 0.2, M["frame"])
                p.cyl((x0 + 0.15, f - 0.28, z + 0.13), (0, 1, 0), 0.03, 0.03, M["steel"], segs=16)
                p.cyl((x0 + 0.15, f - 0.28, z - 0.13), (0, 1, 0), 0.03, 0.03, M["steel"], segs=16)
        else:
            p.box(-1.25, -0.75, f - 0.27, f - 0.05, z - 0.22, z + 0.22, M["frame"])
            for zz in (z + 0.14, z - 0.14):
                p.cyl((-1.0, f - 0.28, zz), (0, 1, 0), 0.03, 0.03, M["steel"], segs=16)

    door = p.build(bevel=0.014)

    # locking pins on this half (they slide outward into the ring when unlocked)
    for k, a in enumerate(PIN_ANGLES):
        if (math.cos(a) < 0) != (s < 0):
            continue
        pin = Part(f"Pin_{k}")
        d = Vector((math.cos(a), 0, math.sin(a)))
        pin.cyl(d * 0.97 + Vector((0, f - 0.09, 0)), d, 0.055, 0.22, M["steel"], segs=24)
        pin.build(bevel=0.008, parent=door)

    # the two cross-bars live on the right door and slide +X to release
    if s > 0:
        for i, zs in enumerate((1, -1)):
            z = zs * BAR_Z
            bar = Part(f"Bolt_{i}")
            bar.box(-0.95, 2.75, f - 0.21, f - 0.09, z - 0.1, z + 0.1, M["steel"])
            bar.box(2.75, 2.9, f - 0.24, f - 0.06, z - 0.15, z + 0.15, M["gun"])  # handle block
            bar.cyl((2.98, f - 0.15, z), (1, 0, 0), 0.06, 0.16, M["steel"], segs=24)
            bar.build(bevel=0.01, parent=door)
    return door


door_l = build_door(-1)
door_r = build_door(1)

seam = Part("SeamGlow")
seam.box(-0.004, 0.004, DOOR_FRONT - 0.002, DOOR_FRONT + 0.2, -DOOR_H, DOOR_H, M["glow"])
seam_ob = seam.build(bevel=0)  # light leaking between the closed doors; hidden once they part

# ----------------------------------------------------------------------------- dial / vault handwheel
# Must stay behind FACADE_BACK (y > -0.82) so it slides into the pocket with DoorR.
dial = Part("Dial")
f = DOOR_FRONT
dial.cyl((0, f - 0.11, 0), (0, 1, 0), 0.9, 0.22, M["panel"], segs=128)
for i in range(90):  # knurled edge
    a = 2 * math.pi * i / 90
    rot = Matrix.Rotation(-a, 4, "Y")
    m = Matrix.Translation((0.9 * math.cos(a), f - 0.11, 0.9 * math.sin(a))) @ rot
    res = bmesh.ops.create_cube(dial.bm, size=1.0, matrix=m @ Matrix.Diagonal((0.04, 0.2, 0.028, 1)))
    dial._finish(res["verts"], M["steel"], smooth=False)
dial.ring(0.55, 0.82, f - 0.24, f - 0.22, 0, 2 * math.pi, M["gun"], segs=128)
dial.box(-0.016, 0.016, f - 0.25, f - 0.24, 0.6, 0.8, M["paint"])  # index mark
wy = f - 0.48
dial.cyl((0, (f - 0.22 + wy) / 2, 0), (0, 1, 0), 0.2, abs(wy - (f - 0.22)), M["steel"], segs=64)  # hub
dial.cyl((0, wy - 0.04, 0), (0, 1, 0), 0.24, 0.08, M["gun"], segs=64)  # hub nut
dial.cyl((0, wy - 0.085, 0), (0, 1, 0), 0.12, 0.015, M["steel"], segs=64)  # cap
dial.torus((0, wy, 0), 0.72, 0.05, M["steel"], segs=128)
for i in range(4):
    a = math.radians(45 + 90 * i)
    d = Vector((math.cos(a), 0, math.sin(a)))
    dial.cyl(d * 0.46 + Vector((0, wy, 0)), d, 0.042, 0.56, M["steel"], segs=24)
for i in range(12):  # grip knuckles around the rim
    a = 2 * math.pi * i / 12
    d = Vector((math.cos(a), 0, math.sin(a)))
    dial.sphere(d * 0.72 + Vector((0, wy, 0)), 0.068, M["steel"], segs=20)
dial_ob = dial.build(bevel=0.008)


# ----------------------------------------------------------------------------- preview rig (not exported)
scene = bpy.context.scene
cam_data = bpy.data.cameras.new("Camera")
cam_data.sensor_fit = "VERTICAL"
cam_data.angle = math.radians(35)
cam = bpy.data.objects.new("Camera", cam_data)
cam.location = (1.2, -17.5, 0.5)
cam.rotation_euler = (math.radians(90 - 1.6), 0, math.radians(3.9))
scene.collection.objects.link(cam)
scene.camera = cam


def add_light(name, kind, loc, energy, color=(1, 1, 1), size=None, rot=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if size and kind == "AREA":
        ld.size = size
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    if rot:
        ob.rotation_euler = rot
    scene.collection.objects.link(ob)
    return ob


# Mirrors the web lighting (GateCanvas.tsx): soft top key, cool side fill, faint coral rim, warm spill inside.
add_light("Key", "AREA", (-3, -9, 8), 3000, size=7, rot=(math.radians(52), 0, math.radians(-20)))
add_light("Fill", "AREA", (10, -8, 0.5), 700, color=(0.86, 0.9, 0.96), size=6, rot=(math.radians(85), 0, math.radians(52)))
add_light("Rim", "AREA", (-11, -3, -2), 260, color=(1, 0.3, 0.19), size=4, rot=(math.radians(95), 0, math.radians(-75)))
add_light("Spill", "POINT", (0, 4, 0), 400, color=(1, 0.55, 0.42))

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
if world.node_tree is None:
    world.use_nodes = True
bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
if bg:
    bg.inputs["Color"].default_value = (0.0045, 0.005, 0.0055, 1)
    bg.inputs["Strength"].default_value = 1.0

scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"

# ----------------------------------------------------------------------------- export
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for ob in scene.objects:
    if ob.type == "MESH":
        ob.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_image_format="JPEG",
    export_jpeg_quality=88,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
)
print(f"[gate] exported {GLB_PATH} ({os.path.getsize(GLB_PATH) / 1024:.0f} KB)")

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
print(f"[gate] saved {BLEND_PATH}")


def render(path, open_amount=0.0):
    for ob, sx in ((door_l, -1), (door_r, 1)):
        ob.location.x = sx * DOOR_TRAVEL * open_amount
    dial_ob.location.x = door_r.location.x
    seam_ob.hide_render = open_amount > 0
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"[gate] preview {path}")


if RENDER:
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    try:
        render(PREVIEW_PATH)
        render(PREVIEW_OPEN_PATH, open_amount=0.45)
    except Exception as exc:  # preview is optional
        print(f"[gate] preview skipped: {exc}")
    render_reset = (door_l, door_r, dial_ob)
    for ob in render_reset:
        ob.location.x = 0

for ob in sorted(scene.objects, key=lambda o: o.name):
    print(f"[gate] {ob.name:12s} parent={ob.parent.name if ob.parent else '-'}")
