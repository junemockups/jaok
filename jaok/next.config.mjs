/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is meant to be embedded via <iframe> on the Shopify storefront,
  // so we deliberately allow framing instead of the Next.js default.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://junemockups.com https://*.myshopify.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
