# Deployment Guide

This project is designed to be deployed on **Vercel** with **Supabase** as the backend.

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of `supabase_schema.sql` (located in the project root) and run it.
4. Go to **Project Settings** > **API**.
5. Copy your **Project URL** (it should look like `https://xyz.supabase.co`, do NOT include `/rest/v1`).
6. Copy your **anon public** key.

## 2. Environment Variables

Create a `.env` file in the project root (or add these to your deployment platform):

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Deployment on Vercel

1. Push your code to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and import your project.
3. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**.

## 4. Stability Tips

- **Realtime**: Ensure you've run the `ALTER PUBLICATION` command in the SQL schema to enable Realtime updates.
- **Regions**: If possible, choose a Supabase region close to where you and your friends live to minimize latency.
- **Free Tier**: Supabase projects pause after 1 week of inactivity on the free tier. Simply visiting the site will wake it up, though there might be a slight delay on the first load.
