
import "dotenv/config";
import { db } from "./api/db.js";
import { bomRecipes, bomLines, items } from "./api/schema.js";
import fs from "fs";

async function dump() {
    try {
        const recipes = await db.select().from(bomRecipes);
        const lines = await db.select().from(bomLines);
        const result = {
            recipes,
            lines,
            count: recipes.length
        };
        fs.writeFileSync("bom_debug.json", JSON.stringify(result, null, 2));
        console.log(`Dumped ${recipes.length} recipes and ${lines.length} lines to bom_debug.json`);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

dump();
