
import { db } from "./api/db";
import { users } from "./shared/schema";
import { sql } from "drizzle-orm";

async function clearUsers() {
    console.log("Are you sure? This will delete ALL users. (Waiting 2s...)");
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        await db.delete(users);
        // Reset ID sequence if local postgres
        try {
            await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
        } catch (e) {
            // Ignore if sequence not found or different DB type
        }
        console.log("✅ All users have been deleted successfully.");
    } catch (error) {
        console.error("❌ Failed to delete users:", error);
    }
    process.exit(0);
}

clearUsers();
