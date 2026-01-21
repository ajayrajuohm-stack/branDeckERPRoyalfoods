# BranDeck ERP - Vercel + Neon Deployment Guide

This guide explains how to host your ERP for **High Performance** using Neon (Postgres) and Vercel.

## 1. Database Setup (Neon)
- **Provider**: [Neon](https://neon.tech/)
- **Step**: Create a project and select "Postgres".
- **Connection String**: 
  - Copy the **Connection String**.
  - **IMPORTANT**: Use the **Pooled connection string** (usually ends with `-pooler`) for serverless stability.
- **Cost**: $0 (Free Tier)

## 2. Platform Setup (Vercel)
- **Provider**: [Vercel](https://vercel.com/)
- **Runtime**: Node.js (Serverless)
- **Step**: Import your GitHub repository.
- **Project Settings**:
  - **Framework Preset**: Vite (detected automatically)
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist/public`
- **Required Env Vars**:
  - `DATABASE_URL`: (Your Neon Connection String)
  - `SESSION_SECRET`: (A random string)
  - `NODE_ENV`: `production`
- **Cost**: $0 (Hobby Tier)

## 3. Benefits of this Setup
- **Speed**: Neon wakes up much faster than Supabase/Render free tiers.
- **Global CDNs**: Vercel serves your frontend from the nearest edge server.
- **Ease of Use**: No need for complex split hosting (Miles Web). One dashboard for everything.

## 4. Troubleshooting
- **Latency**: The first request in many hours might take 2-3 seconds as Neon resumes. Subsequent requests are lightning fast.
- **Session Auth**: If login fails, ensure `SESSION_SECRET` is set in Vercel settings.
