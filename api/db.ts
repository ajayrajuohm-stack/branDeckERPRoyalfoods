// @ts-nocheck
import * as schema from "../shared/schema";
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

console.log(`🔌 Database Configuration:`);
console.log(`   URL: ${process.env.DATABASE_URL.split('@')[1] ? '***@' + process.env.DATABASE_URL.split('@')[1] : 'Hidden'}`);

let db: any;
let sql: any;

// ✅ UNIVERSAL DB CONNECTION
if (process.env.VERCEL) {
  // ☁️ VERCEL MODE: Use Neon HTTP Driver (Serverless optimized)
  console.log("   ➤ Mode: Vercel Serverless (Neon HTTP)");
  neonConfig.fetchConnectionCache = true;
  sql = neon(process.env.DATABASE_URL);
  db = drizzleNeon(sql, { schema });
} else {
  // 💻 LOCAL MODE: Use Standard Node Postgres (Persistent connection)
  console.log("   ➤ Mode: Local Development (Standard Postgres)");

  // Create a connection pool for local dev
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Max clients in pool
  });

  // Test connection on startup
  pool.connect().then(client => {
    console.log("   ✅ Connected to Local PostgreSQL successfully");
    client.release();
  }).catch(err => {
    console.error("   ❌ Failed to connect to Local PostgreSQL:", err.message);
  });

  db = drizzlePg(pool, { schema });
  sql = pool; // Alias pool as sql for compatibility if needed, though use cases might differ
}

export { db, sql };
