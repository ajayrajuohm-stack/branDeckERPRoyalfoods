const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['api/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/api.js',
    external: ['mysql2', 'drizzle-orm', 'express', 'cors', 'dotenv', 'cookie-session', 'passport', 'passport-local'], // We rely on node_modules for these
    format: 'cjs', // Force CommonJS for Vercel
}).catch(() => process.exit(1));
