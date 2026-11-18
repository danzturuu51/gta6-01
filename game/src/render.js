// The three.js stage: renderer, third-person camera, the player character,
// the objective beacon, and the frame loop's camera work. The game logic
// lives in main.js; this module only owns the pixels.

import * as THREE from 'three';
import { makeSky } from './city.js';

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = 'webgl';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  makeSky(scene);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, canvas: renderer.domElement };
}

// Rico Vale on foot: jacket, jeans, hair — simple boxes, readable at distance.
export function buildPlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }));
  jacket.position.y = 1.12;
  group.add(jacket);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xd8a070 }));
  head.position.y = 1.78;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.46),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  hair.position.y = 2.02;
  group.add(hair);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x2a3448 }));
  legs.position.y = 0.34;
  group.add(legs);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }));
  armL.position.set(-0.48, 1.1, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.48;
  group.add(armR);
  group.userData.armL = armL;
  group.userData.armR = armR;
  group.userData.legs = legs;
  return group;
}

// A tall glowing pillar plus a floating diamond: the objective, visible
// across the whole city so the player always knows where to go.
export function buildBeacon() {
  const group = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd23e, transparent: true, opacity: 0.28,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  pillar.position.y = 30;
  group.add(pillar);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  gem.position.y = 7;
  gem.name = 'gem';
  group.add(gem);
  group.visible = false;
  return group;
}

// Smooth third-person camera: behind the player on foot, higher and further
// back in a car, always looking slightly ahead of the movement.
export function updateCamera(camera, focus, heading, distance, height, dt, smooth) {
  const k = Math.min(1, dt * (smooth || 6));
  const bx = focus.x - Math.sin(heading) * distance;
  const bz = focus.z - Math.cos(heading) * distance;
  const by = focus.y + height;
  camera.position.x += (bx - camera.position.x) * k;
  camera.position.y += (by - camera.position.y) * k;
  camera.position.z += (bz - camera.position.z) * k;
  camera.lookAt(focus.x + Math.sin(heading) * 6, focus.y + 1.5, focus.z + Math.cos(heading) * 6);
}
