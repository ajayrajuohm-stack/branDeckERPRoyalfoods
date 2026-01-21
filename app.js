#!/usr/bin/env node
/**
 * app.js - Entry point for Hostinger Business (cPanel) Node.js Selector
 * This file is used by Passenger to start your Node.js application
 */

require('dotenv').config();

const path = require('path');

console.log('🚀 Starting Royal Foods ERP on Hostinger Business...');
console.log('📁 Working directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', process.env.PORT || '3000');

// Try to use tsx to run TypeScript directly
try {
  console.log('📦 Loading TypeScript server with tsx...');
  
  // Register tsx for TypeScript support
  require('tsx/cjs');
  
  // Load the TypeScript server
  const serverModule = require('./server/index.ts');
  const app = serverModule.default || serverModule;
  
  console.log('✅ Server loaded successfully!');
  
  // Export for Passenger
  module.exports = app;
  
} catch (error) {
  console.error('❌ Failed to load server:', error.message);
  console.error('Stack:', error.stack);
  
  // Fallback: try to load compiled JavaScript version
  try {
    console.log('🔄 Attempting to load compiled server from dist-server...');
    const serverModule = require('./dist-server/index.js');
    const app = serverModule.default || serverModule;
    
    console.log('✅ Compiled server loaded successfully!');
    module.exports = app;
    
  } catch (fallbackError) {
    console.error('❌ Failed to load compiled server:', fallbackError.message);
    console.error('');
    console.error('🔧 TROUBLESHOOTING:');
    console.error('1. Make sure dependencies are installed: npm install');
    console.error('2. Make sure tsx is installed: npm install tsx');
    console.error('3. Check if server/index.ts exists');
    console.error('4. Check cPanel error logs for details');
    
    // Export a simple error app
    const express = require('express');
    const errorApp = express();
    
    errorApp.get('*', (req, res) => {
      res.status(500).json({
        error: 'Server failed to start',
        message: error.message,
        help: 'Check cPanel logs or run: npm install && npm run build'
      });
    });
    
    module.exports = errorApp;
  }
}
