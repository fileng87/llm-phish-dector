import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // 增加 Server Actions 的 body size 限制到 5MB
    },
  },
};

export default nextConfig;
