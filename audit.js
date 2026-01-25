const fs = require('fs');
function audit(f) {
    if (!fs.existsSync(f)) {
        console.log(`${f} not found`);
        return;
    }
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split(/\r?\n/);
    let p = 0, b = 0, s = false, sc = '';
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        for (let j = 0; j < l.length; j++) {
            const ch = l[j];
            if (s) {
                if (ch === sc && l[j - 1] !== '\\') s = false;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                s = true;
                sc = ch;
                continue;
            }
            if (ch === '(') p++;
            if (ch === ')') p--;
            if (ch === '{') b++;
            if (ch === '}') b--;
            if (p < 0) {
                console.log(f + ': L' + (i + 1) + ': P -1 : ' + l.trim());
                p = 0;
            }
            if (b < 0) {
                console.log(f + ': L' + (i + 1) + ': B -1 : ' + l.trim());
                b = 0;
            }
        }
    }
    console.log(f + ': Final P=' + p + ', B=' + b);
}
audit('server/routes.ts');
audit('api/routes.ts');
