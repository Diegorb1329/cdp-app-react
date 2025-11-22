-- Farm process steps table
CREATE TABLE IF NOT EXISTS farm_process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('monthly_update', 'drying', 'final_bag', 'completed')),
  step_number INTEGER, -- For monthly updates: 1, 2, 3, etc.
  photo_id UUID REFERENCES tree_photos(id) ON DELETE SET NULL,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(farm_id, step_type, step_number) -- Prevent duplicate steps
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_farm_process_steps_farm_id ON farm_process_steps(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_process_steps_type ON farm_process_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_farm_process_steps_photo_id ON farm_process_steps(photo_id);

-- Trigger for updated_at
CREATE TRIGGER update_farm_process_steps_updated_at BEFORE UPDATE ON farm_process_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE farm_process_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for farm_process_steps
CREATE POLICY "Users can view farm process steps" ON farm_process_steps FOR SELECT USING (true);
CREATE POLICY "Users can insert farm process steps" ON farm_process_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update farm process steps" ON farm_process_steps FOR UPDATE USING (true);
CREATE POLICY "Users can delete farm process steps" ON farm_process_steps FOR DELETE USING (true);

