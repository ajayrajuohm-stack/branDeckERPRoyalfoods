import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema";
import { Pool } from 'pg'; // Keep Pool for session storage compatibility

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// 🚀 Neon HTTP connection (Fast for Vercel API)
export const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
