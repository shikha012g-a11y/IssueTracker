CREATE DATABASE IF NOT EXISTS Tracker_DB;
USE Tracker_DB;

DROP TABLE IF EXISTS Tracker;

CREATE TABLE Tracker(
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(100) NOT NULL,       -- Channels, Infra, Trade Finance, GBM, etc.
  entity VARCHAR(100) NOT NULL,       -- Domestic, RRB, Overseas, PNB Domestic, etc.
  environment VARCHAR(50) DEFAULT 'PROD',      -- PROD, UAT, etc.
  reported_date DATE NOT NULL,
  issue_description TEXT NOT NULL,
  l2_analysis TEXT,
  tol_id VARCHAR(100),
  l3_updates_remarks TEXT,
  issue_status VARCHAR(100) NOT NULL,    -- 'Closed', 'Open with Bank', 'Open with Infosys and L3'
  closure_date DATE,
  closure_category VARCHAR(100),
  assignee VARCHAR(100),
  co_assignee VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Indexing for fast aggregation queries
CREATE INDEX idx_module ON Tracker(module);
CREATE INDEX idx_entity ON Tracker(entity);
CREATE INDEX idx_status ON Tracker(issue_status);
CREATE INDEX idx_reported_date ON Tracker(reported_date);