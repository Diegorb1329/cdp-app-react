import { supabase, type FarmProcessStep, type ProcessBatch, type TreeMonthlyStatus, type TreePhoto } from '../lib/supabase';
import { uploadTreePhoto } from './photoService';
import { getTreesByFarm } from './treeService';

export interface CreateProcessStepData {
  step_type: 'monthly_update' | 'drying' | 'final_bag';
  step_number?: number; // For monthly updates: month number (1-12)
  tree_id?: string; // Required for monthly_update, optional for drying/final_bag
  photoFile: File;
  location: { lat: number; lng: number };
  notes?: string;
  batch_id?: string; // Optional: if not provided, uses current batch
}

/**
 * Get all process steps for a farm, optionally filtered by batch
 */
export async function getProcessStepsByFarm(
  farmId: string,
  batchId?: string
): Promise<FarmProcessStep[]> {
  try {
    let query = supabase
      .from('farm_process_steps')
      .select('*')
      .eq('farm_id', farmId);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data, error } = await query
      .order('step_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching process steps:', error);
      return [];
    }

    return data as FarmProcessStep[];
  } catch (error) {
    console.error('Error in getProcessStepsByFarm:', error);
    return [];
  }
}

/**
 * Get monthly status for all trees in a farm/batch
 * Returns which months are completed for each tree
 */
export async function getTreeMonthlyStatus(
  farmId: string,
  batchId?: string
): Promise<TreeMonthlyStatus[]> {
  try {
    const trees = await getTreesByFarm(farmId);
    const steps = batchId 
      ? await getProcessStepsByFarm(farmId, batchId)
      : await getProcessStepsByFarm(farmId);
    
    // Filter only monthly update steps
    const monthlySteps = steps.filter(s => 
      s.step_type === 'monthly_update' && 
      s.completed_at && 
      s.tree_id && 
      s.step_number
    );

    // Group by tree_id
    const treeStatusMap = new Map<string, TreeMonthlyStatus>();
    
    // Initialize all trees
    trees.forEach(tree => {
      treeStatusMap.set(tree.id, {
        tree_id: tree.id,
        tree_number: tree.tree_number,
        completed_months: [],
        missing_months: []
      });
    });

    // Populate completed months - only for trees that belong to this farm
    const treeIds = new Set(trees.map(t => t.id));
    monthlySteps.forEach(step => {
      if (step.tree_id && step.step_number && treeIds.has(step.tree_id)) {
        const status = treeStatusMap.get(step.tree_id);
        if (status && !status.completed_months.includes(step.step_number)) {
          status.completed_months.push(step.step_number);
        }
      }
    });

    // Calculate missing months (1-12)
    treeStatusMap.forEach((status) => {
      const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
      status.missing_months = allMonths.filter(month => 
        !status.completed_months.includes(month)
      );
      // Sort completed months
      status.completed_months.sort((a, b) => a - b);
    });

    return Array.from(treeStatusMap.values());
  } catch (error) {
    console.error('Error in getTreeMonthlyStatus:', error);
    return [];
  }
}

/**
 * Get all batches for a farm with their steps
 */
export async function getBatchesByFarm(farmId: string): Promise<ProcessBatch[]> {
  try {
    const steps = await getProcessStepsByFarm(farmId);
    
    // Group steps by batch_id
    const batchMap = new Map<string, FarmProcessStep[]>();
    
    steps.forEach(step => {
      if (!batchMap.has(step.batch_id)) {
        batchMap.set(step.batch_id, []);
      }
      batchMap.get(step.batch_id)!.push(step);
    });

    // Convert to ProcessBatch array
    const batches: ProcessBatch[] = [];
    batchMap.forEach((steps, batch_id) => {
      // Get the earliest created_at from steps as batch creation date
      const earliestStep = steps.reduce((earliest, current) => {
        return new Date(current.created_at) < new Date(earliest.created_at) ? current : earliest;
      });
      
      batches.push({
        batch_id,
        farm_id: farmId,
        created_at: earliestStep.created_at,
        steps: steps.sort((a, b) => {
          // Sort by step type priority, then step number
          const typeOrder = { monthly_update: 1, drying: 2, final_bag: 3, completed: 4 };
          const aOrder = typeOrder[a.step_type] || 99;
          const bOrder = typeOrder[b.step_type] || 99;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.step_number || 0) - (b.step_number || 0);
        })
      });
    });

    // Sort batches by creation date (newest first)
    return batches.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error in getBatchesByFarm:', error);
    return [];
  }
}

