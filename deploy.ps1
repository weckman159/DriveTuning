#!/usr/bin/env pwsh
# =============================================================================
# DRIVETUNING - Production Deploy Script (PowerShell)
# =============================================================================
# Run this script to deploy DRIVETUNING to Vercel + Neon
# Prerequisites: Node.js 18+, PowerShell 7+
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 DRIVETUNING Production Deploy" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 1: Prerequisites Check
# =============================================================================
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not installed. Download from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not installed. Download from https://git-scm.com" -ForegroundColor Red
    exit 1
}

# Check Vercel CLI
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm i -g vercel
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
}

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
Write-Host ""
Write-Host "📦 Step 2: Installing dependencies..." -ForegroundColor Yellow

npm install
npx prisma generate

Write-Host "✅ Dependencies installed" -ForegroundColor Green

# =============================================================================
# Step 3: Database Setup (Neon)
# =============================================================================
Write-Host ""
Write-Host "🗄️ Step 3: Database Setup" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Yellow
Write-Host "1. Open: https://console.neon.tech" -ForegroundColor Cyan
Write-Host "2. Click 'Create Project'" -ForegroundColor Cyan
Write-Host "3. Name: drivetuning-prod" -ForegroundColor Cyan
Write-Host "4. Select: Free Tier" -ForegroundColor Cyan
Write-Host "5. Region: EU Central (Frankfurt) recommended" -ForegroundColor Cyan
Write-Host ""

$neonUrl = Read-Host "Paste POSTGRES_PRISMA_URL from Neon Console"

if ([string]::IsNullOrWhiteSpace($neonUrl)) {
    Write-Host "❌ No URL provided. Aborting." -ForegroundColor Red
    exit 1
}

function New-RandomBase64Secret([int]$Bytes = 32) {
    $buf = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($buf)
    return [Convert]::ToBase64String($buf)
}

# Generate NEXTAUTH_SECRET
$nextAuthSecret = New-RandomBase64Secret 32

# Create .env file
@"
POSTGRES_PRISMA_URL="$neonUrl"
POSTGRES_URL_NON_POOLING="$neonUrl&pool=false"
DATABASE_URL="$neonUrl"
DIRECT_URL="$neonUrl&pool=false"
NEXTAUTH_SECRET="$nextAuthSecret"
NEXTAUTH_URL="https://drivetuning.vercel.app"
"@ | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✅ Environment configured" -ForegroundColor Green

# =============================================================================
# Step 4: Database Migration
# =============================================================================
Write-Host ""
Write-Host "🔄 Step 4: Running database migrations..." -ForegroundColor Yellow

npm run prisma:generate
npm run prisma:migrate:deploy

Write-Host "✅ Database migrations applied" -ForegroundColor Green

# =============================================================================
# Step 5: Seed Demo Data
# =============================================================================
Write-Host ""
Write-Host "🌱 Step 5: Seeding demo data (optional)..." -ForegroundColor Yellow
$seed = Read-Host "Seed demo data? (y/N)"
if ($seed -eq "y" -or $seed -eq "Y") {
    npm run db:seed
    Write-Host "✅ Demo data seeded" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipped seeding" -ForegroundColor Yellow
}

# =============================================================================
# Step 6: Vercel Login
# =============================================================================
Write-Host ""
Write-Host "🔐 Step 6: Vercel Authentication" -ForegroundColor Yellow
Write-Host "Press ENTER to open Vercel login in browser..." -ForegroundColor Cyan
Read-Host

vercel login

# =============================================================================
# Step 7: Link & Deploy
# =============================================================================
Write-Host ""
Write-Host "🔗 Step 7: Linking project to Vercel..." -ForegroundColor Yellow

vercel link --yes

Write-Host ""
Write-Host "🚀 Step 8: Deploying to production..." -ForegroundColor Yellow

vercel --prod --yes

# =============================================================================
# Complete
# =============================================================================
Write-Host ""
Write-Host "🎉 DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Your DRIVETUNING app is now live!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Useful Links:" -ForegroundColor Yellow
Write-Host "  - App: https://drivetuning.vercel.app" -ForegroundColor Cyan
Write-Host "  - Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "  - Neon Console: https://console.neon.tech" -ForegroundColor Cyan
