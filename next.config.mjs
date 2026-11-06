/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Serve the static practice apps used by the live labs at clean URLs.
    return [{ source: "/sandbox/:app(swagshop|peopledesk|trendkart)", destination: "/sandbox/:app/index.html" }];
  },
};

export default nextConfig;
