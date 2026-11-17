import type { NextConfig } from 'next';

// Static export: the whole app is plain files, so it runs on Vercel, Netlify
// or any static host for free. All data lives in the browser for now.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
