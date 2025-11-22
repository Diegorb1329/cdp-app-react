import type { ProcessBatch, Farm } from '../lib/supabase';
import { useState, useEffect } from 'react';
import { isBatchReadyForHypercert } from '../services/farmProcessService';
import { mintBatchHypercert } from '../services/hypercertService';

export interface BatchSelectorProps {
  batches: ProcessBatch[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  onCreateNewBatch: () => void;
  loading?: boolean;
  farm: Farm;
}

export function BatchSelector({
  batches,
  selectedBatchId,
  onSelectBatch,
  onCreateNewBatch,
  loading = false,
  farm
}: BatchSelectorProps) {
  const [minting, setMinting] = useState(false);
  const [batchReadiness, setBatchReadiness] = useState<Record<string, { ready: boolean; reason?: string }>>({});
  const selectedBatch = batches.find(b => b.batch_id === selectedBatchId);
  
  // Check batch readiness when selected batch changes
  useEffect(() => {
    const checkReadiness = async () => {
      if (selectedBatchId) {
        const readiness = await isBatchReadyForHypercert(farm.id, selectedBatchId);
        setBatchReadiness(prev => ({
          ...prev,
          [selectedBatchId]: readiness
        }));
      }
    };
    checkReadiness();
  }, [selectedBatchId, farm.id]);

  const handleMintHypercert = async () => {
    if (!selectedBatchId || !selectedBatch) return;

    setMinting(true);
    try {
      const result = await mintBatchHypercert(selectedBatch, farm);
      if (result.success) {
        alert(`Hypercert minted successfully! Claim ID: ${result.claimId}`);
      } else {
        alert(`Failed to mint hypercert: ${result.error}`);
      }
    } catch (error) {
      console.error('Error minting hypercert:', error);
      alert('An error occurred while minting the hypercert');
    } finally {
      setMinting(false);
    }
  };

  const isReady = selectedBatchId ? batchReadiness[selectedBatchId]?.ready : false;
  
  // Get batch summary
  const getBatchSummary = (batch: ProcessBatch) => {
    const monthlyCount = batch.steps.filter(s => s.step_type === 'monthly_update').length;
    const hasDrying = batch.steps.some(s => s.step_type === 'drying');
    const hasFinalBag = batch.steps.some(s => s.step_type === 'final_bag');
    const isCompleted = batch.steps.some(s => s.step_type === 'completed');
    
    return {
      monthlyCount,
      hasDrying,
      hasFinalBag,
      isCompleted,
      totalSteps: batch.steps.length
    };
  };

  const formatBatchDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      marginBottom: '2rem',
      padding: '1.5rem',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: '600' }}>
            Process Batch
          </h3>
          {selectedBatch && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
              Started {formatBatchDate(selectedBatch.created_at)}
            </p>
          )}
        </div>
        <button
          onClick={onCreateNewBatch}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading ? '#ccc' : '#8B6F47',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#6b5638';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#8B6F47';
            }
          }}
        >
          <span>+</span>
          <span>New Batch</span>
        </button>
      </div>

      {/* Batch selector dropdown */}
      {batches.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <label style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            color: '#666'
          }}>
            Switch Batch:
          </label>
          <select
            value={selectedBatchId || ''}
            onChange={(e) => onSelectBatch(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.9rem',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            {batches.map((batch, index) => {
              const summary = getBatchSummary(batch);
              const batchLabel = `Batch #${batches.length - index} (${formatBatchDate(batch.created_at)})`;
              return (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batchLabel} {summary.isCompleted ? '✓' : ''}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Selected batch summary */}
      {selectedBatch && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            fontSize: '0.85rem'
          }}>
            <div>
              <span style={{ color: '#666', fontWeight: '500' }}>Monthly Updates: </span>
              <span style={{ fontWeight: '600' }}>
                {getBatchSummary(selectedBatch).monthlyCount}
              </span>
            </div>
            <div>
              <span style={{ color: '#666', fontWeight: '500' }}>Drying: </span>
              <span style={{ fontWeight: '600', color: getBatchSummary(selectedBatch).hasDrying ? '#22c55e' : '#666' }}>
                {getBatchSummary(selectedBatch).hasDrying ? '✓ Done' : 'Not started'}
              </span>
            </div>
            <div>
              <span style={{ color: '#666', fontWeight: '500' }}>Final Bag: </span>
              <span style={{ fontWeight: '600', color: getBatchSummary(selectedBatch).hasFinalBag ? '#22c55e' : '#666' }}>
                {getBatchSummary(selectedBatch).hasFinalBag ? '✓ Done' : 'Not started'}
              </span>
            </div>
            <div>
              <span style={{ color: '#666', fontWeight: '500' }}>Total Steps: </span>
              <span style={{ fontWeight: '600' }}>
                {getBatchSummary(selectedBatch).totalSteps}
              </span>
            </div>
            {getBatchSummary(selectedBatch).isCompleted && (
              <div style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '0.8rem'
              }}>
                ✓ Completed
              </div>
            )}
          </div>

          {/* Mint Hypercert section */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            {isReady ? (
              <button
                onClick={handleMintHypercert}
                disabled={minting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: minting ? '#ccc' : '#8B6F47',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: minting ? 'not-allowed' : 'pointer',
                  width: '100%',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!minting) {
                    e.currentTarget.style.backgroundColor = '#6b5638';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!minting) {
                    e.currentTarget.style.backgroundColor = '#8B6F47';
                  }
                }}
              >
                {minting ? 'Minting Hypercert...' : '🎖️ Mint Hypercert'}
              </button>
            ) : (
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: '#fef3c7', 
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#92400e'
              }}>
                ⚠️ Not ready for minting: {selectedBatchId && batchReadiness[selectedBatchId] ? batchReadiness[selectedBatchId].reason || 'Checking...' : 'Checking...'}
              </div>
            )}
          </div>
        </div>
      )}

      {batches.length === 0 && !loading && (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.9rem'
        }}>
          No batches yet. Create your first batch to get started!
        </div>
      )}
    </div>
  );
}

