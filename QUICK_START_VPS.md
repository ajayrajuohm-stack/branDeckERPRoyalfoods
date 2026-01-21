# ⚡ Quick Start - Fix Your 501 Error Now!

## 🚨 You're seeing 501 Service Unavailable?

This happens because your app is configured for **Vercel serverless** but you're on **Hostinger VPS**. Here's the fastest fix:

---

## 🎯 Fast Track (5 Minutes)

### Step 1: SSH into your VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Go to your project folder
```bash
cd /path/to/royal-foods-erp-fresh
# Example: cd /home/username/royal-foods-erp-fresh
```

### Step 3: Run the diagnostic script
```bash
# Make it executable
chmod +x vps-quick-fix.sh

# Run it
./vps-quick-fix.sh
```

This script will:
- ✅ Check all requirements
- ✅ Install missing software
- ✅ Build your frontend
- ✅ Start your app with PM2
- ✅ Show you what's wrong

---

## 📝 If You Don't Have the Files Yet

### Upload these files to your VPS:
1. `ecosystem.config.js` - PM2 configuration
2. `nginx.conf` - Nginx configuration template
3. `vps-quick-fix.sh` - Diagnostic script

### Or create `.env` file manually:
```bash
nano .env
```

Paste this (update with your values):
```env
DATABASE_URL=postgresql://username:password@your-db-host/dbname?sslmode=require
SESSION_SECRET=your-very-long-random-secret-32-chars-minimum
NODE_ENV=production
PORT=5000
```

---

## 🔧 Manual Fix (If Script Fails)

### 1. Install PM2
```bash
sudo npm install -g pm2
```

### 2. Build the app
```bash
npm install
npm run build
```

### 3. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Install & Configure Nginx
```bash
# Install nginx
sudo apt install nginx -y

# Copy the nginx.conf to proper location
sudo cp nginx.conf /etc/nginx/sites-available/royal-foods-erp

# Edit it with your domain
sudo nano /etc/nginx/sites-available/royal-foods-erp
# Replace 'your-domain.com' with your actual domain

# Enable the site
sudo ln -s /etc/nginx/sites-available/royal-foods-erp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

---

## ✅ Verify It's Working

### Check PM2 status:
```bash
pm2 status
```

### Check logs:
```bash
pm2 logs royal-foods-erp
```

### Test locally:
```bash
curl http://localhost:5000/api/health
```

### Test via domain:
```bash
curl http://your-domain.com/api/health
```

---

## 🆘 Still Getting 501?

### Check these:

1. **Is the app running?**
   ```bash
   pm2 status
   ```
   If not running: `pm2 start ecosystem.config.js`

2. **Check the logs**
   ```bash
   pm2 logs royal-foods-erp --lines 50
   ```

3. **Is port 5000 listening?**
   ```bash
   sudo netstat -tlnp | grep 5000
   ```
   Should show: `0.0.0.0:5000` or `:::5000`

4. **Nginx running?**
   ```bash
   sudo systemctl status nginx
   ```

5. **Check nginx error logs**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

---

## 🎯 Common Issues & Fixes

### Issue: "Cannot find module 'tsx'"
**Fix:**
```bash
npm install
```

### Issue: "EADDRINUSE: Port 5000 already in use"
**Fix:**
```bash
# Find what's using port 5000
sudo netstat -tlnp | grep 5000

# Kill the process (replace PID with actual number)
sudo kill -9 PID

# Or use a different port in .env
# Change: PORT=5001
```

### Issue: "Database connection failed"
**Fix:**
```bash
# Check your DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test database connection
psql "$DATABASE_URL"
```

### Issue: Nginx shows default page
**Fix:**
```bash
# Make sure symlink exists
ls -la /etc/nginx/sites-enabled/

# Should show: royal-foods-erp -> ../sites-available/royal-foods-erp

# If not, create it:
sudo ln -s /etc/nginx/sites-available/royal-foods-erp /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## 📚 Need Full Guide?

Read: `HOSTINGER_VPS_DEPLOYMENT.md` for complete step-by-step instructions with SSL setup.

---

## 💡 Pro Tips

1. **Monitor your app:** `pm2 monit`
2. **Auto-restart on crash:** PM2 does this automatically
3. **View resource usage:** `pm2 status`
4. **Update your app:** 
   ```bash
   git pull
   npm install
   npm run build
   pm2 restart royal-foods-erp
   ```

---

**🎉 Once everything is green, your app will be live at your domain!**
