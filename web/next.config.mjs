/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export — the whole app is client-rendered (localStorage + i18next +
  // public keyless data.gov.sg). No server runtime is required, so we ship a
  // pure static build that can be hosted on any static host.
  output: "export",
  // Generate index.html per route so static hosts serve deep links (/assess)
  // correctly without an SPA fallback rule.
  trailingSlash: true,
};

export default nextConfig;
