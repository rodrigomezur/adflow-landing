-- ADFLOW PROJECTS TABLE
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Project: ykmdpxtnmqkfcscmmjfv

-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Link to lead (optional, project can exist without lead)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Client info
  client_name TEXT NOT NULL,
  client_email TEXT,
  product_url TEXT,
  brand_assets_url TEXT,
  
  -- Project details
  brief TEXT,
  target_audience TEXT,
  competitors TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'intake' CHECK (status IN (
    'intake',      -- Just started, gathering info
    'strategy',    -- Analyzing competitors, planning
    'generating',  -- Creating assets
    'qa',          -- Quality check
    'delivered',   -- Sent to client
    'revision',    -- Client requested changes
    'completed'    -- Project closed
  )),
  
  -- Progress tracking (JSON for flexibility)
  progress JSONB DEFAULT '{
    "intake": false,
    "strategy": false,
    "images": false,
    "videos": false,
    "copy": false,
    "qa": false,
    "delivery": false
  }'::jsonb,
  
  -- Deliverables
  assets_folder_url TEXT,        -- Google Drive link
  preview_deck_url TEXT,         -- Presentation/preview
  deliverables_count INTEGER DEFAULT 0,
  
  -- Pricing
  package TEXT DEFAULT 'sprint', -- sprint, pro, retainer
  price_usd DECIMAL(10,2),
  paid BOOLEAN DEFAULT false,
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT
);

-- Create index for faster queries
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations with anon key (for admin dashboard)
-- For production, you'd want more restrictive policies
CREATE POLICY "Allow all for anon" ON projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add some helpful comments
COMMENT ON TABLE projects IS 'AdFlow client projects for creative delivery';
COMMENT ON COLUMN projects.status IS 'Current project phase: intake→strategy→generating→qa→delivered→completed';
COMMENT ON COLUMN projects.progress IS 'JSON tracking completion of each sub-task';
