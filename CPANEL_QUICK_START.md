# ⚡ cPanel Quick Start - Fix 501 Error Now!

## 🎯 For Hostinger Business Plan Users

Follow these steps **exactly** to fix your 501 Service Unavailable error.

---

## 📋 Step 1: Log into cPanel

1. Go to: https://hpanel.hostinger.com
2. Select your Business hosting plan
3. Click **"Advanced"** → **"Go to cPanel"**

---

## 📋 Step 2: Set Up Node.js App

1. In cPanel search bar, type: **"Node.js"**
2. Click **"Setup Node.js App"**
3. Click **"Create Application"**

### Fill in these settings:

| Setting | Value |
|---------|-------|
| **Node.js version** | 18.x or 20.x (choose latest) |
| **Application mode** | Production |
| **Application root** | `/home/your-username/royal-foods-erp-fresh` |
| **Application URL** | your-domain.com |
| **Application startup file** | `app.js` |

4. Click **"Create"**

---

## 📋 Step 3: Add Environment Variables

On the same Node.js App page, scroll to **"Environment variables"**:

### Add these variables one by one:

**Variable 1:**
- Name: `DATABASE_URL`
- Value: Your Neon PostgreSQL connection string
  ```
  postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

**Variable 2:**
- Name: `SESSION_SECRET`
- Value: Generate a random 32+ character string (use: https://generate-random.org/api-key-generator)

**Variable 3:**
- Name: `NODE_ENV`
- Value: `production`

**Variable 4:**
- Name: `PORT`
- Value: Check what port cPanel assigned (usually shown in Node.js App config)

Click **"Add"** for each variable.

---

## 📋 Step 4: Open Terminal

In cPanel, find **"Terminal"** icon and click it.

A black terminal window will open.

---

## 📋 Step 5: Navigate to Your Project

```bash
cd ~/royal-foods-erp-fresh
```

Press Enter.

---

## 📋 Step 6: Enter Node.js Environment

**Important:** Go back to the **Node.js App page** in cPanel.

You'll see a command like this at the top:
```bash
source /home/username/nodevenv/royal-foods-erp-fresh/18/bin/activate && cd /home/username/royal-foods-erp-fresh
```

**Copy that entire command** and paste it into Terminal. Press Enter.

Your prompt should change to show `(nodejs)`.

---

## 📋 Step 7: Install Dependencies

```bash
npm install --production
```

Wait for it to complete (may take 2-5 minutes).

---

## 📋 Step 8: Build Frontend

```bash
npm run build
```

Wait for build to complete.

---

## 📋 Step 9: Run Database Migrations

```bash
npm run db:push
```

This sets up your database tables.

---

## 📋 Step 10: Restart Application

Go back to **cPanel → Node.js App** page.

Find your application in the list and click the **"Restart"** button (circular arrow icon).

Wait for status to show **"Running"** in green.

---

## 📋 Step 11: Test Your App

Open your browser and go to: `http://your-domain.com`

You should see the Royal Foods ERP login page! 🎉

---

## 🐛 Troubleshooting

### Still seeing 501 Error?

**Check 1: Is app running?**
- cPanel → Node.js App
- Status should be green "Running"
- If not, click "Restart"

**Check 2: Check logs**
- In Node.js App page, click "Open logs"
- Look for error messages

**Check 3: Verify files exist**
- cPanel → File Manager
- Navigate to `/home/username/royal-foods-erp-fresh`
- Make sure these files exist:
  - `app.js` ✅
  - `package.json` ✅
  - `server/` folder ✅
  - `dist/` folder (after build) ✅

**Check 4: Environment variables**
- cPanel → Node.js App
- Scroll to Environment Variables
- Make sure all 4 variables are set correctly

---

### Error: "Cannot find module 'tsx'"

**Fix:**
```bash
# In terminal, make sure you're in project directory
cd ~/royal-foods-erp-fresh

# Enter Node.js environment (copy command from cPanel)
source /home/username/nodevenv/royal-foods-erp-fresh/18/bin/activate

# Install tsx
npm install tsx

# Restart app from cPanel
```

---

### Error: "Cannot find module"

**Fix:**
```bash
# Reinstall dependencies
npm install --production

# Restart from cPanel
```

---

### App crashes immediately

**Check logs:**
1. cPanel → Node.js App → View logs
2. Look for the error message

**Common causes:**
- DATABASE_URL is wrong
- SESSION_SECRET not set
- Port mismatch
- Missing dependencies

---

### Database connection error

**Fix:**
1. Check DATABASE_URL environment variable
2. Make sure it ends with `?sslmode=require`
3. Test connection:
   ```bash
   echo $DATABASE_URL
   ```

---

## 🔄 Updating Your App

When you make changes and push to Git:

```bash
# In cPanel Terminal
cd ~/royal-foods-erp-fresh

# Enter Node.js environment
source /home/username/nodevenv/royal-foods-erp-fresh/18/bin/activate

# Pull changes
git pull origin main

# Install new dependencies
npm install --production

# Rebuild frontend
npm run build

# Restart from cPanel → Node.js App → Restart
```

---

## 📊 Verification Commands

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# List installed packages
npm list --depth=0

# Check if dist folder exists
ls -la dist/

# Check if app.js exists
ls -la app.js

# View environment variables
env | grep DATABASE_URL
```

---

## ⚠️ Important Notes

1. **Always use `--production` flag** when installing: `npm install --production`
2. **Always build before deploying:** `npm run build`
3. **Restart app after changes:** cPanel → Node.js App → Restart
4. **Check logs if issues:** cPanel → Node.js App → Open logs
5. **Memory limits:** Shared hosting has limits, optimize your app

---

## 🆘 Still Need Help?

**Gather this info:**
1. Error message from cPanel logs
2. Node.js version (from cPanel Node.js App)
3. Output of: `npm list tsx`
4. Screenshot of Node.js App configuration

---

## ✅ Success Checklist

- [ ] Node.js App created in cPanel
- [ ] Application startup file set to `app.js`
- [ ] All environment variables added
- [ ] Entered Node.js environment in terminal
- [ ] Dependencies installed (`npm install --production`)
- [ ] Frontend built (`npm run build`)
- [ ] Database migrations run (`npm run db:push`)
- [ ] Application restarted in cPanel
- [ ] Status shows "Running" (green)
- [ ] Website loads in browser

---

**🎉 Once all checkboxes are complete, your app should be live!**

**Need detailed guide?** See: `HOSTINGER_BUSINESS_CPANEL.md`
