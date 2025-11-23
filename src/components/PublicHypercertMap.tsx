import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getAllTreesWithFarms } from '../services/treeService';
import type { Tree } from '../lib/supabase';
import { useEvmAddress, useIsSignedIn } from '@coinbase/cdp-hooks';

// Get access token from environment variables
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || import.meta.env.MAPBOX_API_KEY || '';

interface TreeWithFarm extends Tree {
  farm_name?: string;
}

interface AvailableHypercert {
  id: string;
  farmName: string;
  farmId: string;
  location: { lat: number; lng: number };
  price: string; // in ETH
  description: string;
  workTimeframe?: { start: string; end: string };
  workScope?: string[];
  impactScope?: string[];
  trees: number;
  area: number;
}

interface PurchasedHypercert extends AvailableHypercert {
  buyerAddress: string;
  purchasedAt: string;
  txHash: string;
}

// Generate available hypercerts from farms/trees
function generateAvailableHypercerts(trees: TreeWithFarm[]): AvailableHypercert[] {
  // Group trees by farm
  const farmsMap = new Map<string, { trees: TreeWithFarm[]; name: string }>();
  
  trees.forEach(tree => {
    const farmId = tree.farm_id;
    if (!farmsMap.has(farmId)) {
      farmsMap.set(farmId, { trees: [], name: tree.farm_name || 'Unknown Farm' });
    }
    farmsMap.get(farmId)!.trees.push(tree);
  });

  // Create hypercerts from farms
  const hypercerts: AvailableHypercert[] = [];
  let index = 1;
  
      farmsMap.forEach((farmData, farmId) => {
    if (farmData.trees.length > 0) {
      const avgLat = farmData.trees.reduce((sum, t) => sum + t.location.lat, 0) / farmData.trees.length;
      const avgLng = farmData.trees.reduce((sum, t) => sum + t.location.lng, 0) / farmData.trees.length;
      
      hypercerts.push({
        id: `hypercert-${farmId}`,
        farmName: farmData.name,
        farmId,
        location: { lat: avgLat, lng: avgLng },
        price: (0.01 + Math.random() * 0.09).toFixed(4), // Random price between 0.01 and 0.1 ETH
        description: `Sustainable coffee production from ${farmData.name}. This hypercert represents ${farmData.trees.length} coffee trees.`,
        workTimeframe: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        workScope: ['Specialty coffee', 'Data', 'Trazability'],
        impactScope: ['All'],
        trees: farmData.trees.length,
        area: farmData.trees.length * 0.02 // Estimate ~0.02 hectares per tree
      });
      index++;
    }
  });

  return hypercerts;
}

