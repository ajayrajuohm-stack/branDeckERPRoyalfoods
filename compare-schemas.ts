
import fs from "fs";

const file1 = "api/schema.ts";
const file2 = "shared/schema.ts";

const s1 = fs.readFileSync(file1, "utf-8");
const s2 = fs.readFileSync(file2, "utf-8");

if (s1 === s2) {
    console.log("Files are identical");
} else {
    console.log("Files are DIFFERENT");
    console.log("Length 1:", s1.length);
    console.log("Length 2:", s2.length);
}

// Check for bom_recipes table definition in both
const getTableDef = (s, table) => {
    const start = s.indexOf(`export const ${table}`);
    if (start === -1) return null;
    const end = s.indexOf("});", start) + 3;
    return s.substring(start, end);
};

console.log("--- BOM RECIPES DEF ---");
console.log("API:", getTableDef(s1, "bomRecipes"));
console.log("SHARED:", getTableDef(s2, "bomRecipes"));
