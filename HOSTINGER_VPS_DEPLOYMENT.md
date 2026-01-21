# 🚀 Hostinger VPS Deployment Guide - Royal Foods ERP

## ✅ You're seeing 501 Service Unavailable? Here's the fix!

Your app is currently configured for **Vercel serverless**, but you have a **Hostinger VPS** which needs a different setup. Follow this guide step-by-step.

---

## 📋 Prerequisites

✅ Hostinger VPS with SSH access  
✅ Node.js 18+ installed  
✅ PostgreSQL database (can use Neon or install on VPS)  
✅ Domain pointed to your VPS IP  

---

## 🛠️ Step 1: SSH into Your VPS

```bash
ssh root@your-vps-ip
# Or: ssh username@your-vps-ip
```

---

## 🛠️ Step 2: Install Required Software

### Install Node.js (if not installed)
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### Install Nginx (Reverse Proxy)
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 🛠️ Step 3: Navigate to Your Project Directory

```bash
cd /path/to/your/royal-foods-erp-fresh
# Common locations:
# cd /home/your-username/royal-foods-erp-fresh
# cd /var/www/royal-foods-erp-fresh
```

---

## 🛠️ Step 4: Install Dependencies

```bash
npm install
```

---

## 🛠️ Step 5: Build the Frontend

```bash
npm run build
```

This creates the `dist` folder with your production frontend.

---

## 🛠️ Step 6: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
nano .env
```

Add these variables:

```env
# Database (Use Neon or your VPS PostgreSQL)
DATABASE_URL=postgresql://username:password@your-db-host/dbname?sslmode=require

# Session Secret (generate random string)
SESSION_SECRET=your-very-long-random-secret-key-minimum-32-characters

# Environment
NODE_ENV=production

# Port (use 5000 or any available port)
PORT=5000
```

**💡 TIP**: If using Neon, keep your existing DATABASE_URL. If using VPS PostgreSQL, use `localhost`.

Save and exit (Ctrl+X, then Y, then Enter).

---

## 🛠️ Step 7: Run Database Migrations

```bash
npm run db:push
```

---

## 🛠️ Step 8: Start the App with PM2

```bash
# Start the app
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs royal-foods-erp

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

---

## 🛠️ Step 9: Configure Nginx Reverse Proxy

### Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/royal-foods-erp
```

Paste this configuration (replace `your-domain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Increase timeout for long requests
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
    proxy_send_timeout 300;

    # API requests
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

    # Frontend (static files)
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

### Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/royal-foods-erp /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

---

## 🛠️ Step 10: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow SSH (important!)
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 🛠️ Step 11: Set Up SSL (HTTPS) - Optional but Recommended

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts
# Certbot will automatically configure nginx for HTTPS
```

---

## ✅ Verification

### Check if app is running:
```bash
# Check PM2 status
pm2 status

# Check app logs
pm2 logs royal-foods-erp

# Check if port 5000 is listening
sudo netstat -tlnp | grep 5000
```

### Test the app:
```bash
# Test locally
curl http://localhost:5000/api/health

# Test via domain
curl http://your-domain.com/api/health
```

---

## 🐛 Troubleshooting

### 501 Service Unavailable
**Cause**: App not running or nginx misconfigured  
**Fix**:
```bash
# Check if app is running
pm2 status

# If not running, start it
pm2 start ecosystem.config.js

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 502 Bad Gateway
**Cause**: App crashed or wrong port  
**Fix**:
```bash
# Check app logs
pm2 logs royal-foods-erp --lines 100

# Restart app
pm2 restart royal-foods-erp

# Verify PORT in .env matches nginx proxy_pass
```

### 504 Gateway Timeout
**Cause**: App takes too long to respond  
**Fix**: Already configured increased timeouts in nginx config above.

### Database Connection Error
**Cause**: Wrong DATABASE_URL or database not accessible  
**Fix**:
```bash
# Test database connection
psql $DATABASE_URL

# Or check .env file
cat .env
```

### Permission Denied
**Cause**: Wrong file permissions  
**Fix**:
```bash
# Fix permissions (run from project root)
sudo chown -R $USER:$USER .
chmod -R 755 .
```

---

## 📊 Useful PM2 Commands

```bash
# View all apps
pm2 list

# View logs
pm2 logs royal-foods-erp

# Restart app
pm2 restart royal-foods-erp

# Stop app
pm2 stop royal-foods-erp

# Delete app from PM2
pm2 delete royal-foods-erp

# Monitor resources
pm2 monit

# View detailed info
pm2 info royal-foods-erp
```

---

## 🔄 Deploying Updates

When you make code changes:

```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to project
cd /path/to/royal-foods-erp-fresh

# Pull latest code (if using Git)
git pull origin main

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Restart app
pm2 restart royal-foods-erp

# Check status
pm2 logs royal-foods-erp
```

---

## 📞 Need Help?

If you're still seeing errors:

1. **Check PM2 logs**: `pm2 logs royal-foods-erp --lines 50`
2. **Check Nginx logs**: `sudo tail -f /var/log/nginx/error.log`
3. **Verify environment**: `cat .env`
4. **Check port availability**: `sudo netstat -tlnp | grep 5000`

---

## 🎉 Success Checklist

- [ ] Node.js installed
- [ ] PM2 installed and app running
- [ ] Nginx installed and configured
- [ ] Domain pointing to VPS IP
- [ ] Firewall configured
- [ ] SSL certificate installed (optional)
- [ ] App accessible via domain
- [ ] Database migrations run

---

**🚀 Your app should now be running at: `http://your-domain.com` (or `https://` if SSL is configured)**
