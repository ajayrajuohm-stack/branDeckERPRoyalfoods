
import "dotenv/config";
import { db } from "./server/db.ts";
import { bomRecipes, bomLines, items } from "./shared/schema.ts";
import fs from "fs";

async function dump() {
    try {
        console.log("Connecting using server/db.ts...");
        const recipes = await db.select().from(bomRecipes);
        const lines = await db.select().from(bomLines);
        const result = {
            recipes,
            lines,
            count: recipes.length
        };
        fs.writeFileSync("bom_debug_server.json", JSON.stringify(result, null, 2));
        console.log(`Dumped ${recipes.length} recipes to bom_debug_server.json`);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

dump();
