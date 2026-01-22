#!/usr/bin/env node
/**
 * 503 Service Unavailable Diagnostic Tool
 * This script helps diagnose why your Royal Foods ERP is showing 503 errors
 */

import 'dotenv/config';
import http from 'http';
import https from 'https';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';

console.log('\n=========================================');
console.log('🔍 503 Error Diagnostic Tool');
console.log('=========================================\n');

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

async function testDatabaseConnection() {
  log('🔹', 'Testing Database Connection...', colors.blue);
  
  if (!process.env.DATABASE_URL) {
    log('❌', 'DATABASE_URL not found in .env file!', colors.red);
    return false;
  }

  try {
    const url = new URL(process.env.DATABASE_URL);
    log('   ', `Host: ${url.hostname}`);
    log('   ', `Database: ${url.pathname.slice(1)}`);
    log('   ', `User: ${url.username}`);

    const pool = mysql.createPool({
      host: url.hostname,
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      port: parseInt(url.port) || 3306,
      connectionLimit: 1
    });

    const connection = await pool.getConnection();
    log('✅', 'Database connection successful!', colors.green);
    connection.release();
    await pool.end();
    return true;
  } catch (error) {
    log('❌', `Database connection failed: ${error.message}`, colors.red);
    log('   ', `Code: ${error.code}`, colors.red);
    return false;
  }
}

function testURL(urlString) {
  return new Promise((resolve) => {
    const protocol = urlString.startsWith('https') ? https : http;
    
    const req = protocol.get(urlString, { timeout: 10000 }, (res) => {
      resolve({
        success: true,
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers
      });
      res.resume(); // Consume response data to free up memory
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });
  });
}

async function testDeploymentEndpoint() {
  log('\n🔹', 'Testing Deployment Endpoint...', colors.blue);
  
  // Try to detect deployment URL from git remote
  let deploymentURL = null;
  
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    if (remote.includes('github.com')) {
      const repoName = remote.split('/').pop().replace('.git', '');
      log('   ', `GitHub Repo: ${repoName}`);
      
      // Common deployment URLs to test
      const possibleURLs = [
        `https://${repoName}.vercel.app`,
        `https://royalfoodserp.com`,
        `https://www.royalfoodserp.com`,
        process.env.DEPLOYMENT_URL
      ].filter(Boolean);
      
      log('   ', 'Testing possible deployment URLs...\n');
      
      for (const url of possibleURLs) {
        log('   ', `Testing: ${url}`);
        const result = await testURL(url);
        
        if (result.success) {
          if (result.status === 503) {
            log('   ', `❌ 503 Service Unavailable`, colors.red);
            log('   ', `This confirms the 503 error!`, colors.yellow);
            deploymentURL = url;
          } else if (result.status === 200) {
            log('   ', `✅ ${result.status} ${result.statusText}`, colors.green);
            deploymentURL = url;
          } else {
            log('   ', `⚠️  ${result.status} ${result.statusText}`, colors.yellow);
          }
        } else {
          log('   ', `❌ ${result.error}`, colors.red);
        }
        console.log('');
      }
    }
  } catch (error) {
    log('⚠️ ', 'Could not detect git remote', colors.yellow);
  }
  
  return deploymentURL;
}

function checkEnvironmentConfig() {
  log('\n🔹', 'Checking Environment Configuration...', colors.blue);
  
  const requiredVars = ['DATABASE_URL', 'SESSION_SECRET'];
  const optionalVars = ['NODE_ENV', 'PORT'];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log('✅', `${varName}: Set`, colors.green);
    } else {
      log('❌', `${varName}: Missing!`, colors.red);
      allPresent = false;
    }
  });
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      log('✅', `${varName}: ${process.env[varName]}`, colors.green);
    } else {
      log('⚠️ ', `${varName}: Not set (will use default)`, colors.yellow);
    }
  });
  
  return allPresent;
}

function checkProjectStructure() {
  log('\n🔹', 'Checking Project Structure...', colors.blue);
  
  const requiredFiles = [
    { path: 'package.json', name: 'package.json' },
    { path: 'server/index.ts', name: 'server/index.ts' },
    { path: 'server/db.ts', name: 'server/db.ts' },
    { path: 'dist/index.html', name: 'dist/index.html (built frontend)' },
    { path: 'node_modules', name: 'node_modules (dependencies installed)' }
  ];
  
  let allPresent = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      log('✅', file.name, colors.green);
    } else {
      log('❌', `${file.name} - Missing!`, colors.red);
      allPresent = false;
    }
  });
  
  return allPresent;
}

