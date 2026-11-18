import * as THREE from 'three';
import { heightAt, LANDMARKS, M } from './terrain';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, ...extra });

function mesh(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ابعاد به متر واقعی ساخته می‌شن و بعد گروه به 1/M کوچیک می‌شه
function azadi(L) {
  const g = new THREE.Group();
  g.userData.id = 'azadi';
  const white = mat(0xf1ece0);
  g.add(mesh(new THREE.BoxGeometry(110, 6, 110), mat(0xb9b2a2), 0, -3, 0));      // سکو
  g.add(mesh(new THREE.BoxGeometry(9, 28, 15), white, -27, 14, 0));               // پایه‌ها
  g.add(mesh(new THREE.BoxGeometry(9, 28, 15), white, 27, 14, 0));
  g.add(mesh(new THREE.BoxGeometry(63, 8, 15), white, 0, 32, 0));                 // تیر بالا (عرض ۶۳ م)
  g.add(mesh(new THREE.ConeGeometry(12.7, 9, 4), mat(0x4d8f8a), 0, 40.5, 0));     // نوک تا ۴۵ م
  g.position.set(L.x, heightAt(L.x, L.z), L.z);
  g.scale.setScalar(1 / M);
  return g;
}

function milad(L) {
  const g = new THREE.Group();
  g.userData.id = 'milad';
  g.add(mesh(new THREE.CylinderGeometry(18, 18, 8, 12), mat(0xb9b2a2), 0, -4, 0));          // پی
  g.add(mesh(new THREE.CylinderGeometry(7, 14, 250, 10), mat(0xe8e8e8), 0, 125, 0));        // تنه ۰–۲۵۰
  g.add(mesh(new THREE.CylinderGeometry(28, 14, 40, 12), mat(0xcfd6dc), 0, 270, 0));        // کپسول پایین ۲۵۰–۲۹۰
  g.add(mesh(new THREE.CylinderGeometry(20, 28, 25, 12), mat(0xcfd6dc), 0, 302.5, 0));      // کپسول بالا ۲۹۰–۳۱۵
  g.add(mesh(new THREE.CylinderGeometry(0.8, 3, 120, 6), mat(0xd9392b), 0, 375, 0));        // آنتن ۳۱۵–۴۳۵
  g.position.set(L.x, heightAt(L.x, L.z), L.z);
  g.scale.setScalar(1 / M);
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
  sp.scale.set(4, 1, 1);
  sp.userData.isLabel = true;
  sp.position.set(x, y, z);
  sp.renderOrder = 10;
  return sp;
}

export function buildLandmarks(scene) {
  const group = new THREE.Group();
  for (const L of LANDMARKS) {
    if (L.id === 'azadi') group.add(azadi(L));
    if (L.id === 'milad') group.add(milad(L));
    const y = heightAt(L.x, L.z) + (L.top + 25) / M;
    group.add(label(L.name, L.x, y, L.z));
  }
  scene.add(group);
  return group;
}

// اندازه‌ی تابلو روی صفحه ثابت می‌مونه
export function updateLabels(group, camera) {
  for (const o of group.children) {
    if (!o.userData.isLabel) continue;
    const k = camera.position.distanceTo(o.position) * 0.05;
    o.scale.set(k * 4, k, 1);
  }
}
