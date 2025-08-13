// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Bật WASM + top-level await cho cả client/server
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    // Đánh dấu file .wasm là webassembly/async
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    if (!isServer) {
      // Polyfill cho Buffer và tắt các module Node không có trên browser
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        crypto: false,
        stream: false,
        util: false,
        buffer: require.resolve('buffer'),
      };
    }

    return config;
  },

  // ❌ BỎ vì gây cảnh báo & không dùng được với Turbopack
  // experimental: { esmExternals: 'loose' },

  // Nếu cần build code ESM trong node_modules:
  // transpilePackages: ['@hydrawallet-sdk/bridge', '@hydrawallet-sdk/core'],
};

export default nextConfig;
