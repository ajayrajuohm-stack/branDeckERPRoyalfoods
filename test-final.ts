
import "dotenv/config";
import { db } from "./server/db.ts";
import { bomRecipes, bomLines, items } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

async function test() {
    try {
        const recipes = await db
            .select({
                recipe: bomRecipes,
                outputItem: items
            })
            .from(bomRecipes)
            .leftJoin(items, eq(bomRecipes.outputItemId, items.id));

        const lines = await db
            .select({
                line: bomLines,
                item: items
            })
            .from(bomLines)
            .leftJoin(items, eq(bomLines.itemId, items.id));

        const formatted = recipes.map(r => {
            return {
                ...r.recipe,
                outputItem: r.outputItem,
                lines: lines
                    .filter(l => l.line.bomRecipeId === r.recipe.id)
                    .map(l => ({
                        ...l.line,
                        item: l.item
                    }))
            };
        });

        console.log("Success!");
        console.log("Count:", formatted.length);
        console.log("First item sample:", JSON.stringify(formatted[0], null, 2));

    } catch (err) {
        console.error("FAILED:", err);
    } finally {
        process.exit();
    }
}

test();
