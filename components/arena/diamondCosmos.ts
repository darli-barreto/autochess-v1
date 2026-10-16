import * as THREE from 'three';

/** Procedural atmosphere, not an extracted WoW asset. All particles remain
 * beneath the arena, so the board and placement guides always occlude them. */
export function createDiamondCosmos(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.name = 'diamond-cosmos';
  group.visible = false;
  const positions: number[] = [];
  const phases: number[] = [];
  let seed = 7219;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 4200; i++) {
    positions.push((random() - .5) * 140, -9 - random() * 20, (random() - .5) * 120);
    phases.push(random() * Math.PI * 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float phase;
      uniform float time;
      uniform float pixelRatio;
      varying float brightness;
      void main() {
        vec3 p = position;
        p.x += sin(time * .035 + phase) * .5;
        p.z += cos(time * .025 + phase) * .5;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((180. + 220. * pow(sin(phase), 8.)) / -mv.z, 1.8, 8.) * pixelRatio;
        brightness = .7 + .25 * sin(time * .45 + phase);
      }`,
    fragmentShader: `
      varying float brightness;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.;
        float glow = exp(-radius * radius * 8.) * smoothstep(1., .7, radius);
        gl_FragColor = vec4(mix(vec3(.5,.65,1.), vec3(1.,.94,.85), glow), glow * brightness);
      }`,
  });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  group.add(stars);
  const skyGeometry = new THREE.PlaneGeometry(240, 240);
  const skyMaterial = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 uvSky;
      void main() { uvSky = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 uvSky; uniform float time;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      float fbm(vec2 p) {
        float v=0., a=.5;
        for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.1;a*=.5;}
        return v;
      }
      vec3 galaxy(vec2 p, vec2 center, float size, float angle) {
        p=(p-center)/size; p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
        p.y*=2.4;
        float r=length(p), theta=atan(p.y,p.x);
        float arms=pow(.5+.5*sin(theta*2.-r*10.),3.);
        float disk=exp(-r*3.)*(.3+arms*.7);
        return vec3(.28,.32,.55)*disk + vec3(.8,.65,.4)*exp(-r*14.);
      }
      void main() {
        vec2 p=(uvSky-.5)*10.;
        float dust=fbm(p*4.+vec2(time*.001,0));
        float band=exp(-pow((p.y-p.x*.5-1.2+(dust-.5)*.7)*2.,2.));
        float clouds=fbm(p*12.);
        float lanes=smoothstep(.3,.7,fbm(p*8.+15.));
        vec3 color=vec3(.008,.012,.032);
        color+=band*mix(vec3(.065,.035,.14),vec3(.23,.3,.4),clouds)*(.25+lanes);
        color+=vec3(.025,.012,.06)*dust;
        color+=galaxy(p,vec2(-1.15,1.7),.32,.6);
        color+=galaxy(p,vec2(1.3,1.6),.3,-.4);
        gl_FragColor=vec4(color,1.);
      }`,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.rotation.x = -Math.PI / 2;
  sky.position.y = -34;
  sky.renderOrder = -2;
  stars.renderOrder = -1;
  group.add(sky);
  // Distant planets share the background's depth, never the playable floor.
  const planetGeometry = new THREE.SphereGeometry(1, 48, 32);
  const planetMaterials: THREE.ShaderMaterial[] = [];
  for (const [x, y, z, radius, hue] of [[-20,-12,-30,2.4,0],[23,-12,-29,1.5,1]]) {
    const planetMaterial = new THREE.ShaderMaterial({
      uniforms: { hue: { value: hue } },
      vertexShader: `varying vec3 n; varying vec3 p;
        void main(){n=normalize(normalMatrix*normal);p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 n; varying vec3 p; uniform float hue;
        void main(){
          float light=max(0.,dot(normalize(n),normalize(vec3(-.7,.7,1.))));
          float bands=.5+.5*sin(p.y*30.+sin(p.x*9.)*1.2);
          vec3 base=mix(vec3(.06,.18,.38),vec3(.3,.16,.1),hue);
          vec3 color=base*(.6+bands*.4)*(.035+light);
          float rim=pow(1.-abs(normalize(n).z),3.);
          color+=mix(vec3(.12,.35,.65),vec3(.4,.22,.12),hue)*rim*light;
          gl_FragColor=vec4(color,1.);
        }`,
    });
    planetMaterials.push(planetMaterial);
    const planet=new THREE.Mesh(planetGeometry,planetMaterial);
    planet.position.set(x,y,z); planet.scale.setScalar(radius);
    group.add(planet);
  }
  scene.add(group);
  return {
    update(elapsed: number, enabled: boolean, pixelRatio: number) {
      group.visible = enabled;
      if (!enabled) return;
      material.uniforms.time.value = elapsed;
      material.uniforms.pixelRatio.value = pixelRatio;
      skyMaterial.uniforms.time.value = elapsed;
    },
    dispose() {
      scene.remove(group);
      geometry.dispose(); material.dispose();
      skyGeometry.dispose(); skyMaterial.dispose();
      planetGeometry.dispose(); planetMaterials.forEach(material => material.dispose());
    },
  };
}
