/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Vercel deployment: suppress x-powered-by header */
  poweredByHeader: false,

  /* Allow images from the eSenZ domain if used in the future */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "esenz.co.in",
      },
    ],
  },

  /* Compress responses for production */
  compress: true,

  /* Stricter build environment */
  reactStrictMode: true,
};

export default nextConfig;
