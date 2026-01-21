import * as schema from "../shared/schema";
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

console.log(`🔌 Database Configuration:`);
console.log(`   URL: ${process.env.DATABASE_URL.split('@')[1] ? '***@' + process.env.DATABASE_URL.split('@')[1] : 'Hidden'}`);
console.log("   ➤ Mode: Hostinger MySQL");

// Create MySQL connection pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log("   ✅ Connected to Hostinger MySQL successfully");
    connection.release();
  })
  .catch(err => {
    console.error("   ❌ Failed to connect to Hostinger MySQL:", err.message);
  });

const db = drizzle(pool, { schema, mode: 'default' });

export { db, pool as sql };
