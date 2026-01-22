# 🔧 Fix 403 Error - Vercel Deployment

## ❌ The Problem

You're getting **403 Forbidden** error because your `api/index.ts` was exporting an Express app directly instead of a Vercel-compatible serverless function handler.

---

## 🎯 Root Cause

### **What Was Wrong:**
```typescript
// ❌ WRONG - Direct Express app export
export default app;
```

**Why it fails:**
- Vercel expects a function handler: `(req, res) => { ... }`
- Direct Express app export doesn't match Vercel's function signature
- Results in 403 Forbidden error

---

## ✅ The Fix

### **What I Changed:**
```typescript
// ✅ CORRECT - Vercel function handler
export default function handler(req: any, res: any) {
  return app(req, res);
}
```

**Why it works:**
- Matches Vercel's serverless function signature
- Properly wraps Express app
- Allows Vercel to handle requests correctly

---

## 🚀 Deploy the Fix

### **Step 1: Commit Changes**
```bash
cd "C:\Users\ajayr\OneDrive\Desktop\royal-foods-erp-fresh"
git add api/index.ts
git commit -m "Fix: 403 error - Export Vercel-compatible function handler"
git push
```

### **Step 2: Wait for Deployment (2-3 min)**
- Vercel auto-deploys
- Check: https://vercel.com/dashboard

### **Step 3: Verify Fix**
Test your domain:
```
https://your-domain.vercel.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "platform": "Vercel Serverless",
  "database": "Neon PostgreSQL",
  "timestamp": "2026-01-21T..."
}
```

---

## 🔍 Other Possible 403 Causes

If the fix above doesn't work, check these:

### **1. Environment Variables Missing**
**Symptom:** 403 on all routes

**Solution:**
- Go to Vercel Dashboard → Settings → Environment Variables
- Ensure these are set:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `NODE_ENV=production`

### **2. CORS Issues**
**Symptom:** 403 from browser, works in Postman

**Check:** Your `api/index.ts` has CORS enabled (line 21-24):
```typescript
app.use(cors({
    origin: true,  // ✅ Already correct
    credentials: true,
}));
```

This should work, but if needed, specify your domain:
```typescript
app.use(cors({
    origin: 'https://your-domain.vercel.app',
    credentials: true,
}));
```

### **3. Authentication Issues**
**Symptom:** 403 on protected routes only

**Check:** Session configuration in `api/auth.ts`
- Ensure `SESSION_SECRET` is set in Vercel
- Check cookie settings (secure, sameSite, etc.)

### **4. Vercel Function Timeout**
**Symptom:** 403 after 10 seconds

**Solution:**
- Free tier has 10s timeout
- Optimize slow queries
- Or upgrade to Pro ($20/mo) for 60s timeout

### **5. Rate Limiting**
**Symptom:** 403 after many requests

**Vercel Free Tier Limits:**
- 100GB bandwidth/month
- 100GB-hours serverless execution
- If exceeded, you'll get 403

**Solution:**
- Check Vercel dashboard usage
- Upgrade if needed

---

## 🧪 Testing After Fix

### **Test 1: Health Check**
```bash
curl https://your-domain.vercel.app/api/health
```

**Expected:** 200 OK with JSON response

### **Test 2: Frontend**
```bash
curl https://your-domain.vercel.app
```

**Expected:** HTML content of your app

### **Test 3: API Endpoint**
```bash
curl https://your-domain.vercel.app/api/purchases
```

**Expected:** 200 OK or 401 (if auth required)

---

## 📊 Before vs After

| Aspect | Before (403) | After (Fixed) |
|--------|--------------|---------------|
| **Export** | Direct Express app | Function handler |
| **Status** | 403 Forbidden | 200 OK |
| **Vercel Compat** | ❌ No | ✅ Yes |
| **API Works** | ❌ No | ✅ Yes |

---

## 🐛 Still Getting 403?

### **Check Vercel Function Logs:**
1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments" → Latest deployment
4. Click "Functions" tab
5. Look for errors

### **Common Errors:**

**Error: "Cannot find module 'shared/schema'"**
- **Fix:** Already handled by `includeFiles` in vercel.json

**Error: "DATABASE_URL is not set"**
- **Fix:** Add in Vercel environment variables

**Error: "Session secret required"**
- **Fix:** Add `SESSION_SECRET` in Vercel

**Error: "Database connection failed"**
- **Fix:** Check Neon database is active
- Ensure URL ends with `?sslmode=require`

---

## ✅ Quick Fix Command

```bash
cd "C:\Users\ajayr\OneDrive\Desktop\royal-foods-erp-fresh" && git add api/index.ts && git commit -m "Fix: 403 error - Vercel handler export" && git push
```

---

## 📞 If Still Not Working

Share these details:
1. Full URL where you're getting 403
2. Vercel function logs (from dashboard)
3. Browser console errors (F12 → Console tab)
4. Response headers (F12 → Network tab → Click request → Headers)

---

## 🎉 Expected Result

After this fix:
- ✅ No more 403 errors
- ✅ API endpoints work
- ✅ Frontend loads correctly
- ✅ All routes accessible

**Your app should be fully functional!** 🚀
