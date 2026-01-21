# 🔥 FIX 501 ERROR - Hostinger Business (cPanel)

## ⚡ The Problem
You're seeing **501 Service Unavailable** because:
- Your app is designed for **Vercel serverless**
- You're running on **Hostinger Business (cPanel)**
- Different deployment method needed

## ✅ The Solution (5 Steps)

### 📍 Step 1: Upload Missing Files to Your Server

You need these NEW files on your server:
- `app.js` - Entry point for cPanel
- `.htaccess` - URL rewriting
- `.env` - Environment variables

**How to upload:**

**Option A: Via Git (Recommended)**
```bash
# On your local machine
cd C:\Users\ajayr\OneDrive\Desktop\royal-foods-erp-fresh

# Add and commit new files
git add app.js .htaccess package.json
git commit -m "Add cPanel support files"

# Push to your repository
git push origin main

# Then on your server (cPanel Terminal)
cd ~/royal-foods-erp-fresh
git pull origin main
```

**Option B: Via cPanel File Manager**
1. Open cPanel → File Manager
2. Navigate to `royal-foods-erp-fresh` folder
3. Upload `app.js` and `.htaccess` files
4. Create `.env` file (see Step 2)

---

### 📍 Step 2: Set Up Node.js App in cPanel

1. **cPanel → Setup Node.js App → Create Application**

   | Setting | Your Value |
   |---------|------------|
   | Node.js version | 18.x or 20.x |
   | Application mode | Production |
   | Application root | `/home/USERNAME/royal-foods-erp-fresh` |
   | Application URL | your-domain.com |
   | **Application startup file** | **app.js** ⭐ |

2. **Click "Create"**

---

### 📍 Step 3: Add Environment Variables

In the same Node.js App screen, add these **Environment Variables**:

```
DATABASE_URL = postgresql://user:pass@ep-xxxxx.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET = your-random-32-character-secret-string-here
NODE_ENV = production
PORT = 3000
```

(Use your actual database credentials)

---

### 📍 Step 4: Run Setup Commands

**Open cPanel Terminal:**

```bash
# 1. Go to project directory
cd ~/royal-foods-erp-fresh

# 2. Enter Node.js environment (COPY this command from your Node.js App page in cPanel)
source /home/USERNAME/nodevenv/royal-foods-erp-fresh/18/bin/activate && cd ~/royal-foods-erp-fresh

# 3. Install dependencies
npm install --production

# 4. Build frontend
npm run build

# 5. Run database migrations
npm run db:push
```

---

### 📍 Step 5: Restart & Test

1. **Go to cPanel → Node.js App**
2. **Click "Restart"** button
3. **Wait for status: "Running" (green)**
4. **Open your domain in browser**

**✅ You should see your Royal Foods ERP!**

---

## 🐛 Still Getting 501?

### Quick Diagnostic Checklist

| Check | How to Verify | Fix |
|-------|---------------|-----|
| ✅ App running? | cPanel → Node.js App → Status = "Running" | Click "Restart" |
| ✅ `app.js` exists? | File Manager → Check file exists | Upload `app.js` |
| ✅ Dependencies installed? | Terminal: `ls node_modules/` | Run `npm install` |
| ✅ Frontend built? | File Manager → Check `dist/` folder exists | Run `npm run build` |
| ✅ Environment variables set? | Node.js App → Environment Variables | Add missing variables |

---

## 🔧 Common Errors & Fixes

### Error: "Cannot find module 'tsx'"

**Solution:**
```bash
cd ~/royal-foods-erp-fresh
source /home/USERNAME/nodevenv/royal-foods-erp-fresh/18/bin/activate
npm install tsx
# Then restart app in cPanel
```

---

### Error: "Application failed to start"

**Check logs:**
1. cPanel → Node.js App → Click "Open logs"
2. Look for error message at the bottom

**Common causes:**
- Wrong `DATABASE_URL`
- `SESSION_SECRET` not set
- `app.js` not found
- Dependencies not installed

---

### Error: "502 Bad Gateway"

**This means app crashed.**

**Fix:**
```bash
# Check what's wrong
cd ~/royal-foods-erp-fresh

# View package.json to confirm scripts
cat package.json

# Reinstall dependencies
npm install --production

# Rebuild
npm run build

# Restart from cPanel
```

