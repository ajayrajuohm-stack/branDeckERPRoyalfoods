
import fs from "fs";

const filePath = "server/routes.ts";
let content = fs.readFileSync(filePath, "utf-8");

content = content.replace(
    /app\.get\("\/api\/bom-recipes", async \(_req, res\) => \{/g,
    `app.get("/api/bom-recipes", async (_req, res) => {
    fs.appendFileSync("api_hits.log", "HIT /api/bom-recipes\\n");`
);

fs.writeFileSync(filePath, content);
