import { useState, useEffect } from 'react';
import { 
  getFarmProcessStatus, 
  getBatchesByFarm, 
  createNewBatch 
} from '../services/farmProcessService';
import { ProcessStepForm } from './ProcessStepForm';
import { ProcessCard } from './ProcessCard';
import { BatchSelector } from './BatchSelector';
import { TreeMonthlyTracker } from './TreeMonthlyTracker';
import type { Farm } from '../lib/supabase';

export interface ProcessWorkflowProps {
  farm: Farm;
}

export function ProcessWorkflow({ farm }: ProcessWorkflowProps) {
  const [processStatus, setProcessStatus] = useState<{
    currentStep: 'monthly_update' | 'drying' | 'final_bag' | 'completed';
    currentMonth: number | null;
    completedSteps: any[];
    availableActions: {
      canStartDrying: boolean;
      canStartFinalBag: boolean;
      canStartMonthly: boolean;
      nextMonthlyNumber: number;
    };
    monthlySteps: any[];
    dryingSteps: any[];
    finalBagSteps: any[];
    treeMonthlyStatus: any[];
  } | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStepForm, setShowStepForm] = useState(false);
  const [selectedStep, setSelectedStep] = useState<{
    type: 'monthly_update' | 'drying' | 'final_bag';
    month?: number;
    treeId?: string;
  } | null>(null);
  const [creatingBatch, setCreatingBatch] = useState(false);

  useEffect(() => {
    // Reset everything when farm changes
    setSelectedBatchId(null);
    setBatches([]);
    setProcessStatus(null);
    setLoading(true);
    
    // Load batches for the new farm
    const loadBatchesForFarm = async () => {
      try {
        const allBatches = await getBatchesByFarm(farm.id);
        setBatches(allBatches);
        
        let batchIdToUse: string | null = null;
        
        // Auto-select first batch if available
        if (allBatches.length > 0) {
          batchIdToUse = allBatches[0].batch_id;
          setSelectedBatchId(batchIdToUse);
        } else {
          // Create first batch if none exist
          const newBatchId = await createNewBatch(farm.id);
          if (newBatchId) {
            // Set the new batch ID even though it won't show in batches list yet
            // (because it has no steps, so getBatchesByFarm won't return it)
            batchIdToUse = newBatchId;
            setSelectedBatchId(newBatchId);
          }
        }
        
        // Load process status if we have a batch
        if (batchIdToUse) {
          try {
            const status = await getFarmProcessStatus(farm.id, batchIdToUse);
            setProcessStatus({
              ...status,
              currentMonth: null,
              availableActions: {
                ...status.availableActions,
                nextMonthlyNumber: 1
              }
            });
          } catch (error) {
            console.error('Error loading process status:', error);
            // Try loading without batch filter as fallback
            const status = await getFarmProcessStatus(farm.id);
            setProcessStatus({
              ...status,
              currentMonth: null,
              availableActions: {
                ...status.availableActions,
                nextMonthlyNumber: 1
              }
            });
          }
        } else {
          // No batch available, create empty status
          const status = await getFarmProcessStatus(farm.id);
          setProcessStatus({
            ...status,
            currentMonth: null,
            availableActions: {
              ...status.availableActions,
              nextMonthlyNumber: 1
            }
          });
        }
      } catch (error) {
        console.error('Error loading batches:', error);
        // Try to load process status anyway (without batch filter)
        try {
          const status = await getFarmProcessStatus(farm.id);
          setProcessStatus({
            ...status,
            currentMonth: null,
            availableActions: {
              ...status.availableActions,
              nextMonthlyNumber: 1
            }
          });
        } catch (statusError) {
          console.error('Error loading process status as fallback:', statusError);
          setProcessStatus(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadBatchesForFarm();
  }, [farm.id]);

  useEffect(() => {
    // Only reload process status if batch selection changes (not on initial load)
    if (selectedBatchId && batches.length > 0) {
      loadProcessStatus();
    }
  }, [selectedBatchId]);

  const loadProcessStatus = async () => {
    // Allow loading if we have a selectedBatchId (even if batches list is empty - new batch with no steps)
    // or if we have batches available
    if (!selectedBatchId && batches.length === 0) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const batchId = selectedBatchId || batches[0]?.batch_id;
      
      if (!batchId) {
        setLoading(false);
        return;
      }
      
      // Validate batch belongs to current farm (if it's in the batches list)
      // Note: New batches might not be in the list yet if they have no steps
      const validBatch = batches.find(b => b.batch_id === batchId);
      
      if (!validBatch && batches.length > 0) {
        // If batch doesn't belong to this farm, use first batch
        const firstBatchId = batches[0].batch_id;
        const status = await getFarmProcessStatus(farm.id, firstBatchId);
        setProcessStatus({
          ...status,
          currentMonth: null,
          availableActions: {
            ...status.availableActions,
            nextMonthlyNumber: 1
          }
        });
        setSelectedBatchId(firstBatchId);
      } else {
        // Load status - this works even for new batches without steps yet
        // Even if batchId is not in batches list (new batch with no steps)
        try {
          const status = await getFarmProcessStatus(farm.id, batchId);
          setProcessStatus({
            ...status,
            currentMonth: null,
            availableActions: {
              ...status.availableActions,
              nextMonthlyNumber: 1
            }
          });
        } catch (error) {
          console.error('Error loading process status for batch:', batchId, error);
          // If error, try loading without batch filter (all steps for farm)
          const status = await getFarmProcessStatus(farm.id);
          setProcessStatus({
            ...status,
            currentMonth: null,
            availableActions: {
              ...status.availableActions,
              nextMonthlyNumber: 1
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading process status:', error);
      setProcessStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewBatch = async () => {
    setCreatingBatch(true);
    try {
      const newBatchId = await createNewBatch(farm.id);
      if (newBatchId) {
        // Reload batches to get the new one
        const allBatches = await getBatchesByFarm(farm.id);
        setBatches(allBatches);
        setSelectedBatchId(newBatchId);
        // Reload process status
        await loadProcessStatus();
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      alert('Failed to create new batch. Please try again.');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleStepComplete = async () => {
    await loadProcessStatus();
    setShowStepForm(false);
    setSelectedStep(null);
  };

  const handleStartStep = (stepType: 'monthly_update' | 'drying' | 'final_bag', month?: number) => {
    setSelectedStep({ type: stepType, month });
    setShowStepForm(true);
  };

  const handleSelectTreeMonth = (treeId: string, month: number) => {
    setSelectedStep({ type: 'monthly_update', month, treeId });
    setShowStepForm(true);
  };

  if (loading && !processStatus) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: '#666' 
      }}>
        Loading process status...
      </div>
    );
  }

  if (!processStatus) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: '#ef4444' 
      }}>
        Error loading process status
      </div>
    );
  }

  const { 
    dryingSteps, 
    finalBagSteps, 
    availableActions,
    treeMonthlyStatus
  } = processStatus;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Process Workflow</h2>
      
      {/* Batch Selector */}
      <BatchSelector
        batches={batches}
        selectedBatchId={selectedBatchId}
        onSelectBatch={(batchId) => {
          setSelectedBatchId(batchId);
        }}
        onCreateNewBatch={handleCreateNewBatch}
        loading={creatingBatch}
        farm={farm}
      />

      {/* Tree Monthly Tracker */}
      <div style={{ marginBottom: '2rem' }}>
        <TreeMonthlyTracker
          treeStatus={treeMonthlyStatus}
          onSelectTreeMonth={handleSelectTreeMonth}
          loading={loading}
        />
      </div>

      {/* Process Cards - Drying and Final Bag */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Drying Process Card */}
        <ProcessCard
          title="Drying Process"
          icon="☀️"
          description="Document your drying method. Upload photos showing how you dry your coffee beans. You can start this process at any time."
          completedSteps={dryingSteps}
          onStart={() => handleStartStep('drying')}
          canStart={availableActions.canStartDrying}
          nextStepLabel={dryingSteps.length > 0 ? "Add Another Photo" : "Start Drying Process"}
        />

        {/* Final Bag Card */}
        <ProcessCard
          title="Final Bag"
          icon="📦"
          description="Document your final product. Upload photos of the bagged coffee. You can start this process at any time."
          completedSteps={finalBagSteps}
          onStart={() => handleStartStep('final_bag')}
          canStart={availableActions.canStartFinalBag}
          nextStepLabel={finalBagSteps.length > 0 ? "Add Another Photo" : "Start Final Bag"}
        />
      </div>

      {/* Info banner */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe',
        marginBottom: '1rem'
      }}>
        <p style={{ 
          margin: 0, 
          fontSize: '0.9rem', 
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>💡</span>
          <span>
            <strong>Tip:</strong> Each tree needs 12 monthly photos per year. 
            Drying Process and Final Bag can be started at any time, regardless of monthly updates.
          </span>
        </p>
      </div>

      {/* Step form modal */}
      {showStepForm && selectedStep && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>
                {selectedStep.type === 'monthly_update' 
                  ? `Month ${selectedStep.month} - Upload Photo` 
                  : selectedStep.type === 'drying' 
                    ? 'Drying Process - Upload Photo' 
                    : 'Final Bag - Upload Photo'}
              </h2>
              <button
                onClick={() => {
                  setShowStepForm(false);
                  setSelectedStep(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#e5e5e5',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ✕ Close
              </button>
            </div>
            <ProcessStepForm
              farmId={farm.id}
              stepType={selectedStep.type}
              stepNumber={selectedStep.month}
              treeId={selectedStep.treeId}
              batchId={selectedBatchId || undefined}
              onComplete={handleStepComplete}
              onCancel={() => {
                setShowStepForm(false);
                setSelectedStep(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