---

### Error: "EADDRINUSE: Port already in use"

**Cause:** Another app using the same port

**Fix:**
1. cPanel → Node.js App
2. Stop the old application
3. Delete it if it's duplicate
4. Restart your app

---

### App works on localhost but not domain

**Fix .htaccess:**
```bash
# Make sure .htaccess is in the right location
cd ~/public_html
cat .htaccess
```

Should contain rewrite rules. If not, upload the `.htaccess` file.

---

## 📊 How to Check Everything is Working

### 1. Check App Status
```bash
# cPanel → Node.js App
# Should show: ● Running (green)
```

### 2. Check Files Exist
```bash
cd ~/royal-foods-erp-fresh
ls -la app.js        # Should exist
ls -la package.json  # Should exist
ls -la dist/         # Should exist (after build)
ls -la node_modules/ # Should exist (after npm install)
```

### 3. Check Environment
```bash
# In terminal (after activating Node.js environment)
node --version       # Should show v18.x or v20.x
echo $DATABASE_URL   # Should show your database URL
echo $NODE_ENV       # Should show "production"
```

### 4. Test App Locally
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok",...}
```

---

## 🔄 Deploy Updates (After Making Changes)

```bash
# 1. SSH or open cPanel Terminal
cd ~/royal-foods-erp-fresh

# 2. Enter Node.js environment
source /home/USERNAME/nodevenv/royal-foods-erp-fresh/18/bin/activate

# 3. Pull changes (if using Git)
git pull origin main

# 4. Install dependencies
npm install --production

# 5. Rebuild frontend
npm run build

# 6. Restart from cPanel → Node.js App → Restart
```

---

## 📱 Access Your App

- **Frontend:** http://your-domain.com
- **API Health:** http://your-domain.com/api/health
- **Login Page:** http://your-domain.com

---

## 🆘 Emergency Debug Commands

```bash
# Check if app file exists
ls -la ~/royal-foods-erp-fresh/app.js

# Check if node_modules exists
ls -la ~/royal-foods-erp-fresh/node_modules/

# Check if dist exists (built frontend)
ls -la ~/royal-foods-erp-fresh/dist/

# View recent logs
tail -50 ~/logs/*.log

# Check Node.js version
node --version

# Test database connection
echo $DATABASE_URL
```

---

## 💡 Pro Tips

1. **Always use `--production` flag:** Saves space and memory
2. **Always build before deploy:** `npm run build`
3. **Check logs first:** Errors are usually clear in logs
4. **Restart after changes:** cPanel won't auto-restart
5. **Monitor memory usage:** Shared hosting has limits

---

## 📚 Documentation Files

- **Quick Start:** `CPANEL_QUICK_START.md` ⭐ Start here
- **Detailed Guide:** `HOSTINGER_BUSINESS_CPANEL.md`
- **VPS Guide (if you upgrade):** `HOSTINGER_VPS_DEPLOYMENT.md`

---

## 🎯 Expected Result

After following all steps, you should see:

✅ cPanel → Node.js App → Status: **Running** (green)  
✅ Browser → your-domain.com → **Royal Foods ERP Login Page**  
✅ Can login with your credentials  
✅ All features working  

---

## ⚠️ Important Limitations of Business Plan

- ❌ Limited memory (512MB - 1GB)
- ❌ Shared CPU resources
- ❌ Manual restarts needed
- ❌ No auto-scaling

**If you need more resources, consider:**
- Upgrade to **Hostinger VPS** (see `HOSTINGER_VPS_DEPLOYMENT.md`)
- Use **Vercel** (free, unlimited scaling)

---

## 🎉 Success Checklist

- [ ] `app.js` file uploaded
- [ ] `.htaccess` file uploaded
- [ ] Node.js App created in cPanel
- [ ] Environment variables added
- [ ] Dependencies installed
- [ ] Frontend built
- [ ] Database migrations run
- [ ] App restarted in cPanel
- [ ] App status shows "Running"
- [ ] Domain loads in browser

---

**Once all boxes are checked, your 501 error should be FIXED! 🚀**
