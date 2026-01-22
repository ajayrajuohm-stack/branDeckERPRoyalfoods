// @ts-nocheck
import * as schema from "../shared/schema";
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

console.log(`🔌 Database Configuration (Vercel):`);
console.log(`   URL: ${process.env.DATABASE_URL.split('@')[1] ? '***@' + process.env.DATABASE_URL.split('@')[1] : 'Hidden'}`);

// Use connection string for TiDB Cloud with SSL
let pool;
try {
  const dbUrl = process.env.DATABASE_URL!;

  // TiDB Cloud requires SSL. If not present in URL, we add it.
  // If it is present as a string object like ?ssl={"rejectUnauthorized":true}, 
  // we need to make sure mysql2 can parse it.

  const options: any = {
    uri: dbUrl,
    waitForConnections: true,
    connectionLimit: 1, // Keep it low for serverless
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };

  // If the URL doesn't already have SSL params, and it's a cloud host, add them
  if (!dbUrl.includes('ssl=') && (dbUrl.includes('tidbcloud.com') || dbUrl.includes('aws'))) {
    options.ssl = {
      rejectUnauthorized: true
    };
  }

  pool = mysql.createPool(dbUrl.includes('ssl=') ? dbUrl : options);
  console.log(`✅ MySQL Pool initialized for TiDB Cloud`);
} catch (e) {
  console.error("❌ Database initialization error:", e);
  throw e;
}

const db = drizzle(pool, { schema, mode: 'default' });

export { db, pool as sql };

