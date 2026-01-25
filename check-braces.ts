
import fs from "fs";

function checkBraces(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    let open = 0;
    let closed = 0;
    let lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let char of line) {
            if (char === '{') open++;
            if (char === '}') closed++;
        }
    }
    console.log(`${filePath}: { count: ${open}, } count: ${closed}, diff: ${open - closed}`);
}

checkBraces("server/routes.ts");
checkBraces("api/routes.ts");
