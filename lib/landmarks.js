import * as THREE from 'three';
import { heightAt, LANDMARKS } from './terrain';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: false, ...extra });

function mesh(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function azadi(L) {
  const g = new THREE.Group();
  const h = heightAt(L.x, L.z);
  const white = mat(0xf1ece0);
  g.add(mesh(new THREE.BoxGeometry(15, 0.4, 15), mat(0xb9b2a2), 0, h + 0.2, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 7, 3), white, -3.4, h + 3.9, 0));
  g.add(mesh(new THREE.BoxGeometry(2.4, 7, 3), white, 3.4, h + 3.9, 0));
  g.add(mesh(new THREE.BoxGeometry(9.2, 2.2, 3), white, 0, h + 8.0, 0));
  g.add(mesh(new THREE.ConeGeometry(2.6, 2.6, 4), mat(0x4d8f8a), 0, h + 10.4, 0));
  g.children.forEach((c) => (c.position.x += L.x, c.position.z += L.z));
  return g;
}

function milad(L) {
  const g = new THREE.Group();
  const h = heightAt(L.x, L.z);
  g.add(mesh(new THREE.CylinderGeometry(0.5, 1.2, 24, 48), mat(0xe8e8e8), L.x, h + 12, L.z));
  g.add(mesh(new THREE.CylinderGeometry(2.7, 1.7, 2.8, 48), mat(0xcfd6dc), L.x, h + 22.5, L.z));
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.4, 11, 24), mat(0xd9392b), L.x, h + 29, L.z));
  return g;
}

function label(text, x, y, z) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 80;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(22,35,27,0.82)';
  const r = 22;
  ctx.beginPath();
  ctx.moveTo(r, 4); ctx.lineTo(320 - r, 4); ctx.quadraticCurveTo(316, 4, 316, r);
  ctx.lineTo(316, 76 - r); ctx.quadraticCurveTo(316, 76, 320 - r, 76);
  ctx.lineTo(r, 76); ctx.quadraticCurveTo(4, 76, 4, 76 - r);
  ctx.lineTo(4, r); ctx.quadraticCurveTo(4, 4, r, 4);
  ctx.fill();
  ctx.fillStyle = '#f4f7ef';
  ctx.font = 'bold 34px Vazirmatn, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(text, 160, 42);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
  sp.scale.set(15, 3.75, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 10;
  return sp;
}

export function buildLandmarks(scene) {
  const group = new THREE.Group();
  const heights = { azadi: 13.5, milad: 36 };
  for (const L of LANDMARKS) {
    if (L.id === 'azadi') group.add(azadi(L));
    if (L.id === 'milad') group.add(milad(L));
    const y = heightAt(L.x, L.z) + (heights[L.id] || 5);
    group.add(label(L.name, L.x, y, L.z));
  }
  scene.add(group);
  return group;
}
