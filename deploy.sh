#!/bin/bash
# =============================================================================
# DRIVETUNING - Production Deploy Script
# =============================================================================
# Run this script to deploy DRIVETUNING to Vercel + Neon
# Prerequisites: Node.js 18+, git, vercel CLI
# =============================================================================

set -e  # Exit on error

echo "🚀 DRIVETUNING Production Deploy"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Step 1: Prerequisites Check
# =============================================================================
echo ""
echo "📋 Step 1: Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js not installed${NC}" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}❌ Git not installed${NC}" >&2; exit 1; }

echo "✅ Node.js: $(node --version)"
echo "✅ Git: $(git --version)"

# Install Vercel CLI if not present
if ! command -v vercel >/dev/null 2>&1; then
    echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
    npm i -g vercel
fi
echo "✅ Vercel CLI: $(vercel --version)"

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
echo ""
echo "📦 Step 2: Installing dependencies..."
npm install
npx prisma generate
echo "✅ Dependencies installed"

# =============================================================================
# Step 3: Database Setup (Neon)
# =============================================================================
echo ""
echo "🗄️ Step 3: Database Setup"
echo "------------------------"
echo "Please create your Neon database at: https://console.neon.tech"
echo ""
echo "1. Click 'Create Project'"
echo "2. Name: drivetuning-prod"
echo "3. Select: Free Tier"
echo "4. Region: EU Central (Frankfurt) recommended"
echo ""
read -p "Press ENTER after creating Neon database..."

# Get database URL from user
read -p "Paste POSTGRES_PRISMA_URL from Neon Console: " POSTGRES_URL

# Create .env file
cat > .env << EOF
POSTGRES_PRISMA_URL="${POSTGRES_URL}"
POSTGRES_URL_NON_POOLING="${POSTGRES_URL}&pool=false"
DATABASE_URL="${POSTGRES_URL}"
NEXTAUTH_SECRET="$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
NEXTAUTH_URL="https://drivetuning.vercel.app"
EOF

echo "✅ Environment configured"

# =============================================================================
# Step 4: Database Migration
# =============================================================================
echo ""
echo "🔄 Step 4: Running database migrations..."
npx prisma db push
echo "✅ Database schema applied"

# =============================================================================
# Step 5: Seed Demo Data
# =============================================================================
echo ""
echo "🌱 Step 5: Seeding demo data..."
npx prisma db seed
echo "✅ Demo data seeded"

# =============================================================================
# Step 6: Vercel Login
# =============================================================================
echo ""
echo "🔐 Step 6: Vercel Authentication"
read -p "Press ENTER to open Vercel login..."
vercel login

# =============================================================================
# Step 7: Link & Deploy
# =============================================================================
echo ""
echo "🔗 Step 7: Linking project..."
vercel link --yes

echo ""
echo "🚀 Step 8: Deploying to production..."
vercel --prod --yes

echo ""
echo -e "${GREEN}🎉 DEPLOY COMPLETE!${NC}"
echo ""
echo "Your DRIVETUNING app is now live at:"
echo -e "${YELLOW}https://drivetuning.vercel.app${NC}"
echo ""
echo "📊 Check deployment status:"
echo "  Vercel Dashboard: https://vercel.com/dashboard"
echo "  Neon Console: https://console.neon.tech"
