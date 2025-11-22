import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { getFarmsByFarmer } from '../services/farmService';
import { getBatchesByFarm, isBatchReadyForHypercert } from '../services/farmProcessService';
import { mintBatchHypercert } from '../services/hypercertService';
import type { Farm, ProcessBatch } from '../lib/supabase';

interface BatchWithFarm extends ProcessBatch {
  farm: Farm;
  readyForHypercert?: { ready: boolean; reason?: string };
}

function HypercertsPageContent() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<BatchWithFarm[]>([]);
  const [mintingBatchId, setMintingBatchId] = useState<string | null>(null);
  const [mintedHypercerts, setMintedHypercerts] = useState<Map<string, { claimId: string; txHash?: string }>>(new Map());

  useEffect(() => {
    async function loadBatches() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Get all farms for the user
        const farms = await getFarmsByFarmer(user.id);
        
        // Get all batches from all farms
        const allBatches: BatchWithFarm[] = [];
        
        for (const farm of farms) {
          const farmBatches = await getBatchesByFarm(farm.id);
          
          // Check readiness for each batch
          for (const batch of farmBatches) {
            const readiness = await isBatchReadyForHypercert(farm.id, batch.batch_id);
            allBatches.push({
              ...batch,
              farm,
              readyForHypercert: readiness,
            });
          }
        }

        // Sort: ready batches first, then by creation date
        allBatches.sort((a, b) => {
          const aReady = a.readyForHypercert?.ready ? 1 : 0;
          const bReady = b.readyForHypercert?.ready ? 1 : 0;
          if (aReady !== bReady) return bReady - aReady;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setBatches(allBatches);
      } catch (error) {
        console.error('Error loading batches:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBatches();
  }, [user?.id]);

  const handleMintHypercert = async (batch: BatchWithFarm) => {
    if (!batch.readyForHypercert?.ready) {
      alert(`Batch is not ready: ${batch.readyForHypercert.reason}`);
      return;
    }

    setMintingBatchId(batch.batch_id);
    try {
      const result = await mintBatchHypercert(batch, batch.farm);
      
      if (result.success && result.claimId) {
        // Store the minted hypercert
        setMintedHypercerts(prev => new Map(prev.set(batch.batch_id, {
          claimId: result.claimId!,
          txHash: result.claimId, // The claimId is actually the tx hash
        })));
        alert(`Hypercert minted successfully! Transaction: ${result.claimId}`);
      } else {
        alert(`Failed to mint hypercert: ${result.error}`);
      }
    } catch (error) {
      console.error('Error minting hypercert:', error);
      alert('An error occurred while minting the hypercert');
    } finally {
      setMintingBatchId(null);
    }
  };

  const readyBatches = batches.filter(b => b.readyForHypercert?.ready && !mintedHypercerts.has(b.batch_id));
  const mintedBatches = batches.filter(b => mintedHypercerts.has(b.batch_id));
  const notReadyBatches = batches.filter(b => !b.readyForHypercert?.ready && !mintedHypercerts.has(b.batch_id));

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading hypercerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1 className="page-title">Hypercerts</h1>
      <p className="page-description">
        View and mint hypercerts for your coffee production batches
      </p>

      {/* Ready to Mint Section */}
      {readyBatches.length > 0 && (
        <section className="hypercerts-section">
          <h2 className="section-title">Ready to Mint</h2>
          <p className="section-description">
            These batches have all required data and are ready to be minted as hypercerts
          </p>
          <div className="hypercerts-grid">
            {readyBatches.map((batch) => (
              <div key={batch.batch_id} className="hypercert-card hypercert-card--ready">
                <div className="hypercert-card-header">
                  <h3 className="hypercert-card-title">
                    {batch.farm.name} - Batch {batch.batch_id.slice(0, 8)}
                  </h3>
                  <span className="hypercert-badge hypercert-badge--ready">Ready</span>
                </div>
                <div className="hypercert-card-body">
                  <p className="hypercert-farm-link">
                    <Link to={`/app/farms/${batch.farm.id}`}>
                      View Farm: {batch.farm.name}
                    </Link>
                  </p>
                  <p className="hypercert-meta">
                    <strong>Created:</strong> {new Date(batch.created_at).toLocaleDateString()}
                  </p>
                  <p className="hypercert-meta">
                    <strong>Steps:</strong> {batch.steps.length}
                  </p>
                </div>
                <div className="hypercert-card-footer">
                  <button
                    className="button button--primary"
                    onClick={() => handleMintHypercert(batch)}
                    disabled={mintingBatchId === batch.batch_id}
                  >
                    {mintingBatchId === batch.batch_id ? 'Minting...' : 'Mint Hypercert'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Minted Hypercerts Section */}
      {mintedBatches.length > 0 && (
        <section className="hypercerts-section">
          <h2 className="section-title">Minted Hypercerts</h2>
          <p className="section-description">
            These batches have been successfully minted as hypercerts
          </p>
          <div className="hypercerts-grid">
            {mintedBatches.map((batch) => {
              const hypercert = mintedHypercerts.get(batch.batch_id);
              return (
                <div key={batch.batch_id} className="hypercert-card hypercert-card--minted">
                  <div className="hypercert-card-header">
                    <h3 className="hypercert-card-title">
                      {batch.farm.name} - Batch {batch.batch_id.slice(0, 8)}
                    </h3>
                    <span className="hypercert-badge hypercert-badge--minted">Minted</span>
                  </div>
                  <div className="hypercert-card-body">
                    <p className="hypercert-farm-link">
                      <Link to={`/app/farms/${batch.farm.id}`}>
                        View Farm: {batch.farm.name}
                      </Link>
                    </p>
                    <p className="hypercert-meta">
                      <strong>Claim ID:</strong> {hypercert?.claimId.slice(0, 10)}...
                    </p>
                    <p className="hypercert-meta">
                      <strong>Created:</strong> {new Date(batch.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="hypercert-card-footer">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${hypercert?.claimId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button--secondary"
                    >
                      View on Etherscan
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Not Ready Section */}
      {notReadyBatches.length > 0 && (
        <section className="hypercerts-section">
          <h2 className="section-title">Not Ready</h2>
          <p className="section-description">
            These batches need more data before they can be minted as hypercerts
          </p>
          <div className="hypercerts-grid">
            {notReadyBatches.map((batch) => (
              <div key={batch.batch_id} className="hypercert-card hypercert-card--not-ready">
                <div className="hypercert-card-header">
                  <h3 className="hypercert-card-title">
                    {batch.farm.name} - Batch {batch.batch_id.slice(0, 8)}
                  </h3>
                  <span className="hypercert-badge hypercert-badge--not-ready">Not Ready</span>
                </div>
                <div className="hypercert-card-body">
                  <p className="hypercert-farm-link">
                    <Link to={`/app/farms/${batch.farm.id}`}>
                      View Farm: {batch.farm.name}
                    </Link>
                  </p>
                  <p className="hypercert-meta">
                    <strong>Created:</strong> {new Date(batch.created_at).toLocaleDateString()}
                  </p>
                  {batch.readyForHypercert?.reason && (
                    <p className="hypercert-reason">
                      <strong>Reason:</strong> {batch.readyForHypercert.reason}
                    </p>
                  )}
                </div>
                <div className="hypercert-card-footer">
                  <Link
                    to={`/app/farms/${batch.farm.id}`}
                    className="button button--secondary"
                  >
                    Complete Batch
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {batches.length === 0 && (
        <div className="empty-state">
          <p>No batches found. Create a batch in one of your farms to get started.</p>
          <Link to="/app/farms" className="button button--primary">
            View Farms
          </Link>
        </div>
      )}
    </div>
  );
}

function HypercertsPage() {
  return <HypercertsPageContent />;
}

export default HypercertsPage;