/**
 * Create a new batch for a farm
 */
export async function createNewBatch(_farmId: string): Promise<string | null> {
  try {
    // Generate a new batch_id
    const batchId = crypto.randomUUID();
    return batchId;
  } catch (error) {
    console.error('Error in createNewBatch:', error);
    return null;
  }
}

/**
 * Get current process status for a farm and batch
 * Returns available actions (drying and final bag are always available)
 */
export async function getFarmProcessStatus(
  farmId: string,
  batchId?: string
): Promise<{
  currentStep: 'monthly_update' | 'drying' | 'final_bag' | 'completed';
  completedSteps: FarmProcessStep[];
  availableActions: {
    canStartDrying: boolean;
    canStartFinalBag: boolean;
    canStartMonthly: boolean;
  };
  monthlySteps: FarmProcessStep[];
  dryingSteps: FarmProcessStep[];
  finalBagSteps: FarmProcessStep[];
  treeMonthlyStatus: TreeMonthlyStatus[];
}> {
  try {
    const steps = batchId 
      ? await getProcessStepsByFarm(farmId, batchId)
      : await getProcessStepsByFarm(farmId);
    
    // Separate steps by type
    // For monthly updates, only include steps with tree_id (required for monthly updates)
    const monthlySteps = steps.filter(s => 
      s.step_type === 'monthly_update' && 
      s.completed_at && 
      s.tree_id !== null
    );
    const dryingSteps = steps.filter(s => s.step_type === 'drying' && s.completed_at);
    const finalBagSteps = steps.filter(s => s.step_type === 'final_bag' && s.completed_at);
    
    // Get tree monthly status
    const treeMonthlyStatus = await getTreeMonthlyStatus(farmId, batchId);

    // Check if process is marked as completed
    const processCompleted = steps.some(s => s.step_type === 'completed' && s.completed_at);

    let currentStep: 'monthly_update' | 'drying' | 'final_bag' | 'completed';

    if (processCompleted) {
      currentStep = 'completed';
    } else if (finalBagSteps.length > 0) {
      currentStep = 'final_bag';
    } else if (dryingSteps.length > 0) {
      currentStep = 'final_bag'; // Can start final bag after drying
    } else {
      currentStep = 'monthly_update';
    }

    return {
      currentStep,
      completedSteps: steps.filter(s => s.completed_at !== null),
      availableActions: {
        canStartDrying: true, // Always available
        canStartFinalBag: true, // Always available
        canStartMonthly: true, // Always available
      },
      monthlySteps,
      dryingSteps,
      finalBagSteps,
      treeMonthlyStatus
    };
  } catch (error) {
    console.error('Error in getFarmProcessStatus:', error);
    // Return default empty state on error
    return {
      currentStep: 'monthly_update',
      completedSteps: [],
      availableActions: {
        canStartDrying: true,
        canStartFinalBag: true,
        canStartMonthly: true,
      },
      monthlySteps: [],
      dryingSteps: [],
      finalBagSteps: [],
      treeMonthlyStatus: []
    };
  }
}

/**
 * Create a process step with photo upload
 * For monthly_update, tree_id is required
 * For drying/final_bag, tree_id is optional (can be null)
 */
