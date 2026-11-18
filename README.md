# هزارشهر — Hezarshahr (پروتوتایپ سه‌بعدی)

شروع از تهران؛ هدف نهایی: کل زمین.

Next.js + three.js، خروجی استاتیک، PWA.

## کنترل
- یک انگشت: حرکت روی نقشه
- دو انگشت: زوم (پینچ) و چرخش دوربین
- دکمه‌ی «ساخت خانه» رو بزن، بعد روی زمین تپ کن

## دیپلوی روی Cloudflare Pages
1. پروژه رو بذار تو یه ریپوی گیت‌هاب
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git
3. تنظیمات بیلد:
   - Framework preset: Next.js (Static HTML Export)
   - Build command: `npm run build`
   - Build output directory: `out`
   - اگه پروژه رو به‌صورت Workers ساختی: Deploy command = `npx wrangler deploy` (فایل `wrangler.jsonc` همین کار رو می‌کنه و پوشه‌ی `out` رو منتشر می‌کنه)
   - Environment variable: `NODE_VERSION` = `20`
4. Deploy. بعد از باز کردن سایت تو کروم گوشی: «Add to Home screen»

## اجرای محلی
```
npm install
npm run dev
```

## قدم‌های بعدی
- جایگزین کردن `heightAt` در `lib/terrain.js` با heightmap واقعی تهران
- جاده، مدرسه، کارخانه، رویداد و ...
