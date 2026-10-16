// Geometry regression check without a browser. Decode real GLBs and raycast
// every board cell. Textures are omitted here; the game loads embedded textures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = path.resolve(import.meta.dirname, '..');
const moduleURL = relative => pathToFileURL(path.join(root, relative)).href;
const compile = (file, replacements) => {
  let source = ts.transpile(fs.readFileSync(path.join(root, file), 'utf8'), {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020,
  });
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(`from "${from}"`, `from "${to}"`).replaceAll(`from '${from}'`, `from '${to}'`);
  return 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
};
const threeURL = moduleURL('node_modules/three/build/three.module.js');
const configURL = compile('components/arena/arenaConfig.ts', { three: threeURL });
const hexURL = compile('engine/hexMath.ts', { '@/components/arena/arenaConfig': configURL });
const arenaURL = compile('components/arena/wowArenas.ts', {
  three: threeURL,
  './arenaConfig': configURL,
  '@/engine/hexMath': hexURL,
  'three/examples/jsm/loaders/GLTFLoader.js': moduleURL('node_modules/three/examples/jsm/loaders/GLTFLoader.js'),
  'three/examples/jsm/loaders/DRACOLoader.js': moduleURL('node_modules/three/examples/jsm/loaders/DRACOLoader.js'),
});
const { WOW_ARENAS, fitArenaToBoard, disposeArena } = await import(arenaURL);
const layoutURL = compile('components/arena/wowArenaLayout.ts', { three: threeURL, '@/engine/hexMath': hexURL, './arenaConfig': configURL });
const { getArenaBenchPosition, getArenaCamera } = await import(layoutURL);
const { BOARD_ROWS, BOARD_COLS, axialToWorld3D, rowColToAxial, } = await import(hexURL);
const environmentURL = compile('components/arena/arenaEnvironment.ts', { three: threeURL, './arenaConfig': configURL });
const { setupArenaLights, applyArenaAppearance } = await import(environmentURL);
const lightingScene = new THREE.Scene();
setupArenaLights(lightingScene);
const rendererSettings = {};
applyArenaAppearance(lightingScene, rendererSettings, 'Diamante');
assert.equal(rendererSettings.toneMapping, THREE.AgXToneMapping);
assert.equal(rendererSettings.toneMappingExposure, 1);
assert.equal(lightingScene.getObjectByName('ambient').intensity, 0.18);
applyArenaAppearance(lightingScene, rendererSettings, 'Oro');
assert.equal(rendererSettings.toneMapping, THREE.ACESFilmicToneMapping);
for (const light of lightingScene.getObjectByName('arena-light-rig').children) assert.equal(light.intensity, light.userData.baseIntensity);
console.log('Lighting: Diamond profile and restoration verified');
const gridsURL = compile('components/arena/arenaGrids.ts', { three: threeURL, './arenaConfig': configURL, '@/engine/hexMath': hexURL });
const { createBoardHexes, createAllyBenchHexes, createEnemyBenchHexes, setPlacementGridVisible, findPlacementTarget, createDragHighlightMesh, showPlacementTarget } = await import(gridsURL);
const interactionScene = new THREE.Scene();
const board = createBoardHexes(interactionScene);
const bench = createAllyBenchHexes(interactionScene);
const enemyBench = createEnemyBenchHexes(interactionScene);
const guideVisible = mesh => mesh.getObjectByName('placement-guide').visible;
assert.ok([...board.values(), ...bench, ...enemyBench].every(mesh => !guideVisible(mesh) && !mesh.material.colorWrite && !mesh.material.depthWrite));
setPlacementGridVisible(board, bench, true);
assert.equal([...board.values()].filter(guideVisible).length, 28);
assert.equal(bench.filter(guideVisible).length, 9);
assert.equal(enemyBench.filter(guideVisible).length, 0);
setPlacementGridVisible(board, bench, false);
interactionScene.updateMatrixWorld(true);
const cell = [...board.values()].find(mesh => mesh.userData.row === 6);
const picker = new THREE.Raycaster(cell.position.clone().add(new THREE.Vector3(0, 10, 0)), new THREE.Vector3(0, -1, 0));
assert.ok(picker.intersectObject(cell).length, 'Hidden grid must remain clickable');
const benchPosition = index => getArenaBenchPosition('Diamante', index);
const boardTarget = findPlacementTarget(cell.position, benchPosition);
assert.equal(boardTarget.kind, 'board');
assert.equal(findPlacementTarget(benchPosition(4), benchPosition).kind, 'bench');
assert.equal(findPlacementTarget({ x: 100, z: 100 }, benchPosition), null, 'Outside movement clears the target');
assert.equal(findPlacementTarget(axialToWorld3D(rowColToAxial(0, 3)), benchPosition), null, 'Enemy territory is not a destination');
const highlight = createDragHighlightMesh(interactionScene);
showPlacementTarget(highlight, boardTarget);
assert.ok(highlight.visible && highlight.getObjectByName('target-board').visible);
showPlacementTarget(highlight, findPlacementTarget(benchPosition(4), benchPosition));
assert.ok(highlight.getObjectByName('target-bench').visible && !highlight.getObjectByName('target-board').visible);
showPlacementTarget(highlight, null);
assert.equal(highlight.visible, false);
assert.ok([...board.values(), ...bench, ...enemyBench].every(mesh => !guideVisible(mesh)));
console.log('Placement: idle invisibility, legal guides, picking, bench targets and cancellation verified');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'node_modules/three/examples/jsm/libs/draco/draco_decoder.js'), 'utf8'), context);
const draco = await context.DracoDecoderModule();
globalThis.ProgressEvent ??= class ProgressEvent {};
const loader = new GLTFLoader().setDRACOLoader({
  preload() {},
  decodeDracoFile(buffer, callback, attributes) {
    const decoder = new draco.Decoder();
    const mesh = new draco.Mesh();
    const data = new draco.DecoderBuffer();
    data.Init(new Int8Array(buffer), buffer.byteLength);
    const status = decoder.DecodeBufferToMesh(data, mesh);
    assert.ok(status.ok(), 'Draco decode failed');
    const geometry = new THREE.BufferGeometry();
    for (const [name, id] of Object.entries(attributes)) {
      const attribute = decoder.GetAttributeByUniqueId(mesh, id);
      const values = new draco.DracoFloat32Array();
      decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
      const array = Float32Array.from({ length: values.size() }, (_, i) => values.GetValue(i));
      geometry.setAttribute(name, new THREE.BufferAttribute(array, attribute.num_components()));
      draco.destroy(values);
    }
    const face = new draco.DracoInt32Array();
    const indices = [];
    for (let i = 0; i < mesh.num_faces(); i++) {
      decoder.GetFaceFromMesh(mesh, i, face);
      for (let j = 0; j < 3; j++) indices.push(face.GetValue(j));
    }
    geometry.setIndex(indices);
    for (const value of [face, mesh, data, decoder]) draco.destroy(value);
    callback(geometry);
  },
});

