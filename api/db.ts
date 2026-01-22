// @ts-nocheck
import * as schema from "./schema.js";
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// Safe Database Initialization
let pool;

if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const connectionConfig = {
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      port: parseInt(dbUrl.port) || 4000,
      ssl: { rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 1,
      maxIdle: 1,
      enableKeepAlive: true
    };
    pool = mysql.createPool(connectionConfig);
    console.log("✅ TiDB Pool Initialized");
  } catch (e) {
    console.error("❌ Failed to parse DATABASE_URL:", e);
  }
} else {
  console.error("❌ FATAL: DATABASE_URL is missing!");
}

// Test connection if pool exists
if (pool) {
  pool.getConnection()
    .then(conn => {
      console.log('✅ Connected to TiDB successfully');
      conn.release();
    })
    .catch(err => {
      console.error('⚠️ Initial connection check failed:', err.message);
    });
}

const db = drizzle(pool, { schema, mode: 'default' });

export { db, pool as sql };

