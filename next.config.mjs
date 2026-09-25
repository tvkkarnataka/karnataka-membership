/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@resvg/resvg-js', '@napi-rs/canvas'],
};

export default nextConfig;