# DRIVETUNING - Deployment Checklist

## 🚀 Quick Deploy (5 minutes)

### Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Vercel CLI: `npm i -g vercel`
- [ ] GitHub account with repository access

---

## Step 1: Prepare Repository

```bash
# Clone and enter project
git clone https://github.com/your-username/drivetuning.git
cd drivetuning

# Install dependencies
npm install

# Verify build works locally
npm run build
```

---

## Step 2: Set Up Neon Database

### 2.1 Create Neon Project
1. Go to: https://console.neon.tech
2. Click "Create Project"
3. Settings:
   - **Name**: `drivetuning-prod`
   - **Free Tier**: Select "Free"
   - **Region**: `EU Central (Frankfurt)` (recommended for EU users)
4. Click "Create Project"

### 2.2 Get Connection Strings
1. In Neon Console → `drivetuning-prod` → `Connection Details`
2. Copy these values:
   - **Connection string** (for `POSTGRES_PRISMA_URL`)
   - **Non-pooled connection** (for `POSTGRES_URL_NON_POOLING`)

### 2.3 Initialize Database
```bash
# Generate Prisma client
npx prisma generate

# Push schema (first time only)
npx prisma db push

# Seed demo data (optional)
npx prisma db seed
```

---

## Step 3: Configure Environment

### 3.1 Create Environment File
```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### 3.2 Required Variables
```env
# Database (from Neon Console)
POSTGRES_PRISMA_URL="postgres://xxx:xxx@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
POSTGRES_URL_NON_POOLING="postgres://xxx:xxx@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require&pool=false"
DATABASE_URL="${POSTGRES_PRISMA_URL}"

# Auth (generate secure secret)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://drivetuning.vercel.app"

# Vercel Blob (optional, for images)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxx"
```

### 3.3 Generate NEXTAUTH_SECRET (Alternative)
```bash
# macOS
openssl rand -base64 32

# Linux
head -c 32 /dev/urandom | base64

# Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { char })))
```

---

## Step 4: Deploy to Vercel

### 4.1 Option A: Vercel CLI (Recommended)
```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Deploy to production
vercel --prod
```

### 4.2 Option B: Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Click "Add New Project"
3. Import from GitHub: `your-username/drivetuning`
4. Settings:
   - **Framework Preset**: `Next.js` (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Click "Deploy"

### 4.3 Add Environment Variables
In Vercel Dashboard → Project → Settings → Environment Variables:
- Add all variables from `.env` file
- Set Environment: `Production`

---

## Step 5: Configure Domain (Optional)

### 5.1 Add Custom Domain
1. Vercel Dashboard → Project → Settings → Domains
2. Click "Add Domain"
3. Enter: `drivetuning.de` (or your domain)
4. Follow DNS configuration instructions

### 5.2 DNS Settings
Add these records to your domain registrar:

| Type | Name | Value |
|------|------|-------|
| CNAME | @ | cname.vercel-dns.com |
| CNAME | www | cname.vercel-dns.com |

---

## Step 6: Verify Deployment

### 6.1 Check Application
- [ ] Homepage loads: `https://drivetuning.vercel.app`
- [ ] Garage page: `/garage`
- [ ] Market page: `/market`
- [ ] Events page: `/events`

### 6.2 Check Database Connection
```bash
# Test from local machine
npx prisma db ping
```

### 6.3 Check Vercel Functions
1. Vercel Dashboard → Project → Functions
2. Verify API routes are deployed
3. Check for any errors

---

## 🐛 Troubleshooting

### "Prisma Client not initialized"
```bash
# Regenerate client
npx prisma generate

# Re-deploy
vercel --prod --force
```

### "Connection refused" (Neon)
- Check Neon Console → Compute is active
- Verify `sslmode=require` in connection string
- Allowlist Vercel IPs (0.0.0.0/0 - all IPs)

### "Build failed"
```bash
# Clean build artifacts
rm -rf .next node_modules/.cache
npm install
npm run build
```

### "Module not found"
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Post-Deploy Checklist

- [ ] Monitor Vercel Analytics
- [ ] Set up error tracking (Sentry)
- [ ] Configure log retention
- [ ] Set up database backups (Neon handles this)
- [ ] Test authentication flow
- [ ] Test PDF export functionality
- [ ] Verify image upload (if using Vercel Blob)

---

## 🔄 Future Deployments

### Automatic Deploys (Git Push)
1. Vercel Dashboard → Project → Git Settings
2. Enable "Git Hooks" → "Deploy on Git Push"
3. Push to `main` branch triggers auto-deploy

### Manual Deploy
```bash
vercel --prod
```

---

## 📞 Support

- **Vercel**: https://vercel.com/docs
- **Neon**: https://neon.tech/docs
- **Prisma**: https://www.prisma.io/docs
- **NextAuth**: https://next-auth.js.org/providers/github
