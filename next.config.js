/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@0gfoundation/0g-ts-sdk',
      '@0glabs/0g-serving-broker',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        os: false,
        path: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
        readline: false,
        assert: false,
        perf_hooks: false,
      };
    }
    return config;
  },
}
module.exports = nextConfig
