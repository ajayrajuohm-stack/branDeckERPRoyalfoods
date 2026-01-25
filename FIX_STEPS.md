# 🔧 Fix: Data Not Showing - Cache Issue

## The Problem

Your React Query has `staleTime: Infinity` which caches data **forever**. Even though the SSL fix works and the database has data, your browser is showing **old cached data** (which was empty).

## Quick Fix (Do This Now!)

### Option 1: Use the HTML Tool (Easiest)
1. I just opened `CLEAR_CACHE_FIX.html` in your browser
2. Click the **"Clear + Reload"** button
3. Your app should now show fresh data!

### Option 2: Manual Clear
1. Make sure server is running: `npm run dev`
2. Open http://localhost:5000
3. Press **F12** (DevTools)
4. Go to **Console** tab
5. Paste this and press Enter:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### Option 3: Hard Refresh
1. Go to http://localhost:5000
2. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
3. This forces a fresh reload

## Verify It's Fixed

After clearing cache:
1. Go to **Items** tab → Should show 7 items ✅
2. Go to **BOM** tab → Should show 3 BOM recipes ✅
3. Go to **Purchases** tab → Should show 1 purchase ✅

## Why This Happened

1. **Before SSL fix:** Server couldn't connect to database → API returned empty data
2. **React Query cached:** The empty data with `staleTime: Infinity`
3. **After SSL fix:** Server works, but browser still shows old cached data
4. **Solution:** Clear cache to fetch fresh data

## Permanent Fix (Optional)

To prevent this in future, we can change the staleTime setting in `client/src/lib/queryClient.ts`:

**Current (line 52-54):**
```typescript
queries: {
  queryFn: getQueryFn({ on401: "throw" }),
  refetchInterval: false,
  refetchOnWindowFocus: false,
  staleTime: Infinity,  // ❌ Problem: Never refetches
  retry: false,
},
```

**Better setting:**
```typescript
queries: {
  queryFn: getQueryFn({ on401: "throw" }),
  refetchInterval: false,
  refetchOnWindowFocus: false,
  staleTime: 1000 * 60 * 5,  // ✅ Cache for 5 minutes, then refetch
  retry: false,
},
```

Do you want me to make this change?

---

## Summary

✅ SSL Fix Applied - Database connection works
✅ Data Exists - Verified in TiDB
⚠️ Cache Issue - Browser showing old empty data
✅ Solution - Clear cache and reload

**Try the quick fix now and let me know if data shows up!**
