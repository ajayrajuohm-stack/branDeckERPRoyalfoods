
import "dotenv/config";
import { db } from "./api/db.js";
import { items } from "./api/schema.js";
import fs from "fs";

async function checkItems() {
    try {
        const allItems = await db.select().from(items);
        fs.writeFileSync("items_debug.json", JSON.stringify(allItems, null, 2));
        console.log(`Dumped ${allItems.length} items to items_debug.json`);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkItems();
