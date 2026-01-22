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
  // Simplest, most robust way for TiDB: Pass the URL string directly.
  // The ?ssl={"rejectUnauthorized":true} part is parsed better this way by some driver versions.
  pool = mysql.createPool(process.env.DATABASE_URL);

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

