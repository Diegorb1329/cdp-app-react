-- Add batch_id to farm_process_steps for cycle/batch tracking
ALTER TABLE farm_process_steps 
ADD COLUMN IF NOT EXISTS batch_id UUID DEFAULT gen_random_uuid();

-- Create index for batch queries
CREATE INDEX IF NOT EXISTS idx_farm_process_steps_batch_id ON farm_process_steps(batch_id);

-- Drop existing unique constraint if it exists
ALTER TABLE farm_process_steps 
DROP CONSTRAINT IF EXISTS farm_process_steps_farm_id_step_type_step_number_key;

-- Add new unique constraint that includes batch_id
-- This allows multiple batches with same step types
ALTER TABLE farm_process_steps 
ADD CONSTRAINT farm_process_steps_unique 
UNIQUE(farm_id, batch_id, step_type, step_number);

-- For existing records without batch_id, create a default batch
-- This ensures all existing steps belong to a batch
UPDATE farm_process_steps 
SET batch_id = gen_random_uuid() 
WHERE batch_id IS NULL;

-- Make batch_id NOT NULL after setting defaults
ALTER TABLE farm_process_steps 
ALTER COLUMN batch_id SET NOT NULL;