export async function createProcessStep(
  farmId: string,
  stepData: CreateProcessStepData,
  batchId?: string
): Promise<FarmProcessStep | null> {
  try {
    let treeId: string | null = null;

    if (stepData.step_type === 'monthly_update') {
      // For monthly updates, tree_id is required
      if (!stepData.tree_id) {
        throw new Error('Tree ID is required for monthly updates');
      }
      treeId = stepData.tree_id;
    } else {
      // For drying/final_bag, tree_id is optional
      // If not provided, we can use first tree or leave null
      if (stepData.tree_id) {
        treeId = stepData.tree_id;
      } else {
        // Get first tree for process photos (optional for drying/final_bag)
        const trees = await getTreesByFarm(farmId);
        if (trees.length > 0) {
          treeId = trees[0].id;
        }
      }
    }

    if (!treeId) {
      throw new Error('Tree ID is required. Please ensure your farm has at least one tree.');
    }

    // Upload photo
    const photo = await uploadTreePhoto(treeId, {
      photoFile: stepData.photoFile,
      location: stepData.location,
      photo_type: stepData.step_type === 'monthly_update' ? 'monthly_update' : 
                  stepData.step_type === 'drying' ? 'other' : 'packing'
    });

    if (!photo) {
      throw new Error('Failed to upload photo');
    }

    // Use provided batch_id or generate new one
    const finalBatchId = batchId || stepData.batch_id || crypto.randomUUID();

    // Create process step
    const { data, error } = await supabase
      .from('farm_process_steps')
      .insert({
        farm_id: farmId,
        batch_id: finalBatchId,
        tree_id: treeId,
        step_type: stepData.step_type,
        step_number: stepData.step_number || null,
        photo_id: photo.id,
        notes: stepData.notes || null,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating process step:', error);
      return null;
    }

    return data as FarmProcessStep;
  } catch (error) {
    console.error('Error in createProcessStep:', error);
    throw error;
  }
}

/**
 * Mark process as completed for a batch
 */
export async function completeFarmProcess(farmId: string, batchId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('farm_process_steps')
      .insert({
        farm_id: farmId,
        batch_id: batchId,
        tree_id: null,
        step_type: 'completed',
        step_number: null,
        completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error completing process:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in completeFarmProcess:', error);
    return false;
  }
}

/**
 * Get all photos from a batch's steps
 */
export async function getBatchPhotos(
  farmId: string,
  batchId: string
): Promise<TreePhoto[]> {
  try {
    const steps = await getProcessStepsByFarm(farmId, batchId);
    const photoIds = steps
      .filter(s => s.photo_id !== null)
      .map(s => s.photo_id!);

    if (photoIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('tree_photos')
      .select('*')
      .in('id', photoIds)
      .order('taken_at', { ascending: true });

    if (error) {
      console.error('Error fetching batch photos:', error);
      return [];
    }

    return data as TreePhoto[];
  } catch (error) {
    console.error('Error in getBatchPhotos:', error);
    return [];
  }
}

/**
 * Check if a batch is ready for hypercert minting
 * A batch is ready if:
 * - Each tree has at least one photo (monthly_update)
 * - It has a photo of the drying system (drying step with photo)
 * - It has a photo of the final bag (final_bag step with photo)
 */
export async function isBatchReadyForHypercert(
  farmId: string,
  batchId: string
): Promise<{ ready: boolean; reason?: string }> {
  try {
    const steps = await getProcessStepsByFarm(farmId, batchId);
    
    // Get all trees for the farm
    const trees = await getTreesByFarm(farmId);
    
    if (trees.length === 0) {
      return { ready: false, reason: 'Farm must have at least one tree' };
    }
    
    // Check that each tree has at least one photo (monthly_update) in this batch
    const treeIds = new Set(trees.map(t => t.id));
    const monthlySteps = steps.filter(s => 
      s.step_type === 'monthly_update' && 
      s.tree_id !== null && 
      s.photo_id !== null &&
      treeIds.has(s.tree_id)
    );
    
    // Group monthly steps by tree_id to check each tree has at least one photo
    const treesWithPhotos = new Set(monthlySteps.map(s => s.tree_id!));
    
    // Find trees without photos
    const treesWithoutPhotos = trees.filter(t => !treesWithPhotos.has(t.id));
    if (treesWithoutPhotos.length > 0) {
      const treeNumbers = treesWithoutPhotos
        .map(t => t.tree_number || t.id.slice(0, 8))
        .join(', ');
      return { 
        ready: false, 
        reason: `Missing photos for tree(s): ${treeNumbers}. Each tree needs at least one photo.` 
      };
    }
    
    // Check if batch has drying step with photo
    const hasDryingWithPhoto = steps.some(s => 
      s.step_type === 'drying' && 
      s.photo_id !== null
    );
    if (!hasDryingWithPhoto) {
      return { ready: false, reason: 'Missing photo of the drying system' };
    }
    
    // Check if batch has final_bag step with photo
    const hasFinalBagWithPhoto = steps.some(s => 
      s.step_type === 'final_bag' && 
      s.photo_id !== null
    );
    if (!hasFinalBagWithPhoto) {
      return { ready: false, reason: 'Missing photo of the final bag' };
    }
    
    return { ready: true };
  } catch (error) {
    console.error('Error checking batch readiness:', error);
    return { ready: false, reason: 'Error checking batch status' };
  }
}
