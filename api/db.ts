// @ts-nocheck
import * as schema from "../shared/schema";
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

console.log(`🔌 Database Configuration (Vercel):`);
console.log(`   URL: ${process.env.DATABASE_URL.split('@')[1] ? '***@' + process.env.DATABASE_URL.split('@')[1] : 'Hidden'}`);

let pool;
try {
  // Use the connection string directly if it contains SSL parameters
  if (process.env.DATABASE_URL!.includes('ssl=')) {
    pool = mysql.createPool(process.env.DATABASE_URL!);
    console.log(`✅ MySQL Pool created using direct URI string (SSL enabled)`);
  } else {
    const url = new URL(process.env.DATABASE_URL!);
    pool = mysql.createPool({
      host: url.hostname || '127.0.0.1',
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      port: parseInt(url.port) || 3306,
      waitForConnections: true,
      connectionLimit: 5, // Lower limit for serverless
      queueLimit: 0
    });
    console.log(`✅ MySQL Pool created for database: ${url.pathname.slice(1)}`);
  }
} catch (e) {
  console.error("❌ Failed to parse DATABASE_URL. Falling back to direct URI string.");
  pool = mysql.createPool(process.env.DATABASE_URL!);
}

const db = drizzle(pool, { schema, mode: 'default' });

export { db, pool as sql };

