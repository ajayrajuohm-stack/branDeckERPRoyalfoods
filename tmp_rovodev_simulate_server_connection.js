/**
 * Simulate what happens when the server starts with current db.ts config
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function simulateServerStart() {
    console.log("🔍 Simulating Server Startup...\n");
    
    const dbUrl = process.env.DATABASE_URL;
    
    console.log(`🔌 Database Configuration:`);
    console.log(`   URL: ${dbUrl.split('@')[1] || 'Hidden'}`);
    console.log("   ➤ Mode: Hostinger MySQL\n");

    let pool;
    try {
        // This is EXACTLY what your server/db.ts does now
        if (dbUrl.includes('ssl=')) {
            pool = mysql.createPool(dbUrl);
            console.log(`✅ MySQL Pool created using direct URI string (SSL enabled)`);
        } else {
            const url = new URL(dbUrl);
            pool = mysql.createPool({
                host: url.hostname || '127.0.0.1',
                user: url.username,
                password: decodeURIComponent(url.password),
                database: url.pathname.slice(1),
                port: parseInt(url.port) || 3306,
                ssl: {
                    rejectUnauthorized: true
                },
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log(`✅ MySQL Pool created for database: ${url.pathname.slice(1)}`);
        }
    } catch (e) {
        console.error("❌ Failed to parse DATABASE_URL. Falling back to direct URI string.");
        pool = mysql.createPool(dbUrl);
    }

    // Test connection on startup
    console.log("\n🧪 Testing connection...");
    try {
        const connection = await pool.getConnection();
        console.log("   ✅ Database handshake successful!");
        connection.release();
        
        // Test a query
        console.log("\n🧪 Testing query...");
        const [items] = await pool.execute('SELECT * FROM items LIMIT 3');
        console.log(`   ✅ Query successful! Found ${items.length} items`);
        console.log("   Items:", items.map(i => ({ id: i.id, name: i.name })));
        
        // Test BOM query
        console.log("\n🧪 Testing BOM query...");
        const [bom] = await pool.execute('SELECT * FROM bom_recipes LIMIT 3');
        console.log(`   ✅ BOM Query successful! Found ${bom.length} recipes`);
        console.log("   BOM:", bom.map(b => ({ id: b.id, name: b.name })));
        
        // Test Purchase query
        console.log("\n🧪 Testing Purchase query...");
        const [purchases] = await pool.execute('SELECT * FROM purchases WHERE is_deleted = 0');
        console.log(`   ✅ Purchase Query successful! Found ${purchases.length} purchases`);
        console.log("   Purchases:", purchases.map(p => ({ id: p.id, supplier_id: p.supplier_id })));
        
    } catch (err) {
        console.error("   ❌ Database Connection Failed:");
        console.error(`   Message: ${err.message}`);
        console.error(`   Code: ${err.code}`);
    }

    await pool.end();
    
    console.log("\n" + "=".repeat(60));
    console.log("📝 RESULT:");
    console.log("=".repeat(60));
    console.log("\nThis is what should happen when your server starts.");
    console.log("If you see all ✅ above, the server SHOULD work correctly.");
    console.log("\nIf data still doesn't show in browser:");
    console.log("  1. Check browser console (F12) for errors");
    console.log("  2. Check network tab to see if API calls are failing");
    console.log("  3. Send me screenshots of any errors");
}

simulateServerStart();
