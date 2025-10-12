/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 环境变量
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    WS_URL: process.env.WS_URL || 'ws://localhost:3000',
  },

  // 图片配置
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    domains: ['localhost'],
  },

  // 输出配置
  output: 'standalone',

  // Webpack配置
  webpack: (config, { isServer }) => {
    // 忽略特定警告
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch/ },
    ];

    return config;
  },
};

module.exports = nextConfig;
