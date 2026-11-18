// Turns the city layout into three.js meshes: ground, roads with centre
// dashes, sidewalks, low-poly buildings with lit windows, palms, lamps, the
// beach and the sea, plus sun, sky and fog. One shared material per colour
// keeps the draw calls cheap.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

function box(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  return mesh;
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c8b898';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#274b6d';
  for (let y = 6; y < 122; y += 16) {
    for (let x = 6; x < 58; x += 14) {
      g.fillRect(x, y, 9, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCityMeshes(city) {
  const group = new THREE.Group();
  const half = CITY.half;
  const pitch = CITY.blockSize + CITY.roadWidth;

  // Ground: grass base, then road slabs, then sidewalk slabs on each block.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 120, half * 2 + 120),
    new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  group.add(ground);

  // Sea to the south-west, sand beach between it and the city.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 200, 90),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.08, half + 55);
  group.add(sea);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 120, 26),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.06, half + 4);
  group.add(sand);

  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const dashMat = new THREE.MeshLambertMaterial({ color: PALETTE.roadLine });

  for (let i = 0; i <= CITY.blocks; i += 1) {
    const c = -half + CITY.roadWidth / 2 + i * pitch;
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, half * 2), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(c, 0, 0);
    group.add(vRoad);
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.roadWidth), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0, c);
    group.add(hRoad);
    // Centre dashes along both directions.
    for (let s = -half + 8; s < half - 4; s += 12) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(c, 0.02, s);
      group.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
      d2.rotation.x = -Math.PI / 2;
      d2.position.set(s, 0.02, c);
      group.add(d2);
    }
  }

  // Sidewalk slabs and park lawns.
  for (let bx = 0; bx < CITY.blocks; bx += 1) {
    for (let bz = 0; bz < CITY.blocks; bz += 1) {
      const cx = -half + CITY.roadWidth + bx * pitch + CITY.blockSize / 2;
      const cz = -half + CITY.roadWidth + bz * pitch + CITY.blockSize / 2;
      const slab = new THREE.Mesh(new THREE.PlaneGeometry(CITY.blockSize, CITY.blockSize), walkMat);
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(cx, 0.01, cz);
      group.add(slab);
    }
  }
  for (const park of city.parks) {
    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(park.size, park.size),
      new THREE.MeshLambertMaterial({ color: 0x4a9a3d }),
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(park.x, 0.03, park.z);
    group.add(lawn);
  }

  // Buildings: a box with a window texture, plus a flat roof cap.
  const winTex = windowTexture();
  for (const b of city.buildings) {
    const mat = new THREE.MeshLambertMaterial({ map: winTex, color: b.color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    group.add(mesh);
    const roof = box(b.w + 0.6, 0.5, b.d + 0.6, 0x5a4a3a);
    roof.position.set(b.x, b.h + 0.25, b.z);
    group.add(roof);
    // A few tall towers get a rooftop beacon.
    if (b.h > 34) {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff4040 }),
      );
      beacon.position.set(b.x, b.h + 1.2, b.z);
      beacon.name = 'beacon';
      group.add(beacon);
    }
  }

  // Palms: trunk cylinder plus four crossed leaf planes, cheap and readable.
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf, side: THREE.DoubleSide });
  for (const p of city.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
    trunk.position.set(p.x, 2.5, p.z);
    group.add(trunk);
    for (let a = 0; a < 4; a += 1) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.2), leafMat);
      leaf.position.set(p.x, 5.1, p.z);
      leaf.rotation.y = (a * Math.PI) / 2;
      leaf.rotation.z = 0.5;
      group.add(leaf);
    }
  }

  // Street lamps: pole plus glowing head.
  for (const l of city.lamps) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }));
    pole.position.set(l.x, 3, l.z);
    group.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
    head.position.set(l.x, 6.1, l.z);
    group.add(head);
  }

  // Sun, sky and fog: bright midday, warm light, long view distance.
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.6);
  sun.position.set(120, 180, 60);
  group.add(sun);
  group.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.1));

  return group;
}

export function makeSky(scene) {
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);
}
