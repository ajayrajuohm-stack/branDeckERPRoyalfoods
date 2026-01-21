# 🔥 FIX YOUR 501 ERROR - Copy & Paste Commands

## 🎯 Problem
You're seeing **501 Service Unavailable** because your app is configured for Vercel (serverless), but you're running on Hostinger VPS (traditional server).

## ✅ Solution
Follow these commands **in order** on your VPS via SSH.

---

## 📋 Step-by-Step Commands

### 1️⃣ SSH into Your Hostinger VPS
```bash
ssh root@your-vps-ip-address
# Or: ssh username@your-vps-ip-address
```

### 2️⃣ Navigate to Your Project Directory
```bash
cd /home/your-username/royal-foods-erp-fresh
# Or wherever you uploaded the files
# Use 'ls' to see your files, use 'pwd' to see current path
```

### 3️⃣ Install Node.js (if not installed)
```bash
# Check if Node.js is installed
node --version

# If not installed or version < 18, install Node.js 20:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 4️⃣ Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 5️⃣ Install Project Dependencies
```bash
npm install
```

### 6️⃣ Create .env File
```bash
nano .env
```

**Paste this and update with YOUR values:**
```env
DATABASE_URL=postgresql://username:password@your-db-host/dbname?sslmode=require
SESSION_SECRET=change-this-to-a-very-long-random-string-minimum-32-characters
NODE_ENV=production
PORT=5000
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### 7️⃣ Run Database Migrations
```bash
npm run db:push
```

### 8️⃣ Build the Frontend
```bash
npm run build
```

### 9️⃣ Start the App with PM2
```bash
# Start the app
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 to start on boot
pm2 startup
# ⚠️ IMPORTANT: Run the command that PM2 outputs
```

### 🔟 Verify App is Running
```bash
# Check PM2 status
pm2 status

# View logs (press Ctrl+C to exit)
pm2 logs royal-foods-erp

# Test if app responds
curl http://localhost:5000/api/health
```

**You should see:** `{"status":"ok","environment":"local-development"}`

---

## 🌐 Setup Nginx (Reverse Proxy)

### 1️⃣ Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

### 2️⃣ Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/royal-foods-erp
```

**Paste this configuration (REPLACE `your-domain.com` with your actual domain):**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 50M;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### 3️⃣ Enable the Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/royal-foods-erp /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 4️⃣ Configure Firewall
```bash
# Allow HTTP
sudo ufw allow 'Nginx Full'

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## ✅ Final Verification

### Test Your Website
```bash
# From VPS terminal
curl http://your-domain.com/api/health
```

### Open in Browser
Visit: `http://your-domain.com`

You should see your Royal Foods ERP login page! 🎉

---

## 🐛 Troubleshooting

### ❌ Still Getting 501?

**Run these diagnostic commands:**

```bash
# 1. Is the app running?
pm2 status
# Should show: royal-foods-erp | online

# 2. Check app logs for errors
pm2 logs royal-foods-erp --lines 50

# 3. Is port 5000 listening?
sudo netstat -tlnp | grep 5000
# Should show something like: 0.0.0.0:5000

# 4. Test app directly
curl http://localhost:5000/api/health

# 5. Check nginx status
sudo systemctl status nginx

# 6. Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 🔧 Common Fixes

**If app is not running:**
```bash
pm2 restart royal-foods-erp
# Or
pm2 start ecosystem.config.js
```

**If app crashes immediately:**
```bash
# Check logs for the error
pm2 logs royal-foods-erp --lines 100

# Common issue: Database connection
# Make sure your DATABASE_URL is correct in .env
cat .env | grep DATABASE_URL
```

**If you see "502 Bad Gateway":**
```bash
# App is not responding, check if it's running
pm2 status
pm2 restart royal-foods-erp
```

**If nginx shows default page:**
```bash
# Make sure your domain points to VPS IP
# Check nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

**If you can't access via domain but localhost works:**
```bash
# Check if domain DNS is pointing to your VPS IP
ping your-domain.com

# Check firewall
sudo ufw status

# Make sure port 80 is open
sudo ufw allow 80/tcp
sudo systemctl restart nginx
```

---

## 📊 Useful Commands

```bash
# View PM2 dashboard
pm2 monit

# Restart app
pm2 restart royal-foods-erp

# Stop app
pm2 stop royal-foods-erp

# View logs (live)
pm2 logs royal-foods-erp

# View detailed app info
pm2 info royal-foods-erp

# Check nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check what's using port 5000
sudo netstat -tlnp | grep 5000
```

---

## 🔄 When You Update Your Code

```bash
# SSH into VPS
ssh root@your-vps-ip

# Go to project
cd /home/your-username/royal-foods-erp-fresh

# Pull latest code (if using git)
git pull

# Or upload new files via FTP/SFTP

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Restart app
pm2 restart royal-foods-erp

# Check logs
pm2 logs royal-foods-erp
```

---

## 🔐 Optional: Setup SSL (HTTPS)

**After everything works on HTTP, add SSL:**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts
# Certbot will automatically configure nginx for HTTPS

# Auto-renewal is enabled by default
# Test renewal
sudo certbot renew --dry-run
```

---

## 📞 Need More Help?

1. **Check logs first:** `pm2 logs royal-foods-erp --lines 100`
2. **Check nginx logs:** `sudo tail -f /var/log/nginx/error.log`
3. **Verify environment:** `cat .env`
4. **Check port:** `sudo netstat -tlnp | grep 5000`

---

## 📚 Additional Documentation

- **Full Guide:** `HOSTINGER_VPS_DEPLOYMENT.md`
- **Quick Start:** `QUICK_START_VPS.md`
- **Diagnostic Script:** Run `./vps-quick-fix.sh`

---

## ✅ Success Checklist

- [ ] Node.js installed (v18+)
- [ ] PM2 installed
- [ ] Dependencies installed (`npm install`)
- [ ] .env file created with correct values
- [ ] Database migrations run (`npm run db:push`)
- [ ] Frontend built (`npm run build`)
- [ ] App running in PM2 (`pm2 status`)
- [ ] Port 5000 listening (`netstat` check)
- [ ] Nginx installed and configured
- [ ] Domain pointing to VPS IP
- [ ] Firewall configured
- [ ] App accessible via domain

---

**🎉 Once all checks pass, your Royal Foods ERP will be live at your domain!**
