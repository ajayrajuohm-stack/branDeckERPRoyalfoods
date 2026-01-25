
import "dotenv/config";
import { db } from "./api/db.js";
import { bomRecipes, bomLines, items } from "./api/schema.js";
import { eq } from "drizzle-orm";

async function check() {
    try {
        console.log("Checking bom_recipes table...");
        const recipes = await db.select().from(bomRecipes);
        console.log(`Found ${recipes.length} recipes in bom_recipes table.`);
        console.log(JSON.stringify(recipes, null, 2));

        console.log("\nChecking bom_lines table...");
        const lines = await db.select().from(bomLines);
        console.log(`Found ${lines.length} lines in bom_lines table.`);
        console.log(JSON.stringify(lines, null, 2));

        console.log("\nTesting the exact JOIN used in routes.ts...");
        const result = await db
            .select({
                recipe: bomRecipes,
                outputItem: items
            })
            .from(bomRecipes)
            .leftJoin(items, eq(bomRecipes.outputItemId, items.id));

        console.log(`Join result count: ${result.length}`);
        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.error("Error during check:", err);
    } finally {
        process.exit();
    }
}

check();
