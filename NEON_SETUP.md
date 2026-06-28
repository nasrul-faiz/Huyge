# Setting Up Neon PostgreSQL

Your app has been updated to use **Neon PostgreSQL** instead of localStorage. Here's how to set it up:

## 1. Create a Neon Account & Database

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up with your GitHub or email
3. Create a new project
4. Choose a database name (e.g., "schdnui")
5. Note your connection string

## 2. Set Environment Variables

Add the connection string to your `.env.local`:

```bash
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

Example from Neon:
```bash
DATABASE_URL=postgresql://schdnui_owner:abcd1234@ep-xyz.neon.tech/schdnui?sslmode=require
```

## 3. Initialize the Database Schema

Run this SQL in Neon's SQL editor to create the tables:

```sql
-- Copy from lib/db-setup.sql and run it
```

Or use the Neon dashboard's SQL editor and paste the contents of `/lib/db-setup.sql`.

## 4. What Changed

### ✅ Migrated to Database
- **Machines** - now in `machines` table
- **Refill Data** - now in `refill_items` table  
- **Delivery Orders** - now in `delivery_orders` & `delivery_order_items` tables

### New API Routes
- `POST/GET /api/machines` - Manage machines
- `POST/GET /api/refill` - Manage inventory
- `POST/GET/PUT /api/delivery-orders` - Manage delivery orders

### Removed
- localStorage for production data (still using for theme preferences)
- All data is now synced to the server

## 5. Testing Locally

```bash
npm run dev
```

The app will:
1. Fetch machines and refill data from the database on startup
2. Save all changes directly to PostgreSQL
3. Work offline gracefully (falls back to default data if DB is unavailable)

## 6. What You Can Do Now

✅ Data persists across browser refreshes  
✅ Sync data across multiple devices/browsers  
✅ Backup your data in the cloud  
✅ Scale to production with Vercel  
✅ Use Neon's built-in tools for monitoring  

## 7. Deploy to Vercel

If deploying to Vercel:

1. Add `DATABASE_URL` to Vercel environment variables
2. Push your code to GitHub
3. Vercel will auto-deploy and use the Neon database

---

**Need help?** Check Neon docs: https://neon.tech/docs
