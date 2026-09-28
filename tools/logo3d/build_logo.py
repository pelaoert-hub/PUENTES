"""Logo 3D de Puentes — fuente durable.

Traduce icons/icon.svg (40x34 unidades) a 3D:
  X = (x_svg - 20) / 10      Z = (17 - y_svg) / 10      Y negativo = hacia la camara.

Uso:
  blender --background --factory-startup --python build_logo.py -- OUT_DIR [--no-render] [--azul=#002A8F]

Para la web, comprimir el GLB (conservando las piezas separadas) y copiarlo:
  npx @gltf-transform/cli@4 optimize OUT_DIR/puentes-logo.glb web/3d/puentes-logo.glb \
      --compress meshopt --texture-compress false --simplify false \
      --join false --instance false --flatten false --palette false
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.dirname(os.path.abspath(__file__))
RENDER = "--no-render" not in argv
# Azul de la bandera de Cespedes: turqui (oficial desde 1983) por defecto.
AZUL = next((a.split("=", 1)[1] for a in argv if a.startswith("--azul=")), "#002A8F")
os.makedirs(OUT, exist_ok=True)

# ---------- Paleta (la misma del SVG) ----------
def srgb(hexs):
    h = hexs.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)

COL = {
    "badge": "#0E2A2E", "cream": "#F5EFE1", "red": "#CC1126", "sky": AZUL,
    "navy": "#0A3161", "stone": "#EFE3CC", "coral": "#E2604B", "gold": "#D9A441",
}

def mat(name, hexs, rough=0.45, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(hexs)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = srgb(hexs)
        b.inputs["Emission Strength"].default_value = emit
    return m

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
M = {k: mat(k, v) for k, v in COL.items()}
M["coral"] = mat("coral", COL["coral"], rough=0.25, emit=0.35)
M["gold"] = mat("gold", COL["gold"], rough=0.2, emit=0.35)
M["bead"] = mat("bead", COL["cream"], rough=0.3, emit=0.6)
M["stone"] = mat("stone", COL["stone"], rough=0.7)
# Ladrillo encalado del Yayabo, muestreado de una foto real (Wikimedia Commons).
M["bridge"] = mat("bridge", "#CFB792", rough=0.85)
M["rail"] = mat("rail", "#BDB4A5", rough=0.8)
M["water"] = mat("water", "#1A828A", rough=0.15)

def link(obj):
    scene.collection.objects.link(obj)
    return obj

# ---------- Utilidades de geometria ----------
def rounded_rect(x0, x1, z0, z1, r, seg=8):
    """Poligono XZ con esquinas redondeadas (sentido antihorario)."""
    pts = []
    corners = [(x1 - r, z0 + r, -90), (x1 - r, z1 - r, 0), (x0 + r, z1 - r, 90), (x0 + r, z0 + r, 180)]
    for cx, cz, a0 in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts

def prism(name, pts, y0, y1, material, bevel=0.0):
    """Extruye un poligono XZ entre y0 (frente) e y1 (fondo)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    front = [bm.verts.new((x, y0, z)) for x, z in pts]
    back = [bm.verts.new((x, y1, z)) for x, z in pts]
    bm.faces.new(front[::-1] if y0 < y1 else front)
    bm.faces.new(back if y0 < y1 else back[::-1])
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    ob.data.materials.append(material)
    if bevel:
        mod = ob.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel; mod.segments = 2; mod.limit_method = "ANGLE"
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob

def box(name, x0, x1, z0, z1, y0, y1, material, bevel=0.0):
    return prism(name, [(x0, z0), (x1, z0), (x1, z1), (x0, z1)], y0, y1, material, bevel)

def sv(x, y):
    """Convierte coordenadas del SVG a XZ."""
    return ((x - 20) / 10, (17 - y) / 10)

# ---------- Placa ----------
# Sigue el dibujo grande de la portada (index.html, .horizon): banderas con
# estrella, puente del Yayabo jorobado de cinco arcos y el rio debajo.
BADGE_R = 0.7
badge = prism("Badge", rounded_rect(-2, 2, -1.7, 1.7, BADGE_R), -0.2, 0.2, M["badge"], bevel=0.05)

clip = prism("_clip", rounded_rect(-2, 2, -1.7, 1.7, BADGE_R), -0.5, 0.5, M["badge"])
clip.hide_render = True; clip.hide_viewport = True

GAP = 0.018
FY0, FY1 = -0.27, -0.19      # frente y fondo de las baldosas

