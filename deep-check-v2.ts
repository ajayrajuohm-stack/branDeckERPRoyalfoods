
import fs from "fs";

function checkBalance(filePath: string) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const stack: { char: string, pos: number }[] = [];
    let inString: string | null = null;
    let inComment: string | null = null; // 'single' or 'multi'

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        const prevChar = content[i - 1];

        // Handle transitions
        if (!inComment && !inString) {
            if (char === '/' && nextChar === '/') {
                inComment = 'single';
                i++;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                inComment = 'multi';
                i++;
                continue;
            }
            if (char === '"' || char === "'" || char === "`") {
                inString = char;
                continue;
            }
        } else if (inComment === 'single') {
            if (char === '\n') inComment = null;
            continue;
        } else if (inComment === 'multi') {
            if (char === '*' && nextChar === '/') {
                inComment = null;
                i++;
            }
            continue;
        } else if (inString) {
            if (char === inString && prevChar !== '\\') {
                inString = null;
            }
            continue;
        }

        // Handle nesting
        if (char === '{' || char === '(' || char === '[') {
            stack.push({ char, pos: i });
        } else if (char === '}' || char === ')' || char === ']') {
            if (stack.length === 0) {
                const line = content.substring(0, i).split('\n').length;
                console.log(`Unexpected ${char} at ${filePath}:${line}`);
            } else {
                const last = stack.pop();
                if (!last) continue;

                const expected = { '}': '{', ')': '(', ']': '[' }[char];
                if (last.char !== expected) {
                    const line = content.substring(0, i).split('\n').length;
                    const lastLine = content.substring(0, last.pos).split('\n').length;
                    // @ts-ignore
                    const expectedChar = { '{': '}', '(': ')', '[': ']' }[last.char];
                    console.log(`Mismatched ${char} at ${filePath}:${line}. Expected ${expectedChar} to match ${last.char} at line ${lastLine}`);
                }
            }
        }
    }

    if (inString) console.log(`Unclosed string (${inString}) in ${filePath}`);
    if (inComment) console.log(`Unclosed comment (${inComment}) in ${filePath}`);

    if (stack.length > 0) {
        console.log(`Unclosed items in ${filePath}:`);
        stack.forEach(item => {
            const line = content.substring(0, item.pos).split('\n').length;
            console.log(`  ${item.char} at line ${line}`);
        });
    } else if (!inString && !inComment) {
        console.log(`${filePath} is balanced!`);
    }
}

checkBalance("api/routes.ts");
checkBalance("server/routes.ts");
