# Quick Test - Is Your Server Running?

## Test 1: Is the server running?

Open a NEW terminal and run:

```bash
cd "C:\Users\ajayr\OneDrive\Desktop\royal-foods-erp-fresh"
npm run dev
```

**WAIT for it to show:**
```
✅ Database handshake successful!
🚀 Local Dev Server running at http://localhost:5000
```

## Test 2: Check if API works

Open another terminal and run:

```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok"}`

## Test 3: Check if Items API works

```bash
curl http://localhost:5000/api/items
```

Should return a list of items with data.

## Test 4: Open browser

1. Open browser
2. Press **Ctrl+Shift+R** (hard refresh to clear cache)
3. Go to: http://localhost:5000
4. Open DevTools (F12)
5. Go to **Network** tab
6. Click on **Items** tab in the app
7. Look for `/api/items` request

**What do you see in Network tab?**
- Green status (200)? → Data should show
- Red status (500)? → Server error, check server console
- Red status (404)? → Route not found
- No request at all? → Frontend not making the call

---

## Most Likely Issues:

### Issue 1: Server not running
**Solution:** Start it with `npm run dev`

### Issue 2: Old browser cache
**Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

### Issue 3: Server running on different port
**Check:** What port does `npm run dev` show? Use that instead of 5000

### Issue 4: React Query cache stuck
**Solution:** Add this to your browser console:
```javascript
localStorage.clear();
location.reload();
```

---

## Send me:

1. Screenshot of server console after `npm run dev`
2. Screenshot of browser Network tab when you click Items
3. Any red errors in browser Console tab
