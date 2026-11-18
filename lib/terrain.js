// زمین رویه‌ای شبیه تهران: شمال = البرز (بلند)، جنوب = دشت، وسط = دشت شهری.
// بعداً می‌شه این تابع رو با یک heightmap واقعی (SRTM) جایگزین کرد.
export const WORLD = 240; // طول ضلع نقشه
export const CITY_CENTER = { x: 0, z: 38 };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(ix, iy) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, oct = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, y * f);
    f *= 2;
    amp *= 0.5;
  }
  return s;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function heightAt(x, z) {
  const half = WORLD / 2;
  const n = clamp((half - z) / WORLD, 0, 1); // 0 جنوب → 1 شمال
  const ridge = Math.pow(n, 2.3) * 46;
  const rough = (fbm(x * 0.02 + 10, z * 0.02 + 10, 5) - 0.45) * 16 * (0.25 + n * 1.1);
  const hills = (fbm(x * 0.008 + 50, z * 0.008 + 50, 3) - 0.45) * 8;
  let h = 1.5 + ridge + rough + hills * 0.6;

  // دشت صاف برای شهر
  const d = Math.hypot(x - CITY_CENTER.x, z - CITY_CENTER.z);
  const flat = 1 - smooth(18, 62, d);
  h = h * (1 - flat) + (3 + rough * 0.12) * flat;

  // لبه‌ها پایین می‌رن توی آب
  const edge = Math.max(Math.abs(x), Math.abs(z)) / half;
  h -= smooth(0.8, 1.0, edge) * 20;
  return h;
}
