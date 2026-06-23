/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@0gfoundation/0g-ts-sdk',
      '@0gfoundation/0g-compute-ts-sdk',
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
    // Stub out optional Privy peer dependencies not needed for basic auth
    config.resolve.alias = {
      ...config.resolve.alias,
      '@stripe/crypto': false,
      '@farcaster/mini-app-solana': false,
      '@abstract-foundation/agw-client': false,
      '@solana/kit': false,
      '@solana-program/system': false,
      '@solana-program/token': false,
      '@solana-program/memo': false,
      'permissionless': false,
    };
    return config;
  },
}
module.exports = nextConfig
