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
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard/c89d25a6-91f0-4f24-abdd-acabbabcfee3/calendar',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
