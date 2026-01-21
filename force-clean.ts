
import "dotenv/config";
import { db } from "./api/db";
import { users } from "./shared/schema";
import { count } from "drizzle-orm";

async function forceClean() {
    console.log("🔍 Checking users...");
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users.`);
    allUsers.forEach(u => console.log(` - User: ${u.username} (ID: ${u.id})`));

    if (allUsers.length > 0) {
        console.log("🗑️ Deleting all users...");
        await db.delete(users);
        console.log("✅ Users deleted.");
    } else {
        console.log("ℹ️ No users to delete.");
    }

    process.exit(0);
}

forceClean().catch(err => {
    console.error(err);
    process.exit(1);
});
