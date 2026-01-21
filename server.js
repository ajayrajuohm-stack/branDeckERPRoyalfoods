import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');

console.log('🚀 Starting Royal Foods ERP (Hostinger Resilient Mode)...');

// Try to fix permissions before starting
try {
    console.log('Attemping to set permissions for tsx...');
    spawn('chmod', ['+x', tsxPath], { stdio: 'inherit', shell: true });
} catch (e) {
    console.error('Failed to set permissions:', e);
}

// Use a function to start the process
function startServer(command, args) {
    console.log(`Executing: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            NODE_ENV: 'production'
        }
    });

    child.on('close', (code) => {
        if (code !== 0 && command !== 'npx') {
            console.log('❌ Direct path failed, trying with npx...');
            startServer('npx', ['tsx', 'server/index.ts']);
        } else {
            console.log(`\n🛑 Process exited with code ${code}`);
            process.exit(code);
        }
    });
}

// Start with direct path first
if (fs.existsSync(tsxPath)) {
    startServer(tsxPath, ['server/index.ts']);
} else {
    console.log('tsx not found at direct path, trying npx...');
    startServer('npx', ['tsx', 'server/index.ts']);
}
