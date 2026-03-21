/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['jsdom', 'isomorphic-dompurify'],
}

export default nextConfig
