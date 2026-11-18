// زمین رویه‌ای بر پایه‌ی جغرافیای واقعی تهران.
// مقیاس: هر واحد ≈ ۲۵۰ متر. مبدأ نقشه ≈ ۳۵.۷°N ، ۵۱.۴°E
// x = شرق (+) / غرب (−)    z = جنوب (+) / شمال (−)
// ارتفاع‌ها اغراق‌شده‌ان: h = (متر − ۱۰۵۰) / ۶۵
export const S = 2;               // شهر ۲ برابر بزرگ‌تر (افقی)، ارتفاع‌ها و برج‌ها همون قبلی
export const WORLD = 240 * S;
export const CITY_CENTER = { x: -15.5 * S, z: -10 * S }; // وسط آزادی و میلاد

// فقط دو نشانه‌ی باقی‌مونده
export const LANDMARKS = [
  { id: 'azadi', name: 'برج آزادی', x: -22 * S, z: 0, r: 7 },
  { id: 'milad', name: 'برج میلاد', x: -9 * S, z: -20 * S, r: 6 },
];

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

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function heightAt(X, Z) {
  const half = WORLD / 2;
  const x = X / S, z = Z / S; // شکل زمین ۲ برابر کشیده می‌شه، ارتفاع ثابت

  // جنوب ~۱۰۵۰ م، میدان آزادی ~۱۲۰۰ م، شمیرانات/پای کوه ~۱۶۵۰ م
  let E = 1050 + 150 * smooth(55, 0, z) + 450 * Math.pow(smooth(0, -35, z), 2);

  // رشته‌کوه البرز در شمال
  const m = smooth(-26, -60, z);
  E += m * (900 + 800 * (fbm(x * 0.025 + 7, z * 0.025 + 7, 4) - 0.3));
  const ridged = 1 - Math.abs(2 * fbm(x * 0.05 + 90, z * 0.05 + 90, 3) - 1);
  E += m * ridged * 500;

  // قله‌ی توچال (~۳۹۶۰ م)
  E += 1200 * Math.exp(-(Math.pow(x / 22, 2) + Math.pow((z + 46) / 14, 2)));

  // ارتفاعات شرق و غرب
  E += 600 * smooth(70, 118, Math.abs(x)) * smooth(30, -10, z) * (0.4 + fbm(x * 0.03, z * 0.03, 3));

  // تپه‌ی بی‌بی‌شهربانو در جنوب (ری)
  E += 380 * Math.exp(-(Math.pow(x - 15, 2) + Math.pow(z - 55, 2)) / (2 * 7 * 7));

  let h = (E - 1050) / 65 + 1.5;
  h += (fbm(x * 0.15, z * 0.15, 2) - 0.45) * 0.5;

  // لبه‌ی نقشه آروم پایین می‌ره
  const edge = Math.max(Math.abs(X), Math.abs(Z)) / half;
  h -= smooth(0.85, 1.0, edge) * 14;
  return h;
}

// محدوده‌ی شهر موجود (بیضی کشیده شرق-غرب)
export function cityMask(X, Z) {
  const dx = (X / S - 2) / 74, dz = (Z / S - 8) / 40;
  return smooth(1.05, 0.6, Math.sqrt(dx * dx + dz * dz));
}

// شمال تهران سرسبزتره، جنوب خشک‌تره
export function northBand(X, Z) {
  const z = Z / S;
  return smooth(30, -5, z) * smooth(-52, -34, z);
}
