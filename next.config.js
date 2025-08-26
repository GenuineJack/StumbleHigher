/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      'i.imgur.com',
      'images.squarespace-cdn.com',
      'same-assets.com',
      'supabase.co',
      'avatars.githubusercontent.com',
      'farcaster.xyz',
      'warpcast.com'
    ],
    unoptimized: true // For compatibility with static exports if needed
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy',
        destination: '/api/proxy',
      },
      // Legacy support for existing frame.html
      {
        source: '/frame.html',
        destination: '/frame',
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          }
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
