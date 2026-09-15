# Deployment Guide — Here to There (PSBC)

## Step 1: Neon (PostgreSQL Database)

1. Go to https://neon.tech → Sign in with GitHub
2. Click **Create Project**
   - Project name: `here-to-there`
   - Region: **AWS Asia Pacific (Mumbai)** or nearest to Philippines
   - PostgreSQL version: **17**
3. After creation, **copy the connection string**:
   ```
   postgresql://neondb_owner:xxxx@ep-xxx.us-east-2.aws.neon.tech/here_to_there?sslmode=require
   ```
4. Save this — you'll need it for Render.

## Step 2: Render (Backend API)

1. Go to https://dashboard.render.com → Sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `rjvtayam/here_to_there_psbc_laguna`
4. Configure:
   - **Name**: `here-to-there-api`
   - **Region**: US Oregon or Singapore
   - **Runtime**: Python 3
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `DATABASE_URL` = Your Neon connection string (from Step 1)
   - `JWT_SECRET_KEY` = (click Generate)
   - `ALLOWED_ORIGINS` = `https://your-app.vercel.app,http://localhost:5173`
6. Click **Create Web Service**
7. Wait for deployment → Copy the URL (e.g., `https://here-to-there-api.onrender.com`)

## Step 3: Vercel (Frontend)

1. Go to https://vercel.com → Sign in with GitHub
2. Click **Add New** → **Project**
3. Import: `rjvtayam/here_to_there_psbc_laguna`
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_SOCKET_URL` = Your Render backend URL (from Step 2)
6. Click **Deploy**
7. Wait for deployment → Copy the URL (e.g., `https://here-to-there.vercel.app`)

## Step 4: Post-Deploy — Run Migrations

1. SSH into your Render service or use Neon SQL Editor:
   ```sql
   -- Run in Neon SQL Editor (Dashboard → SQL Editor)
   -- Copy-paste each migration in order from backend/alembic/versions/
   ```

   Or use Render Shell:
   ```bash
   cd backend
   alembic upgrade head
   ```

## Step 5: Update CORS

1. Go to Render Dashboard → here-to-there-api → Environment
2. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   https://your-app.vercel.app
   ```

## Step 6: Final Testing

1. Open your Vercel URL
2. Login with admin credentials
3. Test all features:
   - Video/audio streaming
   - Chat (all + campus)
   - Bulletin board
   - Settings toggles
   - Raise hand + reactions
   - Screen sharing
   - Recording (admin only)
