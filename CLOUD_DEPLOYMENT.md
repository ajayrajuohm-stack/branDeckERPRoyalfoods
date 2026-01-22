# 🚀 Free Cloud Deployment Stack Guide

This guide explains how to deploy your ERP application using the **FREE CLOUD STACK** (Vercel + Render + TiDB Cloud).

## 📊 The Infrastructure
- **Frontend**: Vercel (Fast, Global CDN)
- **Backend API**: Render (Stable Node.js Hosting)
- **Database**: TiDB Cloud (MySQL-Compatible, Free)

---

## 1️⃣ Database Setup (TiDB Cloud)
1. Go to [pingcap.com/tidb-cloud-starter](https://pingcap.com/tidb-cloud-starter) and create a free account.
2. Create a "Serverless" cluster.
3. Click **Connect** and get your **MySQL Connection String**.
4. In the "Standard connection" area, select **Connect with MySQL CLI** or **Node.js**.
5. Your connection string will look something like this:
   `mysql://<username>:<password>@<host>:<port>/<db_name>?ssl={"rejectUnauthorized":true}`

---

## 2️⃣ Backend Setup (Render)
1. Push your code to a **GitHub** repository.
2. Go to [render.com](https://render.com) and sign in with GitHub.
3. Click **New +** -> **Web Service**.
4. Connect your repo.
5. **Settings**:
   - **Name**: `royal-foods-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
6. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (Paste your TiDB string here)

7. Once deployed, note down your Render URL (e.g., `https://royal-foods-backend.onrender.com`).

---

## 3️⃣ Frontend Setup (Vercel)
1. Update `vercel.json` in your code:
   - Change `https://BACKEND_URL.render.com` to your actual Render URL from Step 2.
2. Go to [vercel.com](https://vercel.com) and import your GitHub repo.
3. **Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npx vite build`
   - **Output Directory**: `dist`
4. Deploy!

---

## 💡 Why this setup?
1. **Professional**: Separating frontend and backend is best practice.
2. **FREE**: Costs $0/month.
3. **Compatible**: Your MySQL code works perfectly with TiDB.

---

## 🛡️ Future Migration to Hostinger VPS
When you are ready to move to **Hostinger VPS**:
1. You already have `ecosystem.config.js` and VPS scripts in `package.json`.
2. You would simply copy the files to the VPS and run `npm run vps:setup`.
3. You would use your own local MySQL on the VPS for even better speed.
