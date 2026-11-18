/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // خروجی استاتیک برای Cloudflare Pages (پوشه out)
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
