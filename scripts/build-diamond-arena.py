"""Build an editable autochess courtyard from the supplied WoW Diamond GLB.
Run with Blender --background --python scripts/build-diamond-arena.py.
The original GLB is never overwritten. Coordinates below use the game's Y-up axes.
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'art', 'diamante')
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'public/Arenas/Arena-Diamante.glb'))
source = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
archive = bpy.data.collections.new('00 · Original WoW (reference, hidden)');bpy.context.scene.collection.children.link(archive)
original = source.copy();original.data=source.data.copy();archive.objects.link(original)
archive.hide_render=True;archive.hide_viewport=True
original.name='Original Diamond · untouched'
asset = bpy.data.collections.new('01 · Diamond Autochess');bpy.context.scene.collection.children.link(asset)
for collection in list(source.users_collection):collection.objects.unlink(source)
asset.objects.link(source)
source.name='WoW temple · adapted rear architecture'
# Bring the temple behind the enemy bench and shorten its monumental vertical
# proportions. Preserve the original UVs, materials and recognizable silhouette.
world=source.matrix_world.copy()
for vertex in source.data.vertices:
    p=world @ vertex.co
    x=p.x*.14+.6; z=-p.y*.14-11.3; height=(p.z+8)*.14-.65
    if height>2:height=2+(height-2)*.28
    if height<-2:height=-2+(height+2)*.16
    vertex.co=(x,-z,height)
source.matrix_world=Matrix.Identity(4)

def material(name,color,metal=0,rough=.65,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF')
    if bs is None:
        m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    if emission:
        bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    return m
stone=bpy.data.materials['mat_9vl_valkyr_covenantsanctum01_2888613']
edge=material('Diamond · carved midnight stone',(.065,.12,.18),.25)
gold=material('Diamond · antique champagne inlay',(.53,.39,.19),.65,.35)
lightstone=material('Diamond · pale marble',(.49,.59,.63),.12)
blue=material('Diamond · lapis enamel',(.045,.18,.29),.4,.3)
cyan=material('Diamond · soul crystal',(.06,.61,.85),.3,.22,1.0)
crest=material('Diamond · engraved insignia',(.20,.31,.39),.25)
def adopt(obj,name,mat):
    obj.name=name
    for col in list(obj.users_collection):col.objects.unlink(obj)
    asset.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def cube(name,x,y,z,w,h,d,mat,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=adopt(bpy.context.object,name,mat);o.scale=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Stone edge bevel','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    if mat == stone:
        uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
        for loop in o.data.loops:
            p=o.matrix_world @ o.data.vertices[loop.vertex_index].co
            uv.data[loop.index].uv=(p.x/3.5,p.y/3.5)
    return o

def cylinder(name,x,y,z,r,depth,mat,vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=(x,-z,y))
    return adopt(bpy.context.object,name,mat)

def poly(name,coords,mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([(x,-z,y) for x,y,z in coords],[],[tuple(range(len(coords)))]);mesh.update()
    ob=bpy.data.objects.new(name,mesh);asset.objects.link(ob);ob.data.materials.append(mat);return ob

def ring(name,x,z,outer,inner,y,mat,n=8,angle=math.pi/8):
    verts=[];faces=[]
    for r in [outer,inner]:
        verts += [(x+math.cos(angle+i*2*math.pi/n)*r,-z-math.sin(angle+i*2*math.pi/n)*r,y) for i in range(n)]
    for i in range(n):faces.append((i,(i+1)%n,(i+1)%n+n,i+n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);asset.objects.link(o);mesh.materials.append(mat)

# Broad chamfered plinth and an open apron reserved below the player's bench.
base=cube('Floating courtyard · structural base',.6,-1.55,1.0,27,1.4,23,edge,.65)
cube('Courtyard · continuous perimeter walkway',.6,-.34,-.35,26.6,.35,19.6,stone,.55)
cube('Combat court · dark border',.6,-.21,.7,17.8,.22,11.6,edge,.22)
cube('Combat court · gold perimeter',.6,-.075,.7,17.40,.035,11.2,gold,.12)
cube('Combat court · uninterrupted level floor',.6,-.065,.7,17.20,.03,11.0,stone,.1)
# Angular corner engravings keep the middle quiet for combat readability.
for sx in [-1,1]:
    for sz in [-1,1]:
        x=.6+sx*7.75;z=.7+sz*4.85
        poly('Court · corner filigree',[(x,-.03,z),(x-sx*1.5,-.03,z),(x-sx*1.5,-.03,z-sz*.07),(x-sx*.18,-.03,z-sz*.07),(x-sx*.18,-.03,z-sz*1.15),(x,-.03,z-sz*1.15)],gold)
# Quiet engraved diamond medallion. No baked hex grid: gameplay draws its own.
ring('Central octagonal engraving',.6,.7,2.45,2.39,-.027,crest)
for sign in [-1,1]:
    poly('Diamond crest · wing',[(.6+sign*.12,-.025,-1.1),(.6+sign*2.1,-.025,.7),(.6+sign*.12,-.025,2.5),(.6+sign*.83,-.025,.7)],crest)
poly('Diamond crest · heart',[(.6,-.022,-.45),(1.43,-.022,.7),(.6,-.022,1.85),(-.23,-.022,.7)],blue)
ring('Diamond crest · fine inner inlay',.6,.7,1.12,1.075,-.019,gold,n=4,angle=0)
# Two independent bench ledges, each with exactly nine generous unit positions.
for label,z in [('Ally',7.5),('Enemy',-6.1)]:
    cube(label+' bench · foundation',.6,-.27,z,16.4,.38,1.85,edge,.13)
    cube(label+' bench · bronze rim',.6,-.10,z,16.10,.08,1.66,gold,.07)
    for i in range(9):
        x=.6+(i-4)*1.65
        cube(f'{label} bench · seat {i+1:02}',x,-.055,z,1.57,.055,1.44,blue,.07)
        # Thin diamond on each seat makes capacity legible without heavy hexes.
        ring(f'{label} bench · seat glyph {i+1:02}',x,z,.19,.15,-.023,gold,n=4,angle=0)
    for x in [-7.6,8.8]:
        cylinder(label+' bench · endcap',x,-.08,z,.44,.22,lightstone)
        ring(label+' bench · endcap trim',x,z,.39,.32,.035,gold)
# Strategist seats and lateral economic display plinths (visual placeholders).
for label,x,z in [('Ally',-9.6,5.6),('Enemy',10.8,-4.2)]:
    cylinder(label+' tactician · base',x,-.22,z,1.25,.45,edge)
    cylinder(label+' tactician · marble seat',x,-.005,z,1.08,.12,lightstone)
    ring(label+' tactician · gold ring',x,z,1.0,.91,.061,gold)
    ring(label+' tactician · soul ring',x,z,.77,.74,.063,cyan)
for side,x in [('Ally',-9.7),('Enemy',10.9)]:
    zs=[-3.4,-1.85,-.3,1.25,2.8] if side=='Ally' else [-2.6,-1.05,.5,2.05,3.6]
    cube(side+' gold · gallery',x,-.16,.0,1.8,.24,9,edge,.15)
    for i,z in enumerate(zs):
        cylinder(f'{side} gold · plinth {i+1}',x,.005,z,.64,.23,blue,4)
        ring(f'{side} gold · plinth trim {i+1}',x,z,.55,.49,.123,gold,n=4,angle=0)
# Low corner architecture keeps the playable area visible from the fixed camera.
for x in [-11.3,12.5]:
    for z in [-7.6,8.1]:
        cylinder('Crystal shrine · foot',x,-.02,z,.95,.6,edge)
        cylinder('Crystal shrine · marble',x,.36,z,.68,.2,lightstone)
        cylinder('Crystal shrine · gold collar',x,.52,z,.54,.12,gold)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,-z,1.22))
        crystal=adopt(bpy.context.object,'Diamond soul crystal',cyan);crystal.scale=(.34,.34,.85)
        for dx in [-.52,.52]:
            pillar=cube('Shrine · prismatic fin',x+dx,.82,z,.16,.95,.32,gold,.025)
            pillar.rotation_euler[1]=(-1 if dx<0 else 1)*.15
# Complete copies of the selected temple ensemble, outside the platform.
# Rotate their entrances inward; retain every original UV/material and mesh face.
for label,angle,boundary in [('Left',math.pi/2,-13.15),('Right',-math.pi/2,14.35)]:
    mesh=source.data.copy()
    rotation=Matrix.Rotation(angle,4,'Z')
    for vertex in mesh.vertices:
        vertex.co=rotation @ Vector((vertex.co.x*.55,vertex.co.y*.55,vertex.co.z))
    lo=Vector(tuple(min(v.co[i] for v in mesh.vertices) for i in range(3)))
    hi=Vector(tuple(max(v.co[i] for v in mesh.vertices) for i in range(3)))
    offset=Vector((boundary-(hi.x if label=='Left' else lo.x),-(lo.y+hi.y)/2+1.0,0))
    for vertex in mesh.vertices:vertex.co+=offset
    temple=bpy.data.objects.new('WoW exterior temple · '+label,mesh)
    asset.objects.link(temple)
    print('EXTERIOR_TEMPLE',label,list(lo+offset),list(hi+offset))
# Side rails are low; the front remains open as in the reference arenas.
for x in [-12.25,13.45]:
    cube('Outer balustrade · stone',x,.08,.2,.42,.48,12.8,edge,.1)
    cube('Outer balustrade · cap',x,.34,.2,.52,.12,12.9,gold,.045)
for i in range(3):
    cube('Forecourt · descending step',.6,-.32-i*.14,9.1+i*.65,16.0+i*.8,.18,.72,lightstone,.045)
cube('Forecourt · shop-safe apron',.6,-.62,11.05,20.8,.18,2.3,stone,.24)
# Export only the adapted asset; editable original stays in the .blend archive.
bpy.ops.object.select_all(action='DESELECT')
for obj in asset.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=source
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/Arenas/Arena-Diamante-Autochess.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
# A matching presentation camera, retained in the editable file but not the GLB.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Diamond · blue atmosphere');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.15,.22,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.object.light_add(type='AREA',location=(-9,-5,18));bpy.context.object.name='Studio · soft key';bpy.context.object.data.energy=2400;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=14
bpy.ops.object.light_add(type='AREA',location=(10,10,14));bpy.context.object.name='Studio · blue rim';bpy.context.object.data.energy=1800;bpy.context.object.data.color=(.46,.7,1);bpy.context.object.data.size=10
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.35,-.4,-.3);bpy.context.object.data.energy=1.4
bpy.ops.object.camera_add(location=(.6,-29.012,28.314));camera=bpy.context.object;camera.name='Autochess · gameplay camera'
target=Vector((.6,-1.4,0));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32;camera.data.lens=32/(2*math.tan(math.radians(16)));scene.camera=camera
scene.view_settings.view_transform='AgX'
# Start in camera view when the user opens the .blend.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Arena-Diamante-Autochess.blend'))
scene.render.filepath=os.path.join(OUT,'preview.png');bpy.ops.render.render(write_still=True)
print('DIAMOND_BUILD_COMPLETE')
