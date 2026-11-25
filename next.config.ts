import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@fullcalendar/common',
    '@fullcalendar/core',
    '@fullcalendar/react',
    '@fullcalendar/daygrid',
    '@fullcalendar/timegrid',
    '@fullcalendar/interaction',
  ],
  output: 'standalone',
};

export default nextConfig;
