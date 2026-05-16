/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
}

export default nextConfig
