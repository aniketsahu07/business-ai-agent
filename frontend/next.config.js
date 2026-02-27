/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",   // Allow large PDF uploads
    },
  },
}

module.exports = nextConfig