def clipped(ob):
    b_ = ob.modifiers.new("Clip", "BOOLEAN")
    b_.operation = "INTERSECT"; b_.object = clip; b_.solver = "EXACT"
    ob.modifiers.move(len(ob.modifiers) - 1, 0)
    return ob

def tile(name, x0, x1, z0, z1, material, y0=FY0, y1=FY1):
    return clipped(box(name, x0 + GAP, x1 - GAP, z0 + GAP, z1 - GAP, y0, y1, material, bevel=0.012))

def star(name, cx, cz, R, y0, y1, material, rot=90):
    pts = []
    for i in range(10):
        rr = R if i % 2 == 0 else R * 0.4
        a = math.radians(rot + 36 * i)
        pts.append((cx + rr * math.cos(a), cz + rr * math.sin(a)))
    return prism(name, pts, y0, y1, material, bevel=0.008)

FLAG_TOP, FLAG_BOT, WATER_BOT = 1.7, -0.7, -1.7
MID = (FLAG_TOP + FLAG_BOT) / 2          # 0.5

# Bandera de Cespedes (La Demajagua, 1868): blanco | rojo con estrella, azul abajo
tile("Flag_Cespedes_Cream", -2, -1, MID, FLAG_TOP, M["cream"])
tile("Flag_Cespedes_Red", -1, 0, MID, FLAG_TOP, M["red"])
tile("Flag_Cespedes_Sky", -2, 0, FLAG_BOT, MID, M["sky"])
star("Flag_Cespedes_Star", -0.5, (MID + FLAG_TOP) / 2, 0.3, FY0 - 0.05, FY0 + 0.01, M["cream"])

# Bandera actual de Cuba: cinco franjas, triangulo rojo y estrella
stripe_h = (FLAG_TOP - FLAG_BOT) / 5
for i in range(5):
    z1 = FLAG_TOP - i * stripe_h
    tile(f"Flag_Cuba_Stripe{i}", 0, 2, z1 - stripe_h, z1, M["navy"] if i % 2 == 0 else M["cream"])
TRI_APEX = 1.05
tri = clipped(prism("Flag_Cuba_Triangle", [(0, FLAG_BOT), (TRI_APEX, MID), (0, FLAG_TOP)], -0.31, -0.25, M["red"], bevel=0.012))
star("Flag_Cuba_Star", 0.33, MID, 0.27, -0.36, -0.29, M["cream"])

# El rio Yayabo
tile("Water", -2, 2, WATER_BOT, FLAG_BOT, M["water"], y0=-0.24, y1=-0.19)

# ---------- Puente del Yayabo ----------
BR_W = 1.78                     # medio ancho
BR_BASE = -1.32
BR_END, BR_MID = -0.46, -0.08   # altura del lomo en las orillas y al centro
BR_Y0, BR_Y1 = -0.62, -0.26

def lomo(x):
    """Perfil jorobado: alto al centro, baja hacia las orillas."""
    u = min(1.0, abs(x) / BR_W)
    return BR_END + (BR_MID - BR_END) * math.cos(u * math.pi / 2) ** 0.8

# Cinco arcos, mas bajos hacia las orillas (como en la portada).
SPAN = 2 * BR_W / 5
ARCOS = [(-2, 0.52), (-1, 0.68), (0, 0.84), (1, 0.68), (2, 0.52)]
ARCH_RX = SPAN * 0.40

perfil = []
N_TOP = 40
for i in range(N_TOP + 1):                       # lomo, de izquierda a derecha
    x = -BR_W + 2 * BR_W * i / N_TOP
    perfil.append((x, lomo(x)))
perfil.append((BR_W, BR_BASE))
for k, ry in reversed(ARCOS):                    # base con arcos, de derecha a izquierda
    cx = k * SPAN
    perfil.append((cx + ARCH_RX, BR_BASE))
    for j in range(1, 16):
        a = math.pi * j / 16
        perfil.append((cx + ARCH_RX * math.cos(a), BR_BASE + ry * math.sin(a)))
    perfil.append((cx - ARCH_RX, BR_BASE))
perfil.append((-BR_W, BR_BASE))
bridge = prism("Bridge", perfil, BR_Y0, BR_Y1, M["bridge"], bevel=0.015)

# Pretil dorado siguiendo el lomo
rail_top = [(x, z + 0.035) for x, z in perfil[:N_TOP + 1]]
rail_bot = [(x, z - 0.035) for x, z in reversed(perfil[:N_TOP + 1])]
prism("Bridge_Rail", rail_top + rail_bot, BR_Y0 - 0.03, BR_Y1 + 0.01, M["rail"], bevel=0.01)

