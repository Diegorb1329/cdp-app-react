-- Add tree_id to farm_process_steps for tree-specific monthly updates
-- tree_id is required for monthly_update, optional for drying/final_bag
ALTER TABLE farm_process_steps 
ADD COLUMN IF NOT EXISTS tree_id UUID REFERENCES trees(id) ON DELETE CASCADE;

-- Create index for tree queries
CREATE INDEX IF NOT EXISTS idx_farm_process_steps_tree_id ON farm_process_steps(tree_id);

-- Drop existing unique constraint
ALTER TABLE farm_process_steps 
DROP CONSTRAINT IF EXISTS farm_process_steps_unique;

-- Add new unique constraint that includes tree_id for monthly updates
-- This allows: same month for different trees, but not duplicate month for same tree
-- For non-monthly steps (drying, final_bag), tree_id can be NULL
ALTER TABLE farm_process_steps 
ADD CONSTRAINT farm_process_steps_unique 
UNIQUE(farm_id, batch_id, tree_id, step_type, step_number);

-- Note: For monthly_update, tree_id should NOT be NULL
-- For drying and final_bag, tree_id can be NULL (they're batch-level)

