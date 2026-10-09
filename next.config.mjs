/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray pnpm-lock.yaml sits in the home folder; pin the root to this project.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
