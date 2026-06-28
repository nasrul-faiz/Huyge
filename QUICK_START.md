# 🚀 Quick Start - Database Setup Required

Your app needs a PostgreSQL database to work. Follow these **3 steps** to get running:

## Step 1: Create `.env.local` file

Create a new file in your project root called `.env.local`:

```bash
# In your terminal (workspace root):
cp .env.example .env.local
```

## Step 2: Get a Neon Database Connection String

**Option A: Quick (5 min)**
1. Go to [neon.tech](https://neon.tech)
2. Click **Sign Up** → Use GitHub login
3. Create a new project (name it: `schdnui`)
4. Copy the **connection string** from the dashboard
5. Open `.env.local` and replace `DATABASE_URL` with it

**Example format:**
```
DATABASE_URL=postgresql://user:password@ep-abcd1234.neon.tech/schdnui?sslmode=require
DB_MIGRATION_TOKEN=replace-with-a-long-random-secret
```

**Option B: Use Existing Neon Database**
- If you already have Neon set up, just copy your connection string to `.env.local`

## Step 3: Initialize Database Tables

**Method 1: Neon Dashboard (Easiest)**
1. Go to your Neon project dashboard
2. Click **SQL Editor**
3. Open file: `/lib/db-setup.sql` in this repo
4. Copy-paste **entire contents** into Neon SQL Editor
5. Click **Execute**

**Method 2: Use psql CLI**
```bash
psql "$DATABASE_URL" < lib/db-setup.sql
```

**Method 3: On Vercel (Post-deploy, one-time)**
```bash
curl -X POST "https://YOUR-APP.vercel.app/api/db/migrate" \
	-H "x-migration-token: YOUR_DB_MIGRATION_TOKEN"
```

Then verify:
- `https://YOUR-APP.vercel.app/api/db` (connection)
- `https://YOUR-APP.vercel.app/api/db/migrate` (schema ready status)

---

## ✅ Done! Now start your app:

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 🔍 Troubleshooting

**Error: "DATABASE_URL is not set"**
- Make sure `.env.local` file exists in project root
- Make sure it has: `DATABASE_URL=postgresql://...`
- Restart `npm run dev` after creating `.env.local`

**Error: "Failed to fetch refill data"**
- Check that the database schema was created (Step 3)
- Verify the `refill_items` table exists in Neon dashboard

**Still having issues?**
- Check the browser console (F12) for detailed error messages
- Verify DATABASE_URL connection string is correct
- Try reconnecting to Neon dashboard to confirm database is running

---

**Need help?** See [NEON_SETUP.md](./NEON_SETUP.md) for full documentation
