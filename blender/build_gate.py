"""
Builds the intro vault gate for the portfolio and exports it for the web.

Run headless (from the repo root):
    blender --background --factory-startup --python blender/build_gate.py

or open Blender > Scripting > open this file > Run Script (it clears the current scene).

Outputs
    public/models/gate.glb   -> loaded by src/components/gate/GateCanvas.tsx
    blender/gate.blend       -> editable source scene (camera + lights for previews)
    blender/preview.png      -> quick render (headless runs only)

Node names are the contract with the web code -- keep them if you edit the model:
    Wall, Frame, StatusLight, SeamGlow, Dial,
    DoorL (children Pin_*), DoorR (children Pin_*, Bolt_0, Bolt_1)

Blender is Z-up and the gate faces -Y. The glTF exporter converts to Y-up, so in three.js
the gate faces +Z, X stays X, and the dial spins around Z.
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

# ----------------------------------------------------------------------------- paths
try:
    HERE = os.path.dirname(os.path.abspath(__file__))
except NameError:  # run from Blender's text editor
    HERE = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.getcwd()
ROOT = os.path.dirname(HERE) if os.path.basename(HERE) == "blender" else HERE
GLB_PATH = os.path.join(ROOT, "public", "models", "gate.glb")
BLEND_PATH = os.path.join(ROOT, "blender", "gate.blend")
PREVIEW_PATH = os.path.join(ROOT, "blender", "preview.png")

# ----------------------------------------------------------------------------- dimensions
OPEN_W, OPEN_H = 4.05, 2.65  # half-size of the frame opening
FRAME_W, FRAME_H = 5.4, 3.4  # half-size of the frame outside
DOOR_W, DOOR_H = 4.0, 2.62  # each door is DOOR_W wide; doors meet at x = 0
DOOR_FRONT = -0.2  # front face of the door slabs (towards the camera = -Y)
SEAM = 0.006
BAR_Z = 2.0  # height of the two locking cross-bars
PIN_ANGLES = [math.radians(22.5 + 45 * k) for k in range(8)]


# ----------------------------------------------------------------------------- helpers
def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(coll):
            coll.remove(block)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))


def make_material(name, color, metallic, roughness, emission=None, strength=0.0):
    m = bpy.data.materials.new(name)
    if m.node_tree is None:  # pre-5.0 Blender
        m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*hex_rgb(color), 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = (*hex_rgb(emission), 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
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
        self._finish(res["verts"], mat)

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

    def torus(self, center, major, minor, mat, segs=96, minor_segs=12):
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

    def build(self, bevel=0.012, parent=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
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
            mod.segments = 2
            mod.limit_method = "ANGLE"
            mod.angle_limit = math.radians(35)
            mod.harden_normals = True
        if parent:
            ob.parent = parent
        return ob


# ----------------------------------------------------------------------------- materials
clear_scene()
M = {
    "wall": make_material("Wall", "#0f1012", 0.3, 0.85),
    "frame": make_material("Frame", "#18191c", 0.9, 0.45),
    "gun": make_material("Gunmetal", "#202227", 1.0, 0.38),
    "panel": make_material("Panel", "#16171b", 0.95, 0.55),
    "steel": make_material("Steel", "#9a9ea6", 1.0, 0.22),
    "tick": make_material("Tick", "#c9ccd2", 0.6, 0.35),
    "accent": make_material("Accent", "#ff4d30", 0.0, 0.4, emission="#ff4d30", strength=3.0),
    # Shared by SeamGlow + StatusLight; the web code animates its emissive intensity on unlock.
    "glow": make_material("Glow", "#ff4d30", 0.0, 0.4, emission="#ff4d30", strength=1.0),
}

# ----------------------------------------------------------------------------- wall
wall = Part("Wall")
wall.box(-40, -FRAME_W, 0.0, 0.6, -30, 30, M["wall"])
wall.box(FRAME_W, 40, 0.0, 0.6, -30, 30, M["wall"])
wall.box(-FRAME_W, FRAME_W, 0.0, 0.6, FRAME_H, 30, M["wall"])
wall.box(-FRAME_W, FRAME_W, 0.0, 0.6, -30, -FRAME_H, M["wall"])
for sx in (-1, 1):  # pilasters + kick plates either side of the frame
    wall.box(sx * 6.0, sx * 6.6, -0.12, 0.0, -30, 30, M["frame"])
    wall.box(sx * 7.6, sx * 7.75, -0.05, 0.0, -30, 30, M["frame"])
wall.box(-6.6, 6.6, -0.12, 0.0, FRAME_H + 0.5, FRAME_H + 0.9, M["frame"])  # lintel
wall.box(-6.6, 6.6, -0.12, 0.0, -FRAME_H - 0.9, -FRAME_H - 0.5, M["frame"])  # sill
wall.build(bevel=0.02)

# ----------------------------------------------------------------------------- frame
frame = Part("Frame")
fy0, fy1 = -0.55, 0.5
frame.box(-FRAME_W, FRAME_W, fy0, fy1, OPEN_H, FRAME_H, M["frame"])
frame.box(-FRAME_W, FRAME_W, fy0, fy1, -FRAME_H, -OPEN_H, M["frame"])
frame.box(-FRAME_W, -OPEN_W, fy0, fy1, -OPEN_H, OPEN_H, M["frame"])
frame.box(OPEN_W, FRAME_W, fy0, fy1, -OPEN_H, OPEN_H, M["frame"])
# raised trim around the opening
t = 0.12
frame.box(-OPEN_W - t, OPEN_W + t, fy0 - 0.06, fy0, OPEN_H, OPEN_H + t, M["gun"])
frame.box(-OPEN_W - t, OPEN_W + t, fy0 - 0.06, fy0, -OPEN_H - t, -OPEN_H, M["gun"])
frame.box(-OPEN_W - t, -OPEN_W, fy0 - 0.06, fy0, -OPEN_H, OPEN_H, M["gun"])
frame.box(OPEN_W, OPEN_W + t, fy0 - 0.06, fy0, -OPEN_H, OPEN_H, M["gun"])
# hex bolt heads along the frame
mid_h = (OPEN_H + FRAME_H) / 2
mid_w = (OPEN_W + FRAME_W) / 2
for i in range(13):
    x = -4.8 + i * 0.8
    if abs(x) < 0.9:
        continue  # leave room for the status light
    for z in (mid_h, -mid_h):
        frame.cyl((x, fy0 - 0.03, z), (0, 1, 0), 0.07, 0.08, M["steel"], segs=6)
for i in range(7):
    z = -2.4 + i * 0.8
    for x in (mid_w, -mid_w):
        frame.cyl((x, fy0 - 0.03, z), (0, 1, 0), 0.07, 0.08, M["steel"], segs=6)
# status light housing
frame.box(-0.75, 0.75, fy0 - 0.08, fy0, mid_h - 0.12, mid_h + 0.12, M["panel"])
frame.build()

status = Part("StatusLight")
status.box(-0.6, 0.6, fy0 - 0.11, fy0 - 0.08, mid_h - 0.035, mid_h + 0.035, M["glow"])
status.build(bevel=0)


# ----------------------------------------------------------------------------- doors
def build_door(side):
    """side = -1 (left) or +1 (right). Geometry is in world space; object stays at origin."""
    s = side
    p = Part("DoorL" if s < 0 else "DoorR")
    X = lambda a, b: (min(s * a, s * b), max(s * a, s * b))  # noqa: E731  mirror an |x| range
    f = DOOR_FRONT

    p.box(*X(SEAM, DOOR_W), f, 0.2, -DOOR_H, DOOR_H, M["gun"])  # slab
    p.box(*X(SEAM, 0.08), f - 0.04, f, -DOOR_H, DOOR_H, M["gun"])  # raised seam edge

    # side panel with ribs
    p.box(*X(1.65, 3.75), f - 0.06, f, -1.35, 1.35, M["gun"])
    p.box(*X(1.8, 3.6), f - 0.09, f - 0.06, -1.2, 1.2, M["panel"])
    for z in (-0.8, -0.4, 0.0, 0.4, 0.8):
        p.box(*X(1.95, 3.45), f - 0.11, f - 0.09, z - 0.025, z + 0.025, M["gun"])

    # top / bottom plates that carry the cross-bars
    for zs in (1, -1):
        p.box(*X(0.25, 3.75), f - 0.05, f, *sorted((zs * 1.55, zs * 2.45)), M["panel"])

    # rivets along the outer edge and top/bottom
    for i in range(15):
        z = -2.45 + i * 0.35
        p.cyl((s * 3.88, f - 0.02, z), (0, 1, 0), 0.04, 0.05, M["steel"], segs=12)
    for i in range(11):
        x = 0.35 + i * 0.345
        for z in (2.52, -2.52):
            p.cyl((s * x, f - 0.02, z), (0, 1, 0), 0.04, 0.05, M["steel"], segs=12)
    for x in (1.72, 3.68):  # panel corners
        for z in (1.27, -1.27):
            p.cyl((s * x, f - 0.07, z), (0, 1, 0), 0.035, 0.04, M["steel"], segs=12)

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
                p.cyl((x0 + 0.15, f - 0.28, z + 0.13), (0, 1, 0), 0.03, 0.03, M["steel"], segs=12)
                p.cyl((x0 + 0.15, f - 0.28, z - 0.13), (0, 1, 0), 0.03, 0.03, M["steel"], segs=12)
        else:
            p.box(-1.25, -0.75, f - 0.27, f - 0.05, z - 0.22, z + 0.22, M["frame"])
            p.box(-1.2, -0.8, f - 0.28, f - 0.27, z - 0.04, z + 0.04, M["accent"])  # catch indicator

    door = p.build()

    # locking pins on this half (they slide outward into the ring when unlocked)
    for k, a in enumerate(PIN_ANGLES):
        if (math.cos(a) < 0) != (s < 0):
            continue
        pin = Part(f"Pin_{k}")
        d = Vector((math.cos(a), 0, math.sin(a)))
        pin.cyl(d * 0.97 + Vector((0, f - 0.09, 0)), d, 0.055, 0.22, M["steel"], segs=16)
        pin.build(bevel=0.008, parent=door)

    # the two cross-bars live on the right door and slide +X to release
    if s > 0:
        for i, zs in enumerate((1, -1)):
            z = zs * BAR_Z
            bar = Part(f"Bolt_{i}")
            bar.box(-0.95, 2.75, f - 0.21, f - 0.09, z - 0.1, z + 0.1, M["steel"])
            bar.box(2.75, 2.9, f - 0.24, f - 0.06, z - 0.15, z + 0.15, M["gun"])  # handle block
            bar.cyl((2.98, f - 0.15, z), (1, 0, 0), 0.06, 0.16, M["steel"], segs=16)
            bar.build(bevel=0.01, parent=door)
    return door


door_l = build_door(-1)
door_r = build_door(1)

seam = Part("SeamGlow")
seam.box(-0.004, 0.004, DOOR_FRONT - 0.002, DOOR_FRONT + 0.2, -DOOR_H, DOOR_H, M["glow"])
seam.build(bevel=0)

# ----------------------------------------------------------------------------- dial / vault wheel
dial = Part("Dial")
f = DOOR_FRONT
dial.cyl((0, f - 0.11, 0), (0, 1, 0), 0.9, 0.22, M["panel"], segs=96)
for i in range(72):  # knurled edge
    a = 2 * math.pi * i / 72
    rot = Matrix.Rotation(-a, 4, "Y")
    m = Matrix.Translation((0.9 * math.cos(a), f - 0.11, 0.9 * math.sin(a))) @ rot
    res = bmesh.ops.create_cube(dial.bm, size=1.0, matrix=m @ Matrix.Diagonal((0.05, 0.2, 0.035, 1)))
    dial._finish(res["verts"], M["steel"], smooth=False)
dial.ring(0.55, 0.82, f - 0.24, f - 0.22, 0, 2 * math.pi, M["gun"], segs=96)
dial.box(-0.018, 0.018, f - 0.255, f - 0.24, 0.6, 0.8, M["accent"])  # pointer
wy = f - 0.42
dial.cyl((0, (f - 0.22 + wy - 0.12) / 2, 0), (0, 1, 0), 0.22, abs(wy - 0.12 - (f - 0.22)), M["steel"], segs=48)  # hub
dial.cyl((0, wy - 0.14, 0), (0, 1, 0), 0.13, 0.05, M["accent"], segs=48)  # hub cap
dial.torus((0, wy, 0), 0.72, 0.045, M["steel"])
for i in range(4):
    a = math.radians(45 + 90 * i)
    d = Vector((math.cos(a), 0, math.sin(a)))
    dial.cyl(d * 0.44 + Vector((0, wy, 0)), d, 0.045, 0.88, M["steel"], segs=16)
    dial.sphere(d * 0.9 + Vector((0, wy, 0)), 0.085, M["steel"])
dial.build(bevel=0.01)

# ----------------------------------------------------------------------------- preview rig (not exported)
scene = bpy.context.scene
cam_data = bpy.data.cameras.new("Camera")
cam_data.sensor_fit = "VERTICAL"
cam_data.angle = math.radians(35)
cam = bpy.data.objects.new("Camera", cam_data)
cam.location = (0, -17.5, 0)
cam.rotation_euler = (math.radians(90), 0, 0)
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


add_light("Key", "AREA", (3, -10, 7), 2500, size=6, rot=(math.radians(60), 0, math.radians(15)))
add_light("Fill", "AREA", (-9, -6, 1), 600, color=(0.87, 0.89, 0.92), size=5, rot=(math.radians(80), 0, math.radians(-55)))
add_light("Rim", "AREA", (9, -4, -2), 300, color=(1, 0.3, 0.19), size=4, rot=(math.radians(95), 0, math.radians(60)))

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
if world.node_tree is None:
    world.use_nodes = True
bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
if bg:
    bg.inputs["Color"].default_value = (0.004, 0.0045, 0.005, 1)
    bg.inputs["Strength"].default_value = 1.0

scene.render.resolution_x, scene.render.resolution_y = 1600, 900

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
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
)
print(f"[gate] exported {GLB_PATH} ({os.path.getsize(GLB_PATH) / 1024:.0f} KB)")

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
print(f"[gate] saved {BLEND_PATH}")

if bpy.app.background:
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    for candidate in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"):
        if candidate in engines:
            try:
                scene.render.engine = candidate
                break
            except TypeError:
                pass
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = 32
    scene.render.filepath = PREVIEW_PATH
    try:
        bpy.ops.render.render(write_still=True)
        print(f"[gate] preview {PREVIEW_PATH} ({scene.render.engine})")
    except Exception as exc:  # no GPU context etc. -- preview is optional
        print(f"[gate] preview skipped: {exc}")

for ob in sorted(scene.objects, key=lambda o: o.name):
    print(f"[gate] {ob.name:12s} parent={ob.parent.name if ob.parent else '-'}")
