# BranDeck ERP - Cloud Deployment Guide

This guide explains how to host your ERP for **Lifetime Free** using Supabase and Render.

## 1. Database Setup (Supabase)
- **Provider**: [Supabase](https://supabase.com/)
- **Step**: Create a project and copy the **Connection URI** from Project Settings > Database.
- **Cost**: $0 (Free Tier)

## 2. Server Setup (Render)
- **Provider**: [Render](https://render.com/)
- **Runtime**: Node.js
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Required Env Vars**:
  - `DATABASE_URL`: (The URI from Supabase)
  - `SESSION_SECRET`: (A random string for security)
  - `NODE_ENV`: `production`
- **Cost**: $0 (Free Tier)

## 3. How to Update
Once hosted, whenever you ask the AI to make a change:
1. AI modifies the local code.
2. You commit and push the changes to **GitHub**.
3. Render will automatically detect the move and update the live website within minutes.

## 4. Troubleshooting
- **Inactivity Pause**: If the app isn't used for 7 days, Supabase might pause. Log in to Supabase and click "Resume Project."
- **Cold Start**: The first time you open the app in the morning, it may take 30 seconds to wake up.
