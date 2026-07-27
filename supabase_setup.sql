-- ============================================================
-- PATNA HIGH COURT PORTAL — SUPABASE SCHEMA + RLS SETUP
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. CASE RECORDS (master table — 5,708 rows will be seeded)
CREATE TABLE IF NOT EXISTS case_records (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  case_type       TEXT DEFAULT 'First Appeal',
  case_no         TEXT,
  case_year       TEXT,
  appellant       TEXT,
  respondent      TEXT,
  lc_case_type    TEXT,
  lc_case_no      TEXT,
  lc_case_year    TEXT,
  lc_court        TEXT,
  date_of_judgment      TEXT,
  date_of_decree_award  TEXT,
  date_of_filing_fa     TEXT,
  suit_value            TEXT,
  appeal_value          TEXT,
  record_room_bundle_no TEXT,
  dealing_assistant     TEXT,
  data_json             JSONB DEFAULT '{}'
);

-- 2. LCR CALLS
CREATE TABLE IF NOT EXISTS lcr_calls (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data_json  JSONB DEFAULT '{}'
);

-- 3. NOTICE FORMS
CREATE TABLE IF NOT EXISTS notice_forms (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data_json  JSONB DEFAULT '{}'
);

-- 4. DIRECT NOTICES
CREATE TABLE IF NOT EXISTS direct_notices (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data_json  JSONB DEFAULT '{}'
);

-- 5. CAUSE LISTS
CREATE TABLE IF NOT EXISTS cause_lists (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  header_json JSONB DEFAULT '{}',
  cases_json  JSONB DEFAULT '[]'
);

-- 6. FILE TRACKING
CREATE TABLE IF NOT EXISTS file_tracking_state (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data_json  JSONB DEFAULT '[]'
);

-- ============================================================
-- ROW LEVEL SECURITY — Open anonymous access (no login required)
-- ============================================================

ALTER TABLE case_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lcr_calls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_forms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_notices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cause_lists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tracking_state ENABLE ROW LEVEL SECURITY;

-- Allow anon SELECT, INSERT, UPDATE, DELETE on all tables
CREATE POLICY "allow_all_case_records"        ON case_records        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_lcr_calls"           ON lcr_calls           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notice_forms"        ON notice_forms        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_direct_notices"      ON direct_notices      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_cause_lists"         ON cause_lists         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_file_tracking_state" ON file_tracking_state FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Verify setup
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
