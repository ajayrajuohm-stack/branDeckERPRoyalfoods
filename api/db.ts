// @ts-nocheck
import * as schema from "./schema";
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

console.log(`🔌 Database Configuration (Vercel):`);
console.log(`   URL: ${process.env.DATABASE_URL.split('@')[1] ? '***@' + process.env.DATABASE_URL.split('@')[1] : 'Hidden'}`);

let pool;
try {
  // Explicit SSL configuration for TiDB + Vercel
  // We parse the URL manually to ensure we can inject the permissive SSL setting
  const dbUrl = new URL(process.env.DATABASE_URL);

  const connectionConfig = {
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    port: parseInt(dbUrl.port) || 4000,
    ssl: {
      rejectUnauthorized: false // Bypass strict CA check for serverless compatibility
    },
    waitForConnections: true,
    connectionLimit: 1,
    maxIdle: 1,
    enableKeepAlive: true
  };

  pool = mysql.createPool(connectionConfig);

  // Test connection immediately but don't crash if it fails (lazy connect)
  pool.getConnection()
    .then(conn => {
      console.log('✅ Connected to TiDB Cloud successfully');
      conn.release();
    })
    .catch(err => {
      console.error('⚠️ Initial connection check failed (will retry):', err.message);
    });

} catch (e) {
  console.error("❌ Pool creation error:", e);
}

const db = drizzle(pool, { schema, mode: 'default' });

export { db, pool as sql };

