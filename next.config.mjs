/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true
  },
  images: {
    remotePatterns: [],
    unoptimized: true
  }
};

export default nextConfig;
