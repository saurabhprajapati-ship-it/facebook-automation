/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./fonts/**/*'],
    },
  },
};

module.exports = nextConfig;
