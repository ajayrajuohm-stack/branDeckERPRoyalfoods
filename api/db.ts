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
  // TiDB Cloud robust connection config
  const connectionConfig = {
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 1, // Minimize connections in serverless
    maxIdle: 1, // Close idle connections quickly
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    }
  };

  // If the string already has ?ssl=... we might want to just use the string, 
  // but explicitly setting the config object is safer for mysql2.
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

