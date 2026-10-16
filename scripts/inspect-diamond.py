import bpy, json, os
from mathutils import Vector
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'public/Arenas/Arena-Diamante.glb'))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(p) for o in objects for p in o.bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
print('MODEL_BOUNDS', list(lo), list(hi))
print('OBJECTS', [(o.name,len(o.data.vertices),len(o.data.polygons)) for o in objects])
print('MATERIALS', [m.name for m in bpy.data.materials])
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=12
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.24,.32,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.light_add(type='SUN',location=(0,-40,120));bpy.context.object.rotation_euler=(.4,-.5,-.4);bpy.context.object.data.energy=2
center=(lo+hi)/2
bpy.ops.object.camera_add(location=center+Vector((0,-200,155)))
camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=max(hi.x-lo.x,hi.y-lo.y)*1.2;scene.camera=camera
scene.render.filepath=os.path.join(ROOT,'art/diamante/original.png');bpy.ops.render.render(write_still=True)
with open(os.path.join(ROOT,'art/diamante/source-report.json'),'w') as f:json.dump({'bounds':[list(lo),list(hi)],'materials':[m.name for m in bpy.data.materials]},f,indent=2)
