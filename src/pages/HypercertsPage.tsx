import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { getFarmsByFarmer } from '../services/farmService';
import { getBatchesByFarm, isBatchReadyForHypercert, getBatchPhotos } from '../services/farmProcessService';
import { mintBatchHypercert } from '../services/hypercertService';
import type { Farm, ProcessBatch } from '../lib/supabase';

interface BatchWithFarm extends ProcessBatch {
  farm: Farm;
  readyForHypercert?: { ready: boolean; reason?: string };
}

interface MintedHypercert {
  claimId: string;
  txHash?: string;
  mintedAt: string;
  workTimeframe?: { start: string; end: string };
  workScope?: string[];
  impactScope?: string[];
}

// Demo hypercerts data - these appear as if already minted
const DEMO_HYPERCERTS: Array<{
  batch_id: string;
  farm_id: string;
  farm_name: string;
  hypercert: MintedHypercert;
  created_at: string;
}> = [
  {
    batch_id: 'demo-batch-001',
    farm_id: 'demo-farm-001',
    farm_name: 'Finca La Esperanza',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    hypercert: {
      claimId: '0x1234567890abcdef1234567890abcdef12345678',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      mintedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      workTimeframe: {
        start: '2024-01-15',
        end: '2024-03-20'
      },
      workScope: ['Specialty coffee', 'Data', 'Trazability'],
      impactScope: ['All']
    }
  },
  {
    batch_id: 'demo-batch-002',
    farm_id: 'demo-farm-002',
    farm_name: 'Cafetal del Valle',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    hypercert: {
      claimId: '0x9876543210fedcba9876543210fedcba98765432',
      txHash: '0xfedcba0987654321fedcba0987654321fedcba09',
      mintedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
      workTimeframe: {
        start: '2023-11-01',
        end: '2024-01-10'
      },
      workScope: ['Specialty coffee', 'Data', 'Trazability'],
      impactScope: ['All']
    }
  },
  {
    batch_id: 'demo-batch-003',
    farm_id: 'demo-farm-003',
    farm_name: 'Montaña Verde',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    hypercert: {
      claimId: '0x5555555555555555555555555555555555555555',
      txHash: '0x6666666666666666666666666666666666666666',
      mintedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      workTimeframe: {
        start: '2023-09-15',
        end: '2023-11-30'
      },
      workScope: ['Specialty coffee', 'Data', 'Trazability'],
      impactScope: ['All']
    }
  }
];