// Load purchased hypercerts from localStorage
function loadPurchasedHypercerts(): PurchasedHypercert[] {
  try {
    const stored = localStorage.getItem('purchasedHypercerts');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save purchased hypercert to localStorage
function savePurchasedHypercert(purchase: PurchasedHypercert) {
  try {
    const purchased = loadPurchasedHypercerts();
    purchased.push(purchase);
    localStorage.setItem('purchasedHypercerts', JSON.stringify(purchased));
  } catch (error) {
    console.error('Error saving purchase:', error);
  }
}

export function PublicHypercertMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeWithFarm | null>(null);
  const [trees, setTrees] = useState<TreeWithFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  
  const { evmAddress } = useEvmAddress();
  const { isSignedIn } = useIsSignedIn();
  
  // Generate available hypercerts from trees
  const availableHypercerts = useMemo(() => generateAvailableHypercerts(trees), [trees]);
  
  // Load purchased hypercerts
  const [purchasedHypercerts, setPurchasedHypercerts] = useState<PurchasedHypercert[]>(() => loadPurchasedHypercerts());
  
  // Combine available and purchased, mark which are purchased
  const allHypercerts = useMemo(() => {
    const purchasedIds = new Set(purchasedHypercerts.map(p => p.id));
    return availableHypercerts.map(h => ({
      ...h,
      isPurchased: purchasedIds.has(h.id),
      purchase: purchasedHypercerts.find(p => p.id === h.id)
    }));
  }, [availableHypercerts, purchasedHypercerts]);

  // Fetch trees from database
  useEffect(() => {
    async function fetchTrees() {
      try {
        setLoading(true);
        const treesData = await getAllTreesWithFarms();
        setTrees(treesData);
      } catch (error) {
        console.error('Error fetching trees:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrees();
  }, []);

  // Initialize map and add markers
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_ACCESS_TOKEN) {
      console.error('Mapbox token not configured');
      return;
    }

    if (loading) return; // Wait for trees to load

    // Initialize map with globe projection
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: MAPBOX_ACCESS_TOKEN,
      style: 'mapbox://styles/mapbox/standard',
      projection: 'globe', // Enable globe view
      center: [-74.5, 10], // Center on Central/South America
      zoom: 2.5,
      pitch: 0,
      bearing: 0
    });

    const currentMap = map.current;
    if (!currentMap) return;

    currentMap.on('load', () => {
      // Set atmosphere for globe view
      if (currentMap) currentMap.setFog({});

      // Calculate center from trees if available
      if (trees.length > 0 && currentMap) {
        const avgLat = trees.reduce((sum, tree) => sum + tree.location.lat, 0) / trees.length;
        const avgLng = trees.reduce((sum, tree) => sum + tree.location.lng, 0) / trees.length;
        currentMap.setCenter([avgLng, avgLat]);
        
        // Adjust zoom based on tree spread
        if (trees.length === 1) {
          currentMap.setZoom(10);
        } else if (trees.length < 10) {
          currentMap.setZoom(6);
        } else {
          currentMap.setZoom(3);
        }
      }

      // Add markers for each tree
      trees.forEach((tree) => {
        if (!currentMap) return;
        
        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'hypercert-map-marker';
        markerEl.style.width = '20px';
        markerEl.style.height = '20px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#8B6F47';
        markerEl.style.border = '2px solid white';
        markerEl.style.cursor = 'pointer';
        markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        markerEl.style.transition = 'transform 0.2s';
        
        markerEl.addEventListener('mouseenter', () => {
          markerEl.style.transform = 'scale(1.3)';
        });
        markerEl.addEventListener('mouseleave', () => {
          markerEl.style.transform = 'scale(1)';
        });

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: true })
          .setHTML(`
            <div style="padding: 0.5rem;">
              <strong style="font-size: 0.9rem; color: #333;">${tree.farm_name || 'Unknown Farm'}</strong>
              <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #666;">${tree.variety || 'Coffee tree'}</p>
            </div>
          `);

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([tree.location.lng, tree.location.lat])
          .setPopup(popup)
          .addTo(currentMap);

        // Add click handler
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedTree(tree);
        });

        markers.current.push(marker);
      });
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [loading, trees]);

  const closeModal = () => {
    setSelectedTree(null);
  };

  const handleBuyHypercert = async (hypercert: AvailableHypercert) => {
    if (!isSignedIn || !evmAddress) {
      alert('Please connect your wallet to purchase hypercerts.');
      return;
    }

    setPurchasingId(hypercert.id);
    
    // Simulate purchase transaction
    setTimeout(() => {
      const purchase: PurchasedHypercert = {
        ...hypercert,
        buyerAddress: evmAddress,
        purchasedAt: new Date().toISOString(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}` // Simulated transaction hash
      };
      
      savePurchasedHypercert(purchase);
      setPurchasedHypercerts(prev => [...prev, purchase]);
      setPurchasingId(null);
      
      alert(`Successfully purchased hypercert for ${hypercert.farmName}! Transaction: ${purchase.txHash.slice(0, 10)}...`);
    }, 2000); // Simulate 2 second transaction
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#ef4444',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Mapbox token not configured. Please set VITE_MAPBOX_API_KEY in your environment variables.
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Menu */}
      <div 
        style={{
          position: 'fixed',
          left: sidebarOpen ? 0 : '-400px',
          top: '80px', // Account for navigation header
          bottom: 0,
          width: '400px',
          backgroundColor: '#ffffff',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          transition: 'left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fafafa'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#333', fontFamily: 'Playfair Display, serif' }}>
            Buy Hypercerts
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.25rem 0.5rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Wallet Status */}
        {isSignedIn && evmAddress && (
          <div style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f0f9ff',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            fontSize: '0.875rem'
          }}>
            <div style={{ color: '#0369a1', fontWeight: 600, marginBottom: '0.25rem' }}>
              Connected Wallet
            </div>
            <div style={{ color: '#666', fontFamily: 'monospace' }}>
              {formatAddress(evmAddress)}
            </div>
          </div>
        )}

        {/* Sidebar Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>
          {!isSignedIn && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#9a3412'
            }}>
              Connect your wallet to purchase hypercerts
            </div>
          )}

          {allHypercerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No hypercerts available
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {allHypercerts.map((hypercert) => (
                <div
                  key={hypercert.id}
                  style={{
                    border: `1px solid ${hypercert.isPurchased ? 'rgba(34, 197, 94, 0.3)' : 'rgba(0,0,0,0.08)'}`,
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    backgroundColor: hypercert.isPurchased ? '#f0fdf4' : '#ffffff',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#333', fontWeight: 600 }}>
                      {hypercert.farmName}
                    </h3>
                    {hypercert.isPurchased && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#22c55e',
                        color: '#fff'
                      }}>
                        Purchased
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
                    {hypercert.description}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#666' }}>
                    <div>
                      <strong>Trees:</strong> {hypercert.trees}
                    </div>
                    <div>
                      <strong>Area:</strong> {hypercert.area.toFixed(2)} ha
                    </div>
                  </div>

                  {hypercert.isPurchased && hypercert.purchase && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '0.5rem',
                      marginBottom: '0.75rem',
                      fontSize: '0.75rem',
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                      <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: '0.25rem' }}>
                        ✓ Purchased by {formatAddress(hypercert.purchase.buyerAddress)}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.7rem' }}>
                        {new Date(hypercert.purchase.purchasedAt).toLocaleString()}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.7rem', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                        TX: {hypercert.purchase.txHash.slice(0, 16)}...
                      </div>
                    </div>
                  )}

                  {!hypercert.isPurchased && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#333' }}>
                        {hypercert.price} ETH
                      </div>
                      <button
                        onClick={() => handleBuyHypercert(hypercert)}
                        disabled={!isSignedIn || purchasingId === hypercert.id}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: isSignedIn ? '#8B6F47' : '#ccc',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '2rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: isSignedIn ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s',
                          opacity: purchasingId === hypercert.id ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (isSignedIn && purchasingId !== hypercert.id) {
                            e.currentTarget.style.backgroundColor = '#6F5B3A';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isSignedIn && purchasingId !== hypercert.id) {
                            e.currentTarget.style.backgroundColor = '#8B6F47';
                          }
                        }}
                      >
                        {purchasingId === hypercert.id ? 'Processing...' : 'Buy Now'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 999,
            padding: '0.75rem 1rem',
            backgroundColor: '#8B6F47',
            color: '#fff',
            border: 'none',
            borderRadius: '0 0.5rem 0.5rem 0',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
          </svg>
          Buy Hypercerts
        </button>
      )}

      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100vh',
          position: 'relative',
          marginLeft: sidebarOpen ? '400px' : 0,
          transition: 'margin-left 0.3s ease'
        }} 
      />
      
      {/* Tree Details Modal */}
      {selectedTree && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '2rem'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#333', fontFamily: 'Playfair Display, serif' }}>
                {selectedTree.farm_name || 'Unknown Farm'}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0.25rem 0.5rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                backgroundColor: selectedTree.status === 'active' ? '#f0f9ff' : '#f5f5f5',
                color: selectedTree.status === 'active' ? '#0369a1' : '#666',
                border: `1px solid ${selectedTree.status === 'active' ? 'rgba(3, 105, 161, 0.2)' : 'rgba(139, 111, 71, 0.15)'}`
              }}>
                {selectedTree.status}
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              {selectedTree.tree_number && (
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#333' }}>Tree Number:</strong> {selectedTree.tree_number}
                </div>
              )}
              {selectedTree.variety && (
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#333' }}>Variety:</strong> {selectedTree.variety}
                </div>
              )}
              {selectedTree.planting_date && (
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#333' }}>Planting Date:</strong> {new Date(selectedTree.planting_date).toLocaleDateString()}
                </div>
              )}
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
                <strong style={{ color: '#333' }}>Location:</strong> {selectedTree.location.lat.toFixed(6)}, {selectedTree.location.lng.toFixed(6)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
                <strong style={{ color: '#333' }}>Created:</strong> {new Date(selectedTree.created_at).toLocaleDateString()}
              </div>
            </div>

            {selectedTree.metadata && Object.keys(selectedTree.metadata).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>
                  Additional Information
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  {JSON.stringify(selectedTree.metadata, null, 2)}
                </div>
              </div>
            )}

            {/* Buy Hypercert Section */}
            <div style={{ 
              marginTop: '1.5rem', 
              paddingTop: '1.5rem', 
              borderTop: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ 
                padding: '0.75rem 1rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '0.5rem',
                border: '1px solid rgba(3, 105, 161, 0.2)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                  Available Hypercert
                </div>
                <div style={{ fontSize: '0.875rem', color: '#333' }}>
                  Support sustainable coffee production from this farm
                </div>
              </div>
              <button
                onClick={() => {
                  // TODO: Implement buy hypercert functionality
                  // This could open a purchase flow, redirect to marketplace, or initiate a transaction
                  alert('Buy Hypercert functionality coming soon! This will allow you to purchase fractions of the hypercert representing this farm\'s coffee production.');
                }}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  backgroundColor: '#8B6F47',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#6F5B3A';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 111, 71, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#8B6F47';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
                Buy Hypercert
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '1.5rem 2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Loading trees...</div>
        </div>
      )}

      {!loading && trees.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '1.5rem 2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>No trees found</div>
          <div style={{ fontSize: '0.75rem', color: '#999' }}>Trees will appear here once they are added to farms</div>
        </div>
      )}
    </>
  );
}

