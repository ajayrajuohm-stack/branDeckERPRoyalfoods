# 🚀 Vercel Deployment Guide - Royal Foods ERP

## ✅ Code Fixes Completed

Your app has been updated to be Vercel-compatible! Here's what was fixed:

### Changes Made:
1. ✅ **Multer Configuration** - Now uses `/tmp` directory on Vercel
2. ✅ **Excel Import Functions** - Read from buffer instead of file path
3. ✅ **File Cleanup** - Automatic cleanup after processing
4. ✅ **Vercel Detection** - Smart environment detection

---

## 📋 Prerequisites

Before deploying, you need:

1. **GitHub Account** - To connect repository
2. **Vercel Account** - Free at [vercel.com](https://vercel.com)
3. **Neon Database** - Free PostgreSQL at [neon.tech](https://neon.tech)

---

## 🗄️ Step 1: Setup Neon Database (Free PostgreSQL)

### 1.1 Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Click "Sign Up" (use GitHub login)
3. Create a new project: "royal-foods-erp"

### 1.2 Get Database URL
1. In Neon dashboard, click "Connection Details"
2. Copy the **Connection String** (looks like this):
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. **Save this URL** - you'll need it for Vercel!

### 1.3 Run Database Migration
Open terminal in your project folder and run:
```bash
# Set your database URL temporarily
$env:DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# Run migrations
npm run db:push

# Seed initial data (if needed)
npm run db:seed
```

✅ Your database is ready!

---

## 🌐 Step 2: Push Code to GitHub

### 2.1 Initialize Git (if not already done)
```bash
cd "C:\Users\ajayr\OneDrive\Desktop\Sales Projects\royal-foods-erp-fresh"
git init
git add .
git commit -m "Vercel-ready: Fixed file uploads and Excel processing"
```

### 2.2 Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click "New Repository"
3. Name it: `royal-foods-erp`
4. **Don't** initialize with README (we already have code)
5. Click "Create Repository"

### 2.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/royal-foods-erp.git
git branch -M main
git push -u origin main
```

✅ Code is on GitHub!

---

## 🚀 Step 3: Deploy to Vercel

### 3.1 Connect Vercel to GitHub
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Continue with GitHub"
3. Select your `royal-foods-erp` repository
4. Click "Import"

### 3.2 Configure Build Settings

Vercel should auto-detect your settings. Verify these:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 3.3 Add Environment Variables

**CRITICAL:** Click "Environment Variables" and add these:

| Name | Value | Where to get it |
|------|-------|-----------------|
| `DATABASE_URL` | `postgresql://user:pass@...neon.tech/neondb` | From Neon dashboard (Step 1.2) |
| `SESSION_SECRET` | `your-random-secret-key-here-min-32-chars` | Generate below ⬇️ |
| `NODE_ENV` | `production` | Type manually |

#### Generate SESSION_SECRET:
Run this in PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Copy the output and use it as `SESSION_SECRET`.

### 3.4 Deploy!
1. Click **"Deploy"**
2. Wait 2-3 minutes ⏳
3. You'll get a URL like: `https://royal-foods-erp-xyz.vercel.app`

✅ **Your app is LIVE!** 🎉

---

## 🔧 Step 4: Verify Deployment

### 4.1 Test Basic Functionality
1. Visit your Vercel URL
2. Try logging in
3. Check if pages load

### 4.2 Test Excel Imports (Critical!)
1. Go to Purchases → Import
2. Upload an Excel file
3. Verify it processes correctly

### 4.3 Check Logs (if issues)
1. Go to Vercel Dashboard → Your Project
2. Click "Functions" tab
3. Click on `/api/*` to see logs

---

## ⚡ Performance Expectations

| Metric | Performance |
|--------|-------------|
| **Frontend Load** | ⚡ Instant (CDN) |
| **API Cold Start** | 🟡 1-2 seconds (first request) |
| **API Warm** | ⚡ 50-200ms |
| **Database Query** | ⚡ Fast (Neon) |

**Note:** First API call after inactivity takes ~1-2 seconds (serverless cold start). Subsequent calls are fast!

---

## 🎯 Post-Deployment Checklist

- [ ] Database migrations ran successfully
- [ ] Environment variables set in Vercel
- [ ] App loads at Vercel URL
- [ ] Login works
- [ ] Excel imports work (critical test!)
- [ ] Data persists between requests
- [ ] No errors in Vercel function logs

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"
**Solution:** Check `DATABASE_URL` in Vercel environment variables
- Must include `?sslmode=require` at the end
- Copy exact URL from Neon dashboard

### Issue: "Session expired immediately"
**Solution:** Check `SESSION_SECRET` is set
- Must be at least 32 characters
- Set in Vercel environment variables

### Issue: "Excel import fails with 'File not found'"
**Solution:** This was fixed! But if it still happens:
- Check Vercel logs for specific error
- Ensure code changes were pushed to GitHub
- Redeploy from Vercel dashboard

### Issue: "API is slow on first request"
**Solution:** This is normal (cold start)
- First request takes 1-2 seconds
- Consider upgrading to Vercel Pro ($20/mo) for faster cold starts
- Or use a cron job to keep functions warm (see below)

---

## 🔥 Optional: Keep API Warm (Prevent Cold Starts)

Add this to prevent cold starts:

### Create a Cron Job (Vercel Cron)
1. Create `vercel.json` in root:
```json
{
  "crons": [{
    "path": "/api/health",
    "schedule": "*/5 * * * *"
  }]
}
```

2. Push to GitHub:
```bash
git add vercel.json
git commit -m "Add cron job to keep API warm"
git push
```

This pings your API every 5 minutes to keep it warm! ⚡

---

## 💰 Cost Breakdown

### Vercel Free Tier:
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Serverless functions (100GB-Hours)
- ✅ Custom domain support

### Neon Free Tier:
- ✅ 512 MB storage
- ✅ 1 project
- ✅ Shared compute

**Total Cost: $0/month** 🎉

Should last you until you get significant traffic!

---

## 🎓 Next Steps

1. **Custom Domain:** Add your domain in Vercel dashboard
2. **SSL:** Automatic with Vercel (free)
3. **Monitoring:** Check Vercel Analytics tab
4. **Backups:** Neon has automatic backups (free tier: 7 days)

---

## 📞 Need Help?

If you encounter issues:
1. Check Vercel function logs
2. Check Neon database logs
3. Review this guide again
4. Check the code changes summary below

---

## 📝 Summary of Code Changes

### Files Modified:
1. **`server/routes.ts`**
   - Changed upload directory from `uploads/` to `/tmp` on Vercel
   - Added file cleanup after Excel processing

2. **`server/import-transactions.ts`**
   - Changed from `XLSX.readFile()` to `XLSX.read(buffer)`
   - Now reads files into memory before processing

3. **`server/import-excel.ts`**
   - Changed from `XLSX.readFile()` to `XLSX.read(buffer)`

4. **`server/utils/cleanup.ts`** (NEW FILE)
   - Added automatic temp file cleanup utility

### Why These Changes?
Vercel serverless functions have:
- ❌ No persistent file storage (except `/tmp`)
- ❌ Read-only filesystem (except `/tmp`)
- ✅ `/tmp` directory for temporary files

Our fixes ensure files are:
1. Uploaded to `/tmp` (Vercel-compatible)
2. Processed from memory (faster)
3. Automatically cleaned up (no storage leaks)

---

## ✅ You're All Set!

Your Royal Foods ERP is now:
- 🚀 Deployed on Vercel (free)
- 💾 Using Neon PostgreSQL (free)
- ⚡ Fast and scalable
- 🌍 Accessible from anywhere

**Enjoy your cloud-hosted ERP!** 🎉
