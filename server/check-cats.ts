import "dotenv/config";
import { db } from "./db";
import { categories } from "../shared/schema";

async function checkCategories() {
    try {
        const all = await db.select().from(categories);
        console.log("CATEGORIES_LIST_START");
        console.log(JSON.stringify(all, null, 2));
        console.log("CATEGORIES_LIST_END");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCategories();
