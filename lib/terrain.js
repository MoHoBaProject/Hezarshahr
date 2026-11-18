// زمین رویه‌ای بر پایه‌ی جغرافیای واقعی تهران.
// مقیاس: هر واحد ≈ ۲۵۰ متر. مبدأ نقشه ≈ ۳۵.۷°N ، ۵۱.۴°E
// x = شرق (+) / غرب (−)    z = جنوب (+) / شمال (−)
// ارتفاع‌ها اغراق‌شده‌ان: h = (متر − ۱۰۵۰) / ۶۵
export const M = 10;              // هر واحد بازی = ۱۰ متر واقعی (افقی و عمودی یکسان)
export const BASE = 950;          // ارتفاع (متر از سطح دریا) که معادل h=0 است
export const K = 250 / M;         // ضریب تبدیل مختصات قدیمی (هر واحد ۲۵۰ م) به واحد جدید
export const WORLD = 240 * K;     // ۶۰ کیلومتر
export const CITY_CENTER = { x: -15.5 * K, z: -10 * K }; // وسط آزادی و میلاد

// مختصات: x = شرق (+)  z = جنوب (+)  ، واحد = ۱۰ متر
export const LANDMARKS = [
  { id: 'azadi', name: 'برج آزادی', x: -22 * K, z: 0, r: 8, top: 45 },
  { id: 'milad', name: 'برج میلاد', x: -9 * K, z: -20 * K, r: 6, top: 435 },
];

// اعداد واقعی هدف (متر) — برای مقایسه در فایل خروجی
export const REAL = {
  miladHeight: 435,
  azadiHeight: 45,
  azadiWidth: 63,
  tochalPeak: 3933,
  cityAreaKm2: 730,
};

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

// ارتفاع واقعی به متر (ورودی: واحد بازی)
export function elevationM(X, Z) {
  const x = X / K, z = Z / K; // مختصات قدیمی برای حفظ شکل زمین
  const half = 120;
  let E = 1050 + 150 * smooth(55, 0, z) + 450 * Math.pow(smooth(0, -35, z), 2);
  const m = smooth(-26, -60, z);
  E += m * (900 + 800 * (fbm(x * 0.025 + 7, z * 0.025 + 7, 4) - 0.3));
  const ridged = 1 - Math.abs(2 * fbm(x * 0.05 + 90, z * 0.05 + 90, 3) - 1);
  E += m * ridged * 500;
  E += TOCHAL_AMP * Math.exp(-(Math.pow(x / 22, 2) + Math.pow((z + 46) / 14, 2)));
  E += 600 * smooth(70, 118, Math.abs(x)) * smooth(30, -10, z) * (0.4 + fbm(x * 0.03, z * 0.03, 3));
  E += 380 * Math.exp(-(Math.pow(x - 15, 2) + Math.pow(z - 55, 2)) / (2 * 7 * 7));
  E += (fbm(x * 0.15, z * 0.15, 2) - 0.45) * 32;
  const edge = Math.max(Math.abs(x), Math.abs(z)) / half;
  E -= smooth(0.85, 1.0, edge) * 910;
  return E;
}
const TOCHAL_AMP = 1421;

// ارتفاع به واحد بازی (۱ واحد = ۱۰ متر، بدون اغراق)
export function heightAt(x, z) {
  return (elevationM(x, z) - BASE) / M;
}

// محدوده‌ی شهر (بیضی شرق-غرب، مساحت تقریبی ~۷۳۰ کیلومتر مربع در سطح 0.5)
export function cityMask(x, z) {
  const dx = (x - 2 * K) / (25100 / M), dz = (z - 8 * K) / (13600 / M);
  return smooth(1.05, 0.6, Math.sqrt(dx * dx + dz * dz));
}

// شمال تهران سرسبزتره، جنوب خشک‌تره
export function northBand(x, z) {
  return smooth(30, -5, z / K) * smooth(-52, -34, z / K);
}
