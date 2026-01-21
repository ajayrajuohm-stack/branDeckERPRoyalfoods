import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');

console.log('🚀 Starting Royal Foods ERP (Hostinger Dedicated Mode)...');

// Check if tsx exists
if (!fs.existsSync(tsxPath)) {
    console.error('❌ Error: tsx builder not found in node_modules.');
    console.log('Running npm install to fix...');
}

const child = spawn(tsxPath, ['server/index.ts'], {
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        NODE_ENV: 'production'
    }
});

child.on('close', (code) => {
    console.log(`\n🛑 App process exited with code ${code}`);
    process.exit(code);
});
