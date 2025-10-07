/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Base Sepolia',
    NEXT_PUBLIC_DEPLOYMENTS_JSON_PATH: process.env.NEXT_PUBLIC_DEPLOYMENTS_JSON_PATH || 'deployments/base-sepolia-addresses.json',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;



