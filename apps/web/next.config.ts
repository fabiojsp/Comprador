import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@cesta/core', '@cesta/connectors'],
  serverExternalPackages: ['playwright'],
  poweredByHeader: false,
  webpack: (cfg) => {
    // Los paquetes del monorepo importan con extensión .js (ESM) apuntando a archivos .ts.
    cfg.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return cfg;
  },
};

export default config;
