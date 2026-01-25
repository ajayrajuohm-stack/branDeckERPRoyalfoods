
import fs from "fs";

function checkFinalBalance(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    const c = fs.readFileSync(filePath, "utf-8");
    let b = 0;
    let lines = c.split("\n");
    for (let i = 0; i < lines.length; i++) {
        for (let char of lines[i]) {
            if (char === '{') b++;
            if (char === '}') b--;
        }
        if (b < 0) {
            console.log(`${filePath}: Balance negative at line ${i + 1}`);
            b = 0;
        }
    }
    console.log(`${filePath} Final Braces Balance: ${b}`);

    let p = 0;
    for (let char of c) {
        if (char === '(') p++;
        if (char === ')') p--;
    }
    console.log(`${filePath} Final Parens Balance: ${p}`);
}

checkFinalBalance("server/routes.ts");
checkFinalBalance("api/routes.ts");
