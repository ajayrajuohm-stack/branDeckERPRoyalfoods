# 🔧 Hostinger Business Plan (cPanel) - Node.js Deployment Guide

## ✅ Fix Your 501 Error on Hostinger Business Plan

Your Hostinger Business plan supports Node.js through cPanel's **Node.js Selector**. Here's how to deploy your Royal Foods ERP properly.

---

## 📋 Important Notes

⚠️ **Limitations of Shared Hosting:**
- Limited memory (usually 512MB - 1GB)
- No PM2 or process managers
- Restart when you update code
- May have CPU limits
- Shared resources with other users

✅ **What Works:**
- Node.js applications
- Express servers
- Database connections (external like Neon)
- Static file serving

---

## 🚀 Step-by-Step Setup

### Step 1: Log into cPanel

1. Go to: `https://hpanel.hostinger.com`
2. Select your hosting plan
3. Click **"Go to cPanel"** or **"Advanced" → "cPanel"**

---

### Step 2: Navigate to Node.js Selector

1. In cPanel, search for **"Node.js"** or **"Setup Node.js App"**
2. Click on **"Setup Node.js App"**

---

### Step 3: Create Node.js Application

Click **"Create Application"** and configure:

**Settings:**
- **Node.js version:** Select **18.x** or **20.x** (latest available)
- **Application mode:** `Production`
- **Application root:** `/home/username/royal-foods-erp-fresh` (or your project path)
- **Application URL:** `your-domain.com` or subdomain
- **Application startup file:** `app.js` (we'll create this)
- **Passenger log file:** Leave default

Click **"Create"**

---

### Step 4: Set Environment Variables

In the same Node.js App screen, scroll to **"Environment Variables"** section:

Add these variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | `your-random-32-char-secret` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (or what cPanel shows) |

Click **"Save"** after adding each variable.

---

### Step 5: Access Terminal/SSH

**Option A: cPanel Terminal (Web-based)**
1. In cPanel, find **"Terminal"** 
2. Click to open web terminal

**Option B: SSH Access**
```bash
ssh username@your-domain.com
# Or: ssh username@server-ip
```

---

### Step 6: Navigate to Project Directory

```bash
cd ~/royal-foods-erp-fresh
# Or: cd /home/username/royal-foods-erp-fresh
```

---

### Step 7: Set Up Node.js Environment

cPanel provides commands to enter the Node.js environment. You'll see them in the Node.js App page.

**In Terminal, run:**
```bash
# cPanel will show something like this - copy from your Node.js App page:
source /home/username/nodevenv/royal-foods-erp-fresh/18/bin/activate && cd /home/username/royal-foods-erp-fresh
```

**Your prompt should change to show `(nodejs)`**

---

### Step 8: Install Dependencies

```bash
npm install --production
```

This installs only production dependencies (faster and uses less space).

---

### Step 9: Build Frontend

```bash
npm run build
```

This creates the `dist` folder with your production files.

---

### Step 10: Run Database Migrations

```bash
npm run db:push
```

---

### Step 11: Restart the Application

**Back in cPanel → Node.js App:**
1. Find your application
2. Click **"Restart"** button (circular arrow icon)
3. Wait for status to show "Running"

---

### Step 12: Test Your Application

Visit your domain: `http://your-domain.com`

You should see your Royal Foods ERP login page! 🎉

---

## 🔧 Configuration Files

### Create `app.js` in Project Root

This is the entry point for cPanel's Passenger:

```javascript
// app.js - Entry point for Hostinger cPanel
require('dotenv').config();

// Import the Express app
const app = require('./dist-server/index.js').default || require('./dist-server/index.js');

// Export for Passenger
module.exports = app;
```

**Wait, we need to handle TypeScript compilation...**

---

## ⚠️ Important: TypeScript Issue

Your app uses TypeScript (`server/index.ts`), but cPanel expects JavaScript. We have two options:

### Option A: Use tsx Runtime (Recommended for Development)

Create `app.js`:
```javascript
#!/usr/bin/env node
require('dotenv').config();

// Use tsx to run TypeScript directly
require('tsx/cjs').register();
const app = require('./server/index.ts').default;

module.exports = app;
```

### Option B: Compile TypeScript to JavaScript (Better for Production)

We need to compile your TypeScript server code to JavaScript.

**1. Add build script to `package.json`:**

Already exists: `"build"` builds frontend, we need server build too.

**2. Install TypeScript compiler:**
```bash
npm install --save-dev typescript @types/node
```

**3. Build server:**
```bash
npx tsc server/index.ts --outDir dist-server --esModuleInterop --resolveJsonModule --module commonjs
```

**4. Update `app.js`:**
```javascript
require('dotenv').config();
const app = require('./dist-server/index.js').default;
module.exports = app;
```

---

## 🎯 Simplified Approach (Recommended)

Let me create files that make this work seamlessly...

Create `app.js` in root:
```javascript
#!/usr/bin/env node
require('dotenv').config();

// For cPanel Passenger, we use the compiled server or tsx runtime
const path = require('path');

// Try to use pre-compiled version first
try {
  const app = require('./dist-server/index.js');
  module.exports = app.default || app;
} catch (e) {
  // Fallback to tsx runtime
  console.log('Using tsx runtime for TypeScript...');
  require('tsx/cjs');
  const app = require('./server/index.ts');
  module.exports = app.default || app;
}
```

---

## 🐛 Troubleshooting

### 501 Service Unavailable

**Cause 1: App not started**
- Go to cPanel → Node.js App
- Click "Restart" button
- Check status shows "Running"

**Cause 2: Wrong startup file**
- Make sure "Application startup file" is `app.js`
- Make sure `app.js` exists in Application root

**Cause 3: Port mismatch**
- cPanel assigns a specific port
- Check Node.js App settings for the port
- Make sure your .env PORT matches

**Cause 4: Dependencies not installed**
- SSH into server
- Run: `cd ~/royal-foods-erp-fresh && npm install`

---

### Application Shows Error 503

**Cause: App crashed**

**Check logs:**
```bash
# In cPanel Terminal
cd ~/royal-foods-erp-fresh
cat ~/logs/your-app_log
```

Or check in cPanel → Node.js App → Click "Run NPM Install" or "Restart"

---

### "Cannot find module" Error

**Fix:**
```bash
# SSH or cPanel Terminal
cd ~/royal-foods-erp-fresh

# Enter Node.js environment (copy command from cPanel Node.js App page)
source /home/username/nodevenv/royal-foods-erp-fresh/18/bin/activate

# Install dependencies
npm install --production

# Restart from cPanel
```

---

### Database Connection Fails

**Check:**
1. Environment variables set correctly in cPanel
2. DATABASE_URL has `?sslmode=require` at the end
3. Database is accessible from external connections (Neon should be)

**Test:**
```bash
# Try connecting to database
echo $DATABASE_URL
```

---

### Memory Limit Exceeded

**Shared hosting has memory limits (512MB-1GB)**

**Solutions:**
1. Optimize your app (remove unused dependencies)
2. Upgrade to higher Business plan
3. Consider VPS if app needs more resources

---

### App Works but Shows "Cannot GET /"

**Cause: Routing issue**

**Fix: Add `.htaccess` in public_html:**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ /$1 [L,QSA]
</IfModule>
```

---

## 📊 Useful Commands

### Enter Node.js Environment
```bash
# Copy this from your cPanel Node.js App page
source /home/username/nodevenv/royal-foods-erp-fresh/18/bin/activate
```

### Install Dependencies
```bash
npm install --production
```

### Build Frontend
```bash
npm run build
```

### Check Node Version
```bash
node --version
npm --version
```

### View Application Logs
```bash
cat ~/logs/your-domain_log
# Or find logs in cPanel → Node.js App → View Log
```

---

## 🔄 Updating Your App

When you make changes:

### Via Git:
```bash
# SSH or cPanel Terminal
cd ~/royal-foods-erp-fresh

# Pull latest changes
git pull origin main

# Enter Node.js environment
source /home/username/nodevenv/royal-foods-erp-fresh/18/bin/activate

# Install dependencies
npm install --production

# Rebuild frontend
npm run build

# Restart from cPanel → Node.js App → Restart button
```

### Via File Manager:
1. Upload changed files via cPanel File Manager
2. Go to Node.js App in cPanel
3. Click "Restart"

---

## ⚡ Performance Tips

1. **Use production mode:** Always set `NODE_ENV=production`
2. **Build frontend:** Always run `npm run build` before deploying
3. **Remove dev dependencies:** Use `npm install --production`
4. **Enable gzip:** Should be enabled by default on Hostinger
5. **Monitor memory:** Check resource usage in cPanel

---

## 🎯 Quick Checklist

- [ ] Node.js App created in cPanel
- [ ] Application root set correctly
- [ ] Application startup file is `app.js`
- [ ] Environment variables added
- [ ] Dependencies installed (`npm install`)
- [ ] Frontend built (`npm run build`)
- [ ] Database migrations run (`npm run db:push`)
- [ ] Application restarted in cPanel
- [ ] App status shows "Running"
- [ ] Domain accessible in browser

---

## 🆘 Still Having Issues?

**Check these in order:**

1. **cPanel Node.js App status:** Should show "Running" in green
2. **Application logs:** Check for error messages
3. **Environment variables:** Verify DATABASE_URL and SESSION_SECRET
4. **File permissions:** Should be 755 for folders, 644 for files
5. **Node.js version:** Use 18.x or 20.x

---

## 💡 Alternative: Use Vercel (Original Design)

If Hostinger Business is too limited, your app is **designed for Vercel** (free):

1. **Push to GitHub:** `git push origin main`
2. **Deploy to Vercel:** Import from GitHub at vercel.com
3. **Add environment variables:** DATABASE_URL, SESSION_SECRET
4. **Done!** Auto-deploys on every push

**Vercel Benefits:**
- ✅ Completely free
- ✅ Auto-scaling
- ✅ Global CDN
- ✅ Auto SSL
- ✅ No 501 errors!

---

**🎉 Your app should now be running on Hostinger Business!**
