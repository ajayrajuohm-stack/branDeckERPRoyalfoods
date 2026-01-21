import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema";

// ✅ NEON + VERCEL ONLY CONFIGURATION
// This app is optimized to run ONLY on:
// - Database: Neon PostgreSQL (serverless)
// - Hosting: Vercel (serverless functions)

if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL is not set!\n" +
    "💡 Get it from: https://neon.tech\n" +
    "📝 Add it to Vercel: Dashboard → Settings → Environment Variables"
  );
}

// Validate it's a Neon URL (optional but recommended)
if (!process.env.DATABASE_URL.includes('neon.tech') && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ Warning: DATABASE_URL does not appear to be a Neon connection string');
}

// Configure Neon for Vercel serverless (WebSocket disabled, HTTP only)
neonConfig.fetchConnectionCache = true; // Enable connection caching for better performance

// 🚀 Neon HTTP connection (Optimized for Vercel serverless)
export const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

console.log('✅ Database configured: Neon PostgreSQL (HTTP mode for Vercel)');
