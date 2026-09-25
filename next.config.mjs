/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@resvg/resvg-js'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;