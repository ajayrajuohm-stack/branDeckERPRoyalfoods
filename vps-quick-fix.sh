#!/bin/bash

# 🚀 VPS Quick Fix Script for Royal Foods ERP
# Run this on your VPS to diagnose and fix common 501 errors

echo "=========================================="
echo "🔍 Royal Foods ERP - VPS Diagnostics"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check Node.js
echo "1️⃣ Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found! Install it first:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    exit 1
fi

# Check npm
echo ""
echo "2️⃣ Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found!"
    exit 1
fi

# Check PM2
echo ""
echo "3️⃣ Checking PM2..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    echo "✅ PM2 installed: $PM2_VERSION"
else
    echo "⚠️ PM2 not found. Installing..."
    sudo npm install -g pm2
fi

# Check .env file
echo ""
echo "4️⃣ Checking .env file..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check for required variables
    if grep -q "DATABASE_URL" .env; then
        echo "   ✅ DATABASE_URL found"
    else
        echo "   ❌ DATABASE_URL missing!"
    fi
    
    if grep -q "SESSION_SECRET" .env; then
        echo "   ✅ SESSION_SECRET found"
    else
        echo "   ❌ SESSION_SECRET missing!"
    fi
    
    if grep -q "NODE_ENV" .env; then
        echo "   ✅ NODE_ENV found"
    else
        echo "   ⚠️ NODE_ENV not set, defaulting to production"
    fi
else
    echo "❌ .env file not found!"
    echo "   Create it by copying .env.example:"
    echo "   cp .env.example .env"
    echo "   Then edit it with your database credentials"
    exit 1
fi

# Check node_modules
echo ""
echo "5️⃣ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "⚠️ node_modules not found. Installing dependencies..."
    npm install
fi

# Check if dist folder exists
echo ""
echo "6️⃣ Checking build..."
if [ -d "dist" ]; then
    echo "✅ dist folder exists (frontend built)"
else
    echo "⚠️ dist folder not found. Building frontend..."
    npm run build
fi

# Check if app is running
echo ""
echo "7️⃣ Checking if app is running..."
pm2 describe royal-foods-erp &> /dev/null
if [ $? -eq 0 ]; then
    echo "✅ App is running in PM2"
    echo ""
    pm2 info royal-foods-erp
else
    echo "⚠️ App not running. Starting it..."
    pm2 start ecosystem.config.js
    pm2 save
fi

# Check port 5000
echo ""
echo "8️⃣ Checking port 5000..."
if sudo netstat -tlnp | grep -q ":5000"; then
    echo "✅ Port 5000 is listening"
else
    echo "❌ Port 5000 is not listening!"
    echo "   Check PM2 logs: pm2 logs royal-foods-erp"
fi

# Check Nginx
echo ""
echo "9️⃣ Checking Nginx..."
if command -v nginx &> /dev/null; then
    echo "✅ Nginx installed"
    
    # Check if our site config exists
    if [ -f "/etc/nginx/sites-available/royal-foods-erp" ]; then
        echo "   ✅ Nginx site config exists"
    else
        echo "   ⚠️ Nginx site config not found"
        echo "   Create it using the nginx.conf template"
    fi
    
    # Test nginx config
    sudo nginx -t &> /dev/null
    if [ $? -eq 0 ]; then
        echo "   ✅ Nginx config is valid"
    else
        echo "   ❌ Nginx config has errors!"
        echo "   Run: sudo nginx -t"
    fi
else
    echo "⚠️ Nginx not installed"
    echo "   Install: sudo apt install nginx -y"
fi

# Test local connection
echo ""
echo "🔟 Testing local connection..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ App responds to local requests"
else
    echo "❌ App not responding on localhost:5000"
    echo "   Check logs: pm2 logs royal-foods-erp"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Diagnostic Summary"
echo "=========================================="
echo ""

# Show PM2 status
echo "Current PM2 Status:"
pm2 list

echo ""
echo "Recent Logs (last 20 lines):"
pm2 logs royal-foods-erp --lines 20 --nostream

echo ""
echo "=========================================="
echo "🔧 Quick Fix Commands"
echo "=========================================="
echo ""
echo "Restart app:       pm2 restart royal-foods-erp"
echo "View logs:         pm2 logs royal-foods-erp"
echo "Rebuild frontend:  npm run build"
echo "Restart nginx:     sudo systemctl restart nginx"
echo ""
echo "=========================================="
