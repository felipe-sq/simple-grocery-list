import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md on dev boot, which would overwrite the
  // project's own instructions file.
  agentRules: false,
};

export default nextConfig;
