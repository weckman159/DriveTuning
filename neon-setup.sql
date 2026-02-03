-- =============================================================================
-- NEON PostgreSQL Setup Script for DRIVETUNING
-- =============================================================================
-- This script runs automatically via Prisma migrations on first deploy.
-- Use for manual database setup if needed.
--
-- Execute in Neon Console: https://console.neon.tech
-- Or via CLI: psql "postgres://user:password@ep-xxx.neon.tech/neondb"
-- =============================================================================

-- Create extensions for better performance
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Note: Neon free tier has limited extension support.
-- Core PostgreSQL functionality works out of the box.

-- =============================================================================
-- Database Size Check (optional monitoring)
-- =============================================================================
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as db_size,
    pg_size_pretty(pg_total_relation_size('public.user')) as users_size;

-- =============================================================================
-- Connection Pool Settings (Neon-specific)
-- =============================================================================
-- These are managed automatically by Neon. No manual config needed.
-- 
-- Key settings for Neon:
-- - max_connections: 100 (free tier)
-- - statement_timeout: 60000 (60s)
-- - idle_in_transaction_session_timeout: 30000 (30s)

-- =============================================================================
-- Indexes for Performance Optimization
-- =============================================================================
-- Create custom indexes for common queries

CREATE INDEX IF NOT EXISTS idx_cars_garage_id ON public."Car"("garageId");
CREATE INDEX IF NOT EXISTS idx_log_entries_car_id ON public."LogEntry"("carId");
CREATE INDEX IF NOT EXISTS idx_modifications_log_entry_id ON public."Modification"("logEntryId");
CREATE INDEX IF NOT EXISTS idx_part_listings_seller_id ON public."PartListing"("sellerId");
CREATE INDEX IF NOT EXISTS idx_events_status ON public."Event"("status");
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON public."EventAttendance"("eventId");

-- Full-text search indexes (optional)
CREATE INDEX IF NOT EXISTS idx_cars_search ON public."Car" USING gin (
    to_tsvector('german', coalesce("make",'') || ' ' || coalesce("model",'') || ' ' || coalesce("generation",''))
);

CREATE INDEX IF NOT EXISTS idx_listings_search ON public."PartListing" USING gin (
    to_tsvector('german', coalesce(title,'') || ' ' || coalesce(description,''))
);

-- =============================================================================
-- Tips for Neon Free Tier
-- =============================================================================
/*
1. Connection Pooling:
   - Use POSTGRES_PRISMA_URL for Prisma (auto-pools)
   - Use POSTGRES_URL_NON_POOLING for direct connections (Drizzle, etc.)

2. Compute Suspend:
   - Free tier suspends after 1 hour of inactivity
   - First request after suspend takes ~500ms to resume

3. Storage:
   - Free tier: 0.5 GB storage
   - Monitor usage in Neon Console > Billing

4. Regions:
   - Default: us-east-1 (AWS Virginia)
   - EU option: eu-central-1 (AWS Frankfurt)
   - Closer region = lower latency

5. Backups:
   - Automatic daily backups included
   - Point-in-time recovery available
   - 7-day retention on free tier
*/

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these to verify your setup

-- List all tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check Prisma migrations applied
-- SELECT * FROM "_prisma_migrations" ORDER BY started_at DESC;

-- View database size
-- SELECT pg_size_pretty(pg_database_size(current_database()));