# Tajamares: pilastras en punta que cortan la corriente
def tajamar(name, x):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    base = [(x - 0.1, BR_Y0), (x + 0.1, BR_Y0), (x, BR_Y0 - 0.2)]
    lo = [bm.verts.new((px, py, BR_BASE)) for px, py in base]
    hi = [bm.verts.new((px, py, BR_BASE + 0.34)) for px, py in base]
    top = bm.verts.new((x, BR_Y0 - 0.02, BR_BASE + 0.5))
    bm.faces.new(lo[::-1])
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
        bm.faces.new((hi[i], hi[j], top))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me)); ob.data.materials.append(M["bridge"])
    return ob
for n, k in enumerate((-1.5, -0.5, 0.5, 1.5)):
    tajamar(f"Bridge_Cutwater{n}", k * SPAN)

# ---------- Orbes y camino ----------
ORB_R = 0.24
ORB_Y = (BR_Y0 + BR_Y1) / 2
ORB_X = 1.3
coral_pos = Vector((-ORB_X, ORB_Y, lomo(ORB_X) + 0.035 + ORB_R))
gold_pos = Vector((ORB_X, ORB_Y, lomo(ORB_X) + 0.035 + ORB_R))
for name, pos, m_ in (("Orb_Coral", coral_pos, M["coral"]), ("Orb_Gold", gold_pos, M["gold"])):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=ORB_R, segments=28, ring_count=14, location=pos)
    o = bpy.context.object; o.name = name; o.data.materials.append(m_)
    bpy.ops.object.shade_smooth()

# Arco cuadratico por encima del puente; la web hace fluir las cuentas.
N_BEADS = 9
PEAK = 0.14
def arc_point(t):
    a = coral_pos + Vector((ORB_R * 0.9, 0, 0.05))
    b = gold_pos + Vector((-ORB_R * 0.9, 0, 0.05))
    mid = (a + b) / 2 + Vector((0, 0, PEAK))
    return (1 - t) ** 2 * a + 2 * (1 - t) * t * mid + t ** 2 * b
for i in range(N_BEADS):
    t = (i + 1) / (N_BEADS + 1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, segments=10, ring_count=6, location=arc_point(t))
    o = bpy.context.object; o.name = f"Bead_{i:02d}"; o.data.materials.append(M["bead"])
    bpy.ops.object.shade_smooth()

# ---------- Luces, camara, mundo ----------
def light(name, kind, loc, energy, size=2.0, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = color
    if kind == "AREA": d.size = size
    o = link(bpy.data.objects.new(name, d)); o.location = loc
    o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

light("Key", "AREA", (-3.5, -6, 4.5), 900, 4, (1.0, 0.96, 0.9))
light("Fill", "AREA", (5, -5, 0.5), 300, 5, (0.85, 0.93, 1.0))
light("Rim", "AREA", (0, 5, 3.5), 700, 4)

world = bpy.data.worlds.new("World"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = srgb("#0D5257")
world.node_tree.nodes["Background"].inputs[1].default_value = 0.6

cam_d = bpy.data.cameras.new("Cam"); cam_d.lens = 70
cam = link(bpy.data.objects.new("Camera", cam_d)); scene.camera = cam

def aim(loc, target=(0, 0, 0)):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 64
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "puentes-logo-3d.blend"))

# ---------- Export web ----------
for o in (clip,):
    o.select_set(False)
bpy.ops.object.select_all(action="DESELECT")
for o in scene.objects:
    if o.type == "MESH" and not o.name.startswith("_"):
        o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "puentes-logo.glb"), export_format="GLB",
                          use_selection=True, export_apply=True, export_yup=True,
                          export_lights=False, export_cameras=False)

# ---------- Renders ----------
if RENDER:
    views = {
        "hero": (-3.2, -13.5, 2.2),
        "frente": (0, -14, 0),
        "tres-cuartos": (5.5, -12.5, 1.8),
    }
    for name, loc in views.items():
        aim(loc, (0, 0, -0.05))
        scene.render.resolution_x, scene.render.resolution_y = 1200, 1000
        scene.render.film_transparent = False
        scene.render.filepath = os.path.join(OUT, f"render-{name}.png")
        bpy.ops.render.render(write_still=True)
    aim(views["hero"], (0, 0, -0.05))
    scene.render.resolution_x = scene.render.resolution_y = 1024
    scene.render.film_transparent = True
    scene.render.filepath = os.path.join(OUT, "puentes-logo-3d-transparente.png")
    bpy.ops.render.render(write_still=True)
print("LISTO", OUT)
