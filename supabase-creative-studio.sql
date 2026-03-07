-- =============================================
-- ADFLOW CREATIVE STUDIO - DATABASE SCHEMA
-- =============================================

-- Brands table (clients)
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT, -- ecommerce, saas, localService, b2bEnterprise, infoProducts, mobileApp
  description TEXT,
  
  -- Brand Kit
  primary_color TEXT DEFAULT '#C8FF00',
  secondary_color TEXT DEFAULT '#080D1A',
  accent_color TEXT,
  font_headline TEXT DEFAULT 'Inter',
  font_body TEXT DEFAULT 'Inter',
  logo_light_url TEXT,
  logo_dark_url TEXT,
  
  -- Brand Voice
  tone TEXT, -- professional, casual, playful, premium, etc.
  target_audience TEXT,
  unique_selling_points TEXT[], -- array of USPs
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Intelligence (personas, pain points, angles)
CREATE TABLE IF NOT EXISTS brand_intelligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Persona Info
  persona_name TEXT NOT NULL, -- "Skeptical First-Time Buyer"
  persona_description TEXT,
  
  -- Pain Points & Psychology
  pain_points TEXT[], -- array of pain points
  desires TEXT[], -- what they want
  objections TEXT[], -- why they might not buy
  
  -- Messaging
  emotional_trigger TEXT, -- "trust", "excitement", "relief"
  messaging_angle TEXT, -- the angle/hook to use
  copy_hooks TEXT[], -- example hooks/headlines
  
  -- Visual Direction
  visual_style TEXT, -- "UGC", "premium", "lifestyle"
  
  -- Source
  source TEXT DEFAULT 'manual', -- 'manual', 'ai_generated', 'research'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Assets (product images, lifestyle shots, etc.)
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'image/png', 'image/jpeg'
  file_size INTEGER,
  
  category TEXT DEFAULT 'other', -- 'product', 'lifestyle', 'logo', 'packaging', 'ugc', 'other'
  tags TEXT[],
  
  is_favorite BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates (saved winning ads for reference)
CREATE TABLE IF NOT EXISTS ad_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL, -- null = global template
  
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  
  -- Classification
  ad_type TEXT, -- 'before-after', 'big-callout', 'feature-callout', etc.
  category TEXT, -- 'competitor', 'winner', 'inspiration'
  source TEXT, -- 'foreplay', 'creative-os', 'client', 'generated'
  source_url TEXT,
  
  -- Extracted Info (from reverse-engineering)
  extracted_prompt TEXT,
  extracted_hooks TEXT[],
  extracted_ctas TEXT[],
  
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generations (history of all generated images)
CREATE TABLE IF NOT EXISTS generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Generation Mode
  mode TEXT NOT NULL, -- 'competitor', 'scratch', 'iteration'
  
  -- Input
  ad_type TEXT, -- 'before-after', 'ugc-image', etc.
  prompt TEXT NOT NULL,
  prompt_json JSONB, -- full JSON prompt if applicable
  
  -- References used
  reference_template_id UUID REFERENCES ad_templates(id),
  product_asset_id UUID REFERENCES brand_assets(id),
  persona_id UUID REFERENCES brand_intelligence(id),
  
  -- Output
  image_url TEXT,
  image_urls TEXT[], -- for batch generations
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  
  -- Metadata
  model TEXT DEFAULT 'fal-ai/nano-banana-2',
  aspect_ratio TEXT DEFAULT '1:1',
  cost DECIMAL(10, 4), -- cost in dollars
  generation_time_ms INTEGER,
  
  -- Feedback
  rating INTEGER, -- 1-5 stars
  is_winner BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_intelligence_brand ON brand_intelligence(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_brand ON brand_assets(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_category ON brand_assets(category);
CREATE INDEX IF NOT EXISTS idx_ad_templates_brand ON ad_templates(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_templates_type ON ad_templates(ad_type);
CREATE INDEX IF NOT EXISTS idx_generations_brand ON generations(brand_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_mode ON generations(mode);

-- Enable Row Level Security (optional, for future multi-user)
-- ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE brand_intelligence ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ad_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
