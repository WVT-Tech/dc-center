-- Cloudflare D1 SQLite Schema for Document Control Center (DCC)
-- Compatible with Cloudflare D1 (SQLite) and local node:sqlite

CREATE TABLE IF NOT EXISTS dcc_departments (
  code TEXT PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  head_name TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dcc_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  dar_permission TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dcc_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  role TEXT NOT NULL,
  role_id TEXT,
  department TEXT NOT NULL,
  title_th TEXT NOT NULL,
  title_en TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dcc_documents (
  id TEXT PRIMARY KEY,
  doc_number TEXT NOT NULL UNIQUE,
  title_th TEXT NOT NULL,
  title_en TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  department TEXT NOT NULL,
  revision TEXT NOT NULL,
  status TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  next_review_date TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  confidentiality TEXT NOT NULL,
  iso_clause TEXT NOT NULL,
  retention_years INTEGER NOT NULL,
  obsolete_reason TEXT,
  obsolete_date TEXT,
  content_json TEXT NOT NULL,
  revision_history_json TEXT NOT NULL,
  distribution_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dcc_dars (
  id TEXT PRIMARY KEY,
  dar_number TEXT NOT NULL UNIQUE,
  dar_type TEXT NOT NULL,
  target_doc_id TEXT,
  proposed_doc_number TEXT NOT NULL,
  proposed_title_th TEXT NOT NULL,
  proposed_title_en TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  department TEXT NOT NULL,
  current_revision TEXT NOT NULL,
  proposed_revision TEXT NOT NULL,
  reason_th TEXT NOT NULL,
  reason_en TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_dept TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  stage TEXT NOT NULL,
  iso_clause TEXT NOT NULL,
  proposed_content_json TEXT,
  logs_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dcc_fishbones (
  id TEXT PRIMARY KEY,
  department TEXT NOT NULL,
  period TEXT NOT NULL,
  main_kpi_title_th TEXT NOT NULL,
  main_kpi_title_en TEXT NOT NULL,
  target_value REAL NOT NULL,
  actual_value REAL NOT NULL,
  unit TEXT NOT NULL,
  direction TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  factors_json TEXT NOT NULL,
  report_json TEXT
);

CREATE TABLE IF NOT EXISTS dcc_audit_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_code TEXT NOT NULL,
  detail_th TEXT NOT NULL,
  detail_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dcc_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dcc_documents_dept ON dcc_documents(department);
CREATE INDEX IF NOT EXISTS idx_dcc_documents_status ON dcc_documents(status);
CREATE INDEX IF NOT EXISTS idx_dcc_dars_stage ON dcc_dars(stage);
CREATE INDEX IF NOT EXISTS idx_dcc_fishbones_dept ON dcc_fishbones(department);
CREATE INDEX IF NOT EXISTS idx_dcc_audit_timestamp ON dcc_audit_events(timestamp);
