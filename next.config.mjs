import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@utmessa/shared'],
  // Tell Next.js to use this directory as the root (fixes workspace root warning)
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
