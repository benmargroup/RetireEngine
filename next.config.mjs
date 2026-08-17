/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  // Next.js dynamic segments must occupy an entire path segment ("[param]"),
  // so a single segment mixing static text with two params — as in the public
  // URL /claim-social-security-at-62-in-mexico — can't be a literal folder
  // name. The real route lives at /claim/[age]/[location]; this rewrite maps
  // the pretty public URL to it while keeping the URL bar unchanged.
  async rewrites() {
    return [
      {
        source: '/claim-social-security-at-:age(\\d+)-in-:location([a-z0-9-]+)',
        destination: '/claim/:age/:location',
      },
      {
        source: '/assessment/when-to-claim-social-security',
        destination: '/assessment?intent=ss_timing',
      },
      {
        source: '/assessment/how-much-to-retire',
        destination: '/assessment?intent=nest_egg',
      },
      {
        source: '/assessment/best-place-to-live',
        destination: '/assessment?intent=location_fit',
      },
    ];
  },
};

export default nextConfig;
