import * as THREE from 'three';
import { heightAt, fbm, mulberry32, WORLD, CITY_CENTER, LANDMARKS, S, cityMask, northBand, clamp as _clamp, smooth } from './terrain';
import { buildLandmarks } from './landmarks';

const SAVE_KEY = 'hezarshahr-save-v2';
const HOUSE_COST = 500;
const HOUSE_CAP = 20;
const INCOME_PER_RESIDENT = 0.5; // یورو در ثانیه

const clamp = _clamp;
const CELL = 3.2;
const cellKey = (x, z) => Math.round(x / CELL) + ',' + Math.round(z / CELL);

export class Game {
  constructor(container, { onState, onToast }) {
    this.container = container;
    this.onState = onState || (() => {});
    this.onToast = onToast || (() => {});
    this.disposed = false;
    this.buildMode = false;
    this.money = 5000;
    this.pop = 0;
    this.houses = [];
    this.popFrac = 0;
    this.incFrac = 0;
    this.dirty = false;
    this.saveTimer = 0;
    this.lastEmit = '';
    this.pointers = new Map();
    this.tap = null;
    this.gesture = null;

    this.initRenderer();
    this.initWorld();
    this.initInput();
    this.load();
    this.emit(true);

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ───────────────────────── رندر و دوربین ─────────────────────────
  initRenderer() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    const sky = new THREE.Color(0xcfe0ea);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 200, 700);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 2400);
    this.target = new THREE.Vector3(CITY_CENTER.x, 0, CITY_CENTER.z);
    this.yaw = 0.3;
    this.pitch = 0.95;
    this.dist = 150;

    this.onResize = () => {
      const W = this.container.clientWidth || window.innerWidth;
      const H = this.container.clientHeight || window.innerHeight;
      this.renderer.setSize(W, H);
      this.camera.aspect = W / H;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.onResize);
  }

  updateCamera() {
    const half = WORLD / 2 - 12;
    this.target.x = clamp(this.target.x, -half, half);
    this.target.z = clamp(this.target.z, -half, half);
    this.target.y = heightAt(this.target.x, this.target.z);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const p = this.camera.position;
    p.set(
      this.target.x + Math.sin(this.yaw) * cp * this.dist,
      this.target.y + sp * this.dist,
      this.target.z + Math.cos(this.yaw) * cp * this.dist
    );
    const minY = heightAt(p.x, p.z) + 4;
    if (p.y < minY) p.y = minY;
    this.camera.lookAt(this.target);

    // نور و سایه دنبال دوربین
    this.sun.position.set(this.target.x + 55, this.target.y + 90, this.target.z + 35);
    this.sun.target.position.copy(this.target);
    this.sun.target.updateMatrixWorld();
  }

  // ───────────────────────── دنیا ─────────────────────────
  initWorld() {
    const hemi = new THREE.HemisphereLight(0xdde9f2, 0x7a6a4a, 0.95);
    this.scene.add(hemi);

    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.sun = new THREE.DirectionalLight(0xfff0d2, 1.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 10; sc.far = 260;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);

    this.buildTerrain();
    this.buildGround();
    this.buildCity();
    this.buildTrees();
    this.landmarks = buildLandmarks(this.scene);
    this.buildAnimals();
    this.buildBirds();
    this.houseGroup = new THREE.Group();
    this.scene.add(this.houseGroup);
  }

  buildTerrain() {
    const SEG = 260;
    const geo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const sand = new THREE.Color(0x9cc46f);
    const plain = new THREE.Color(0x86b85a);
    const plain2 = new THREE.Color(0x73a84b);
    const foot = new THREE.Color(0x628f40);
    const foot2 = new THREE.Color(0x7d8a55);
    const rock = new THREE.Color(0x857a6c);
    const rock2 = new THREE.Color(0x9d968b);
    const snow = new THREE.Color(0xf2f4f5);
    const leaf = new THREE.Color(0x4f8a3a);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const n = fbm(x * 0.12, z * 0.12, 2);
      if (h < 3) c.copy(sand).lerp(plain, clamp(h / 3, 0, 1)).lerp(plain2, n * 0.6);
      else if (h < 10) c.copy(plain2).lerp(foot, (h - 3) / 7);
      else if (h < 22) c.copy(foot).lerp(foot2, (h - 10) / 12);
      else c.copy(foot2).lerp(rock, clamp((h - 22) / 10, 0, 1)).lerp(rock2, n * 0.5);
      const snowAmt = clamp((h + (n - 0.45) * 10 - 31) / 6, 0, 1);
      if (snowAmt > 0) c.lerp(snow, snowAmt);
      const g = northBand(x, z) * (1 - smooth(8, 14, h)) * 0.5;
      if (g > 0 && h > 1) c.lerp(leaf, g);
      c.offsetHSL(0, 0, (n - 0.45) * 0.08);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 1, metalness: 0 })
    );
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  buildGround() {
    // دشت بیرون از نقشه
    const geo = new THREE.PlaneGeometry(3600, 3600);
    geo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x7fae56, roughness: 1 }));
    ground.position.y = -3.4;
    this.scene.add(ground);
  }

  // ───────────────────────── شهر موجود ─────────────────────────
  buildCity() {
    // خونه‌های ثابت حذف شدن
    this.occupied = new Set();
    this.city = [];
    this.cityMesh = null;
  }

  removeCityAround(x, z, r) {
    let changed = false;
    for (const b of this.city) {
      if (b.gone) continue;
      if (Math.hypot(b.x - x, b.z - z) < r) {
        b.gone = true;
        this.cityMesh.setMatrixAt(b.i, this.zeroMatrix);
        changed = true;
      }
    }
    if (changed && this.cityMesh) this.cityMesh.instanceMatrix.needsUpdate = true;
  }

  buildTrees() {
    const rand = mulberry32(1337);
    const list = [];
    let attempts = 0;
    const MAX = 3600;
    while (list.length < MAX && attempts < 60000) {
      attempts++;
      const x = (rand() - 0.5) * WORLD * 0.96;
      const z = (rand() - 0.5) * WORLD * 0.96;
      const h = heightAt(x, z);
      if (h < 1.2 || h > 24) continue;
      if (this.occupied.has(cellKey(x, z))) continue;
      const slope = Math.abs(heightAt(x + 2, z) - h) + Math.abs(heightAt(x, z + 2) - h);
      if (slope > 4.5) continue;
      const green = 0.1 + 0.85 * northBand(x, z); // شمال تهران سرسبزتره
      const patch = fbm(x * 0.04 + 200, z * 0.04 + 200, 3);
      if (rand() > green * (0.4 + patch)) continue;
      const pine = h > 13 || rand() < 0.3;
      list.push({ x, z, h, s: 0.8 + rand() * 0.8, pine, r1: rand(), r2: rand() });
    }

    const round = list.filter((t) => !t.pine);
    const pines = list.filter((t) => t.pine);

    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 1.6, 10);
    const roundGeo = new THREE.IcosahedronGeometry(1.7, 2);
    const pineGeo = new THREE.ConeGeometry(1.6, 4.6, 20);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, flatShading: false });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false });

    this.trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, Math.max(1, list.length));
    this.roundMesh = new THREE.InstancedMesh(roundGeo, leafMat, Math.max(1, round.length));
    this.pineMesh = new THREE.InstancedMesh(pineGeo, leafMat.clone(), Math.max(1, pines.length));
    for (const m of [this.trunks, this.roundMesh, this.pineMesh]) {
      m.castShadow = true;
      m.receiveShadow = false;
      m.frustumCulled = false;
    }

    const d = new THREE.Object3D();
    const col = new THREE.Color();
    this.trees = [];
    let ti = 0;
    const place = (t, mesh, idx, yOff, scaleY) => {
      d.position.set(t.x, t.h + yOff * t.s, t.z);
      d.rotation.set(0, t.r1 * 6.28, 0);
      d.scale.set(t.s, t.s * scaleY, t.s);
      d.updateMatrix();
      mesh.setMatrixAt(idx, d.matrix);
    };
    round.forEach((t, i) => {
      place(t, this.trunks, ti, 0.8, 1);
      place(t, this.roundMesh, i, 2.6, 0.95 + t.r2 * 0.3);
      col.setHSL(0.22 + t.r2 * 0.08, 0.4, 0.28 + t.r1 * 0.12);
      this.roundMesh.setColorAt(i, col);
      this.trees.push({ x: t.x, z: t.z, ti, fi: i, kind: 'round' });
      ti++;
    });
    pines.forEach((t, i) => {
      place(t, this.trunks, ti, 0.8, 1);
      place(t, this.pineMesh, i, 3.5, 1);
      col.setHSL(0.38 + t.r2 * 0.04, 0.35, 0.2 + t.r1 * 0.09);
      this.pineMesh.setColorAt(i, col);
      this.trees.push({ x: t.x, z: t.z, ti, fi: i, kind: 'pine' });
      ti++;
    });
    this.trunks.count = ti;
    this.scene.add(this.trunks, this.roundMesh, this.pineMesh);
    this.zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  }

  removeTreesAround(x, z, r) {
    let changed = false;
    for (const t of this.trees) {
      if (t.gone) continue;
      if (Math.hypot(t.x - x, t.z - z) < r) {
        t.gone = true;
        this.trunks.setMatrixAt(t.ti, this.zeroMatrix);
        (t.kind === 'round' ? this.roundMesh : this.pineMesh).setMatrixAt(t.fi, this.zeroMatrix);
        changed = true;
      }
    }
    if (changed) {
      this.trunks.instanceMatrix.needsUpdate = true;
      this.roundMesh.instanceMatrix.needsUpdate = true;
      this.pineMesh.instanceMatrix.needsUpdate = true;
    }
  }

  // ───────────────────────── حیوانات و پرنده‌ها ─────────────────────────
  buildAnimals() {
    const rand = mulberry32(99);
    this.animals = [];
    const box = (w, h, d, color, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, flatShading: true }));
      m.position.set(x, y, z);
      m.castShadow = true;
      return m;
    };
    const make = (deer) => {
      const g = new THREE.Group();
      if (deer) {
        g.add(box(0.7, 0.8, 1.7, 0xa87b4f, 0, 1.25, 0));
        g.add(box(0.4, 1.0, 0.4, 0xa87b4f, 0, 1.9, 0.8));
        g.add(box(0.4, 0.4, 0.7, 0x8f6840, 0, 2.5, 1.0));
        for (const [lx, lz] of [[-0.22, -0.6], [0.22, -0.6], [-0.22, 0.6], [0.22, 0.6]]) g.add(box(0.14, 1.0, 0.14, 0x6e4e30, lx, 0.5, lz));
        g.userData.base = 0; g.userData.speed = 2.4;
      } else {
        g.add(box(0.9, 0.8, 1.3, 0xf2efe6, 0, 0.85, 0));
        g.add(box(0.45, 0.45, 0.45, 0x3a3a3a, 0, 1.05, 0.8));
        for (const [lx, lz] of [[-0.28, -0.4], [0.28, -0.4], [-0.28, 0.4], [0.28, 0.4]]) g.add(box(0.14, 0.5, 0.14, 0x3a3a3a, lx, 0.25, lz));
        g.userData.base = 0; g.userData.speed = 1.3;
      }
      return g;
    };
    let tries = 0;
    while (this.animals.length < 40 && tries < 1600) {
      tries++;
      const x = (rand() - 0.5) * WORLD * 0.8;
      const z = (rand() - 0.5) * WORLD * 0.8;
      const h = heightAt(x, z);
      if (h < 1.5 || h > 14 || cityMask(x, z) > 0.15) continue;
      const deer = this.animals.length % 4 === 3;
      const g = make(deer);
      g.position.set(x, h, z);
      this.scene.add(g);
      this.animals.push({ g, home: { x, z }, goal: null, wait: rand() * 3, speed: g.userData.speed });
    }
  }

  buildBirds() {
    const rand = mulberry32(7);
    this.birds = [];
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false });
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 1.0), mat);
      g.add(body);
      const mkWing = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.2, 0.05, 0);
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.7), mat);
        w.position.x = side * 0.8;
        pivot.add(w);
        return pivot;
      };
      const wl = mkWing(-1), wr = mkWing(1);
      g.add(wl, wr);
      this.scene.add(g);
      this.birds.push({
        g, wl, wr,
        cx: (rand() - 0.5) * 120 * S, cz: (rand() - 0.2) * 100 * S,
        r: 14 + rand() * 26, a: rand() * 6.28, w: 0.25 + rand() * 0.2, hOff: 16 + rand() * 10, ph: rand() * 6,
      });
    }
  }

  updateCreatures(dt, t) {
    const rand = Math.random;
    for (const an of this.animals) {
      const g = an.g;
      if (an.wait > 0) {
        an.wait -= dt;
        g.position.y = heightAt(g.position.x, g.position.z);
        continue;
      }
      if (!an.goal) {
        for (let k = 0; k < 6; k++) {
          const gx = an.home.x + (rand() - 0.5) * 36;
          const gz = an.home.z + (rand() - 0.5) * 36;
          const gh = heightAt(gx, gz);
          if (gh > 1.0 && gh < 16) { an.goal = { x: gx, z: gz }; break; }
        }
        if (!an.goal) { an.wait = 2; continue; }
      }
      const dx = an.goal.x - g.position.x, dz = an.goal.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.6) { an.goal = null; an.wait = 1.5 + rand() * 4; continue; }
      const step = Math.min(dist, an.speed * dt);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.position.y = heightAt(g.position.x, g.position.z) + Math.abs(Math.sin(t * 7 + an.home.x)) * 0.06;
      g.rotation.y = Math.atan2(dx, dz);
    }
    for (const b of this.birds) {
      b.a += b.w * dt;
      const x = b.cx + Math.cos(b.a) * b.r;
      const z = b.cz + Math.sin(b.a) * b.r;
      const y = Math.max(heightAt(x, z) + 12, 24) + Math.sin(t * 0.8 + b.ph) * 1.5 + b.hOff * 0.1;
      b.g.position.set(x, y, z);
      b.g.rotation.y = -b.a;
      const f = Math.sin(t * 9 + b.ph) * 0.6;
      b.wl.rotation.z = -f;
      b.wr.rotation.z = f;
    }
  }

  // ───────────────────────── ساخت خانه ─────────────────────────
  setBuildMode(on) {
    this.buildMode = !!on;
  }

  makeHouse(x, z, seed) {
    const hs = [heightAt(x - 1.7, z - 1.7), heightAt(x + 1.7, z - 1.7), heightAt(x - 1.7, z + 1.7), heightAt(x + 1.7, z + 1.7)];
    const minH = Math.min(...hs);
    const walls = [0xe9e4d8, 0xd2dbe6, 0xf0d9b5, 0xe3d0cf];
    const g = new THREE.Group();
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: false });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4, 3.4), mat(walls[seed % walls.length]));
    body.position.y = minH + 1.4;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 2.1, 4), new THREE.MeshStandardMaterial({ color: 0x5b6270, flatShading: true }));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = minH + 3.4 + 1.05;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.12), mat(0x7a4b2a));
    door.position.set(0, minH + 0.8, 1.7);
    const win = (wx) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0x6a5320 }));
      w.position.set(wx, minH + 1.9, 1.7);
      return w;
    };
    g.add(body, roof, door, win(-1.0), win(1.0));
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, 0, z);
    g.rotation.y = (seed % 3 - 1) * 0.12;
    return g;
  }

  addHouse(x, z) {
    const seed = this.houses.length;
    const g = this.makeHouse(x, z, seed);
    this.houseGroup.add(g);
    this.houses.push({ x, z });
    this.removeTreesAround(x, z, 4.8);
    this.removeCityAround(x, z, 4.2);
  }

  tryBuild(x, z) {
    if (this.money < HOUSE_COST) return this.onToast('خزانه پول کافی نداره');
    const h = heightAt(x, z);
    if (h < 0.4) return this.onToast('خارج از نقشه');
    for (const L of LANDMARKS) if (L.r && Math.hypot(L.x - x, L.z - z) < L.r + 3) return this.onToast('اینجا یه نماد شهره');
    const hs = [heightAt(x - 1.7, z - 1.7), heightAt(x + 1.7, z - 1.7), heightAt(x - 1.7, z + 1.7), heightAt(x + 1.7, z + 1.7)];
    if (Math.max(...hs) - Math.min(...hs) > 2.2) return this.onToast('زمین زیادی شیب داره');
    for (const o of this.houses) if (Math.hypot(o.x - x, o.z - z) < 6.5) return this.onToast('اینجا خونه‌ی دیگه‌ای هست');
    this.addHouse(x, z);
    this.money -= HOUSE_COST;
    this.dirty = true;
    this.emit(true);
  }

  // ───────────────────────── ورودی لمسی ─────────────────────────
  initInput() {
    const c = this.canvas;
    this.onDown = (e) => {
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.tap = { x: e.clientX, y: e.clientY, t: performance.now(), ok: true };
      } else {
        if (this.tap) this.tap.ok = false;
        this.gesture = null;
      }
    };
    this.onMove = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const px = p.x, py = p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size === 1) {
        if (this.tap && Math.hypot(e.clientX - this.tap.x, e.clientY - this.tap.y) > 10) this.tap.ok = false;
        this.pan(e.clientX - px, e.clientY - py);
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (this.gesture && d > 1) {
          this.dist = clamp(this.dist * (this.gesture.d / d), 22, 420);
          let da = ang - this.gesture.a;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          this.yaw -= da;
          this.pan(mx - this.gesture.mx, my - this.gesture.my);
        }
        this.gesture = { d, a: ang, mx, my };
      }
    };
    this.onUp = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.gesture = null;
      if (this.pointers.size === 0) {
        const t = this.tap;
        this.tap = null;
        if (e.type === 'pointerup' && t && t.ok && performance.now() - t.t < 450) this.handleTap(e.clientX, e.clientY);
      }
    };
    this.onWheel = (e) => {
      e.preventDefault();
      this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.001), 22, 420);
    };
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    this.raycaster = new THREE.Raycaster();
  }

  pan(dx, dy) {
    const k = this.dist * 0.0014;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    this.target.x += -rx * dx * k + fx * dy * k;
    this.target.z += -rz * dx * k + fz * dy * k;
  }

  handleTap(cx, cy) {
    if (!this.buildMode) return;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.terrain, false)[0];
    if (hit) this.tryBuild(hit.point.x, hit.point.z);
  }

  // ───────────────────────── اقتصاد و ذخیره ─────────────────────────
  get cap() {
    return this.houses.length * HOUSE_CAP;
  }

  emit(force) {
    const s = { money: Math.floor(this.money), pop: this.pop, cap: this.cap };
    const key = s.money + '|' + s.pop + '|' + s.cap;
    if (force || key !== this.lastEmit) {
      this.lastEmit = key;
      this.onState(s);
    }
  }

  tickEconomy(dt) {
    if (this.pop < this.cap) {
      this.popFrac += dt * 2;
      while (this.popFrac >= 1 && this.pop < this.cap) {
        this.pop++;
        this.popFrac -= 1;
        this.dirty = true;
      }
    }
    if (this.pop > 0) {
      this.incFrac += dt * this.pop * INCOME_PER_RESIDENT;
      if (this.incFrac >= 1) {
        const whole = Math.floor(this.incFrac);
        this.money += whole;
        this.incFrac -= whole;
        this.dirty = true;
      }
    }
    this.emit(false);
    this.saveTimer += dt;
    if (this.dirty && this.saveTimer > 4) this.save();
  }

  save() {
    this.saveTimer = 0;
    this.dirty = false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ money: this.money, pop: this.pop, houses: this.houses.map((h) => [h.x, h.z]) }));
    } catch (_) {}
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.money = Number(s.money) || 5000;
      for (const [x, z] of s.houses || []) this.addHouse(x, z);
      this.pop = Math.min(Number(s.pop) || 0, this.cap);
    } catch (_) {}
  }

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
    while (this.houseGroup.children.length) {
      const g = this.houseGroup.children[0];
      g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      this.houseGroup.remove(g);
    }
    this.houses = [];
    this.money = 5000;
    this.pop = 0;
    this.buildMode = false;
    // درخت‌های پاک‌شده برمی‌گردن
    this.scene.remove(this.trunks, this.roundMesh, this.pineMesh);
    for (const m of [this.trunks, this.roundMesh, this.pineMesh]) m.dispose();
    this.buildCity();
    this.buildTrees();
    this.emit(true);
  }

  // ───────────────────────── حلقه ─────────────────────────
  loop() {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.tickEconomy(dt);
    this.updateCreatures(dt, t);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    if (this.dirty) this.save();
    window.removeEventListener('resize', this.onResize);
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('wheel', this.onWheel);
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    if (c.parentNode) c.parentNode.removeChild(c);
  }
}