function HypercertsPageContent() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<BatchWithFarm[]>([]);
  const [mintingBatchId, setMintingBatchId] = useState<string | null>(null);
  
  // Initialize minted hypercerts with demo data
  const [mintedHypercerts, setMintedHypercerts] = useState<Map<string, MintedHypercert>>(() => {
    const demoMap = new Map<string, MintedHypercert>();
    DEMO_HYPERCERTS.forEach(demo => {
      demoMap.set(demo.batch_id, demo.hypercert);
    });
    return demoMap;
  });

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
      alert(`Batch is not ready: ${batch.readyForHypercert?.reason || 'Unknown reason'}`);
      return;
    }

    setMintingBatchId(batch.batch_id);
    try {
      const result = await mintBatchHypercert(batch, batch.farm);
      
      if (result.success && result.claimId) {
        // Get work timeframe from batch photos
        const photos = await getBatchPhotos(batch.farm.id, batch.batch_id);
        const photoDates = photos
          .map(p => new Date(p.taken_at).getTime())
          .filter(d => !isNaN(d))
          .sort((a, b) => a - b);
        
        const workTimeframe = photoDates.length > 0 ? {
          start: new Date(photoDates[0]).toISOString().split('T')[0],
          end: new Date(photoDates[photoDates.length - 1]).toISOString().split('T')[0]
        } : undefined;

        // Store the minted hypercert
        setMintedHypercerts(prev => new Map(prev.set(batch.batch_id, {
          claimId: result.claimId!,
          txHash: result.claimId, // The claimId is actually the tx hash
          mintedAt: new Date().toISOString(),
          workTimeframe,
          workScope: ['Specialty coffee', 'Data', 'Trazability'],
          impactScope: ['All']
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

  // Combine real batches with demo hypercerts
  const demoBatches: BatchWithFarm[] = DEMO_HYPERCERTS.map(demo => ({
    batch_id: demo.batch_id,
    farm_id: demo.farm_id,
    created_at: demo.created_at,
    steps: [], // Demo batches don't have steps
    farm: {
      id: demo.farm_id,
      farmer_id: user?.id || '',
      name: demo.farm_name,
      boundaries: [],
      area_hectares: null,
      metadata: {},
      created_at: demo.created_at,
      updated_at: demo.created_at,
    },
    readyForHypercert: { ready: true }
  }));

  const allBatchesWithDemos = [...batches, ...demoBatches];
  
  const readyBatches = allBatchesWithDemos.filter(b => 
    b.readyForHypercert?.ready && 
    !mintedHypercerts.has(b.batch_id) &&
    !DEMO_HYPERCERTS.some(d => d.batch_id === b.batch_id)
  );
  const mintedBatches = allBatchesWithDemos.filter(b => mintedHypercerts.has(b.batch_id));
  const notReadyBatches = allBatchesWithDemos.filter(b => 
    !b.readyForHypercert?.ready && 
    !mintedHypercerts.has(b.batch_id) &&
    !DEMO_HYPERCERTS.some(d => d.batch_id === b.batch_id)
  );

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
              const isDemo = DEMO_HYPERCERTS.some(d => d.batch_id === batch.batch_id);
              
              return (
                <div key={batch.batch_id} className="hypercert-card hypercert-card--minted">
                  {/* Visual Header Section */}
                  <div className="hypercert-visual-header">
                    <div className="hypercert-visual-bg">
                      <div className="hypercert-visual-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                        </svg>
                      </div>
                      <div className="hypercert-visual-globe"></div>
                    </div>
                    <div className="hypercert-visual-title">
                      <h3 className="hypercert-visual-name">
                        {batch.farm.name}
                      </h3>
                      <p className="hypercert-visual-subtitle">
                        Batch {batch.batch_id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="hypercert-content-section">
                    <div className="hypercert-content-header">
                      <h4 className="hypercert-content-title">
                        Specialty Coffee Production
                      </h4>
                      <span className="hypercert-badge hypercert-badge--minted">Minted</span>
                    </div>

                    {/* Work Timeline */}
                    {hypercert?.workTimeframe && (
                      <div className="hypercert-timeline">
                        <div className="hypercert-timeline-label">WORK</div>
                        <div className="hypercert-timeline-dates">
                          {new Date(hypercert.workTimeframe.start).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })} → {new Date(hypercert.workTimeframe.end).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    <div className="hypercert-tags">
                      {hypercert?.workScope?.map((scope, idx) => (
                        <span key={idx} className="hypercert-tag">{scope}</span>
                      ))}
                      {hypercert?.impactScope?.map((scope, idx) => (
                        <span key={idx} className="hypercert-tag hypercert-tag--impact">{scope}</span>
                      ))}
                    </div>

                    {/* Metadata */}
                    <div className="hypercert-metadata">
                      <div className="hypercert-meta-item">
                        <span className="hypercert-meta-label">Minted:</span>
                        <span className="hypercert-meta-value">
                          {hypercert?.mintedAt 
                            ? new Date(hypercert.mintedAt).toLocaleDateString()
                            : 'Recently'}
                        </span>
                      </div>
                      {!isDemo && (
                        <p className="hypercert-farm-link">
                          <Link to={`/app/farms/${batch.farm.id}`}>
                            View Farm: {batch.farm.name}
                          </Link>
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="hypercert-card-footer">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${hypercert?.claimId || hypercert?.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button--secondary"
                      >
                        View on Etherscan
                      </a>
                    </div>
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

