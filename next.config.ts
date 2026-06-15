import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '*.googleapis.com' },
      { protocol: 'https', hostname: '*.gstatic.com' },
    ],
  },
}

export default nextConfig
