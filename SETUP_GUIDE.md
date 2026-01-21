# Royal Foods ERP - Setup Guide (Clean Start)

## 🛑 STOP! BEFORE YOU START
You have deleted your local configuration to start fresh.
This means your `DATABASE_URL` is gone. Your app will NOT run until you connect it to a database.

---

## 🟢 PHASE 1: Create Your Cloud Database (Neon)
1. Go to [Neon.tech](https://neon.tech)
2. Log in / Sign up
3. Click **"New Project"**
   - Name: `royal-foods-erp`
   - Region: `Singapore` (or nearest to you)
   - Click **Create Project**
4. **COPY THE CONNECTION STRING**
   - It will look like: `postgres://neondb_owner:AbC123...@ep-cloud.aws.neon.tech/neondb?sslmode=require`
   - Save this! You need it for the next step.

---

## 🟢 PHASE 2: Connect Local App to Cloud
1. Create a new file named `.env` in this folder.
2. Paste this exact content (replace the URL with yours):

```env
# Database Connection (Paste your Neon URL here)
DATABASE_URL="postgres://neondb_owner:YOUR_KEY_HERE@ep-region.aws.neon.tech/neondb?sslmode=require"

# Security (Do not change this)
SESSION_SECRET="royal-foods-secure-key-2026"
```

3. **Initialize the Database**
   Run this command in terminal to create the empty tables in the cloud:
   ```bash
   npm run db:push
   ```

4. **Start the App**
   ```bash
   npm run dev
   ```
   - Go to `http://localhost:5000`
   - Create your first Admin User.

---

## 🟢 PHASE 3: Connect Vercel (Hosting) to Cloud
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: `bran-deck-erp-royalfoods`
3. Go to **Settings** → **Environment Variables**
4. Update/Add `DATABASE_URL` with the **SAME** Neon URL you used in Phase 2.
5. Go to **Deployments** tab → Click the 3 dots on the latest build → **Redeploy**.

---

## ✅ DONE
- **Local:** `npm run dev` (Connects to Neon Cloud DB)
- **Cloud:** `https://your-app.vercel.app` (Connects to SAME Neon Cloud DB)
