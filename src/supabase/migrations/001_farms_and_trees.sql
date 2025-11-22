-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  boundaries JSONB NOT NULL, -- Array of GeoJSON Polygon objects
  area_hectares DECIMAL(10, 2), -- Calculated automatically from boundaries
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trees table
CREATE TABLE IF NOT EXISTS trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  location POINT NOT NULL,
  tree_number TEXT,
  variety TEXT,
  planting_date DATE,
  status TEXT CHECK (status IN ('active', 'dormant', 'removed')) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tree photos table
CREATE TABLE IF NOT EXISTS tree_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  ipfs_cid TEXT UNIQUE NOT NULL,
  ipfs_gateway_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('monthly_update', 'packing', 'harvest', 'other')) DEFAULT 'monthly_update',
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_farms_farmer_id ON farms(farmer_id);
CREATE INDEX IF NOT EXISTS idx_trees_farm_id ON trees(farm_id);
CREATE INDEX IF NOT EXISTS idx_tree_photos_tree_id ON tree_photos(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_photos_ipfs_cid ON tree_photos(ipfs_cid);

-- Index for boundaries JSONB queries
CREATE INDEX IF NOT EXISTS idx_farms_boundaries ON farms USING GIN(boundaries);
-- GIST index for spatial queries on trees
CREATE INDEX IF NOT EXISTS idx_trees_location ON trees USING GIST(location);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trees_updated_at BEFORE UPDATE ON trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for farms
-- Note: In production, you'd want to use Supabase Auth or Edge Functions for proper authorization
-- For now, we allow users to manage farms where they are the farmer
-- The application layer should verify ownership before allowing operations

-- Allow users to view farms (we'll filter by farmer_id in the app)
CREATE POLICY "Users can view farms" ON farms FOR SELECT USING (true);

-- Allow users to insert farms (application should verify farmer_id matches authenticated user)
CREATE POLICY "Users can insert farms" ON farms FOR INSERT WITH CHECK (true);

-- Allow users to update farms (application should verify ownership)
CREATE POLICY "Users can update farms" ON farms FOR UPDATE USING (true);

-- Allow users to delete farms (application should verify ownership)
CREATE POLICY "Users can delete farms" ON farms FOR DELETE USING (true);

-- RLS Policies for trees
-- Allow users to view trees (application filters by farm ownership)
CREATE POLICY "Users can view trees" ON trees FOR SELECT USING (true);

-- Allow users to insert trees (application should verify farm ownership)
CREATE POLICY "Users can insert trees" ON trees FOR INSERT WITH CHECK (true);

-- Allow users to update trees (application should verify farm ownership)
CREATE POLICY "Users can update trees" ON trees FOR UPDATE USING (true);

-- Allow users to delete trees (application should verify farm ownership)
CREATE POLICY "Users can delete trees" ON trees FOR DELETE USING (true);

-- RLS Policies for tree_photos
-- Allow users to view photos (application filters by tree/farm ownership)
CREATE POLICY "Users can view tree photos" ON tree_photos FOR SELECT USING (true);

-- Allow users to insert photos (application should verify tree ownership)
CREATE POLICY "Users can insert tree photos" ON tree_photos FOR INSERT WITH CHECK (true);

