import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');
const logFile = path.join(__dirname, 'hostinger_debug.log');

function log(msg) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, entry);
}

log('🚀 Starting Royal Foods ERP (Hostinger Debug Mode)...');
log(`Working Dir: ${__dirname}`);
log(`Node Version: ${process.version}`);

// Try to fix permissions
try {
    if (fs.existsSync(tsxPath)) {
        log('Setting permissions for tsx...');
        spawn('chmod', ['+x', tsxPath], { stdio: 'inherit', shell: true });
    }
} catch (e) {
    log(`Permission error (ignoring): ${e.message}`);
}

function startServer(command, args) {
    log(`Executing: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, NODE_ENV: 'production' }
    });

    child.stdout.on('data', (data) => log(`[STDOUT] ${data}`));
    child.stderr.on('data', (data) => log(`[STDERR] ${data}`));

    child.on('close', (code) => {
        log(`🛑 Process exited with code ${code}`);
        if (code !== 0 && command !== 'npx') {
            log('🔄 Retrying with npx...');
            startServer('npx', ['tsx', 'server/index.ts']);
        }
    });
}

if (fs.existsSync(tsxPath)) {
    startServer(tsxPath, ['server/index.ts']);
} else {
    log('tsx not found at direct path, trying npx...');
    startServer('npx', ['tsx', 'server/index.ts']);
}