async function main() {
  const dbOk = await testDatabaseConnection();
  const envOk = checkEnvironmentConfig();
  const structureOk = checkProjectStructure();
  const deploymentURL = await testDeploymentEndpoint();
  
  // Final diagnosis
  console.log('\n=========================================');
  console.log('📊 DIAGNOSIS SUMMARY');
  console.log('=========================================\n');
  
  const issues = [];
  
  if (!dbOk) issues.push('Database connection failed');
  if (!envOk) issues.push('Missing required environment variables');
  if (!structureOk) issues.push('Missing required project files');
  
  if (issues.length === 0 && deploymentURL) {
    log('🎯', 'ROOT CAUSE IDENTIFIED:', colors.yellow);
    console.log('\n' + colors.yellow + 'Your 503 error is likely caused by one of these issues:\n' + colors.reset);
    console.log('1. 🚫 Application not running on the server');
    console.log('   - The Node.js process may have crashed or not started');
    console.log('   - Check if Node.js app is running in your hosting control panel');
    console.log('');
    console.log('2. ⚙️  Wrong NODE_ENV setting');
    console.log(`   - Current: ${process.env.NODE_ENV || 'not set'}`);
    console.log('   - For production deployment, set NODE_ENV=production');
    console.log('');
    console.log('3. 🔌 Server not listening on correct port');
    console.log('   - Hostinger may require a specific port configuration');
    console.log('   - Check your hosting platform\'s Node.js settings');
    console.log('');
    console.log('4. 📦 Dependencies not installed on server');
    console.log('   - Run: npm install --production');
    console.log('   - Or use deployment script: npm run hostinger:deploy');
    console.log('');
    console.log('5. 🏗️  Frontend not built');
    console.log('   - Run: npm run build');
    console.log('');
  } else if (issues.length > 0) {
    log('⚠️ ', 'ISSUES FOUND:', colors.yellow);
    issues.forEach(issue => log('   ', `• ${issue}`, colors.red));
  } else {
    log('✅', 'All local checks passed!', colors.green);
    log('   ', 'The 503 error is likely on the hosting platform.', colors.yellow);
  }
  
  // Recommendations
  console.log('\n=========================================');
  console.log('🔧 RECOMMENDED FIXES');
  console.log('=========================================\n');
  
  console.log('WHERE ARE YOU DEPLOYING?');
  console.log('');
  console.log('📍 HOSTINGER BUSINESS (cPanel):');
  console.log('   1. Log into your cPanel');
  console.log('   2. Go to "Setup Node.js App"');
  console.log('   3. Make sure:');
  console.log('      - Application Mode: Production');
  console.log('      - Application Startup File: app.js');
  console.log('      - Node.js version: 18.x or higher');
  console.log('   4. Click "Restart" to apply changes');
  console.log('   5. Check error logs in cPanel');
  console.log('');
  console.log('📍 HOSTINGER VPS:');
  console.log('   SSH into your server and run:');
  console.log('   ```');
  console.log('   cd /path/to/your/app');
  console.log('   npm install');
  console.log('   npm run build');
  console.log('   pm2 restart royal-foods-erp');
  console.log('   pm2 logs royal-foods-erp');
  console.log('   ```');
  console.log('');
  console.log('📍 VERCEL:');
  console.log('   - Your .env should be set in Vercel dashboard');
  console.log('   - Redeploy: git push origin main');
  console.log('   - Check deployment logs in Vercel dashboard');
  console.log('');
  
  // Fix NODE_ENV issue
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  IMPORTANT: Your NODE_ENV is set to "development"');
    console.log('   Update your .env file:');
    console.log('   NODE_ENV="production"');
    console.log('');
  }
  
  console.log('=========================================');
  console.log('📝 NEXT STEPS');
  console.log('=========================================\n');
  console.log('1. Fix NODE_ENV in your .env file (set to production)');
  console.log('2. Rebuild the application: npm run build');
  console.log('3. Commit and push: git add . && git commit -m "fix: production settings" && git push');
  console.log('4. Check your hosting platform logs for specific errors');
  console.log('5. Restart the application on your hosting platform');
  console.log('');
  
  console.log('Need more help? Check these files:');
  console.log('  • HOSTINGER_BUSINESS_CPANEL.md');
  console.log('  • HOSTINGER_VPS_DEPLOYMENT.md');
  console.log('  • VERCEL_DEPLOYMENT_GUIDE.md');
  console.log('');
}

main().catch(console.error);