for (const rank of WOW_ARENAS) {
  const bytes = fs.readFileSync(path.join(root, `public/Arenas/Arena-${rank}${rank === 'Diamante' ? '-Autochess' : ''}.glb`));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  assert.ok(json.images.every(image => image.bufferView !== undefined), `${rank}: textures must be embedded`);
  delete json.images;
  delete json.textures;
  json.materials = json.materials.map(material => ({ name: material.name, doubleSided: true }));
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + bytes.subarray(28 + jsonLength).toString('base64');
  const { scene } = await loader.parseAsync(JSON.stringify(json), '');
  fitArenaToBoard(scene, rank);
  const positions = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) positions.push(axialToWorld3D(rowColToAxial(row, col)));
  }
  for (let i = 0; i < 9; i++) positions.push(getArenaBenchPosition(rank, i), getArenaBenchPosition(rank, i, true));
  for (const position of positions) {
    const ray = new THREE.Raycaster(new THREE.Vector3(position.x, 100, position.z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(scene, true)[0];
    assert.ok(hit, `${rank}: missing floor at ${JSON.stringify(position)}`);
    assert.ok(hit.point.y < 0.15, `${rank}: obstacle at ${JSON.stringify(position)} (height ${hit.point.y})`);
    assert.ok(hit.point.y > -1.2, `${rank}: floor too far below board`);
  }
  if (rank === 'Diamante') {
    const towers=[];
    let originalFloor=false;
    scene.traverse(object => {
      if (object.name.includes('WoW_exterior_temple')) towers.push(object);
      if (object.isMesh && object.name.includes('uninterrupted_level_floor')) {
        const materials=Array.isArray(object.material)?object.material:[object.material];
        originalFloor=materials.some(material=>material.name==='mat_9vl_valkyr_covenantsanctum01_2888613');
      }
    });
    assert.equal(towers.length, 2, 'Diamond needs both complete exterior temple ensembles');
    for (const temple of towers) {
      const bounds = new THREE.Box3().setFromObject(temple);
      assert.ok(temple.name.includes('Left') ? bounds.max.x < -12.9 : bounds.min.x > 14.1, 'Exterior architecture must remain outside the entire platform');
    }
    assert.ok(originalFloor, 'The court must reuse the original WoW floor material');
    // At desktop aspect, both benches must remain outside the HUD's shop band.
    const view = getArenaCamera(rank);
    const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 1000);
    camera.position.copy(view.defaultPosition);
    camera.lookAt(view.defaultLookAt);
    camera.updateMatrixWorld();
    for (const enemy of [false, true]) for (let i = 0; i < 9; i++) {
      const p = getArenaBenchPosition(rank, i, enemy);
      const screen = new THREE.Vector3(p.x, 0, p.z).project(camera);
      const screenY = (1 - screen.y) / 2;
      assert.ok(screenY > 0.12 && screenY < 0.80, 'Diamond bench overlaps header/shop');
      assert.ok(Math.abs(screen.x) < 0.82, 'Diamond bench overlaps side HUD');
    }
  }
  disposeArena(scene);
  console.log(`${rank}: ${positions.length} board/bench positions covered and unobstructed`);
}
