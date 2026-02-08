/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel Blob public URLs (https://*.public.blob.vercel-storage.com/...)
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.blob.vercel-storage.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.vercel-storage.com', pathname: '/**' },
    ],
  },
  // Ensure proper handling of CSS on Windows
  webpack: (config) => {
    return config;
  },
}

module.exports = nextConfig
