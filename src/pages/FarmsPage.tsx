import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvmAddress } from '@coinbase/cdp-hooks';
import { useUser } from '../hooks/useUser';
import { getFarmsByFarmer } from '../services/farmService';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { FarmForm } from '../components/FarmForm';
import { FarmMap } from '../components/FarmMap';
import type { Farm } from '../lib/supabase';

function FarmsPageContent() {
  const { evmAddress } = useEvmAddress();
  const { user } = useUser();
  const navigate = useNavigate();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadFarms();
    }
  }, [user?.id]);

  const loadFarms = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const farmsData = await getFarmsByFarmer(user.id);
    setFarms(farmsData);
    setLoading(false);
  };

  const handleFarmCreated = (farm: Farm) => {
    setFarms([farm, ...farms]);
    setShowCreateForm(false);
  };

  const handleFarmClick = (farmId: string) => {
    navigate(`/app/farms/${farmId}`);
  };

  if (loading) {
    return (
      <div className="page-content">
        <p>Loading farms...</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">My Farms</h1>
          <p className="page-description">Manage your coffee farms and trees</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8B6F47',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Create New Farm'}
        </button>
      </div>

      {showCreateForm && user?.id && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <FarmForm
            farmerId={user.id}
            onSuccess={handleFarmCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {farms.length === 0 && !showCreateForm ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No farms yet</p>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Create your first farm to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#8B6F47',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Create Your First Farm
          </button>
        </div>
      ) : (
        <>
          {/* Map view */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>All Farms Map</h2>
            <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
              <FarmMap
                farms={farms}
                trees={[]}
                mode="view"
              />
            </div>
          </div>

          {/* Farms list */}
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Farms List</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {farms.map(farm => (
                <div
                  key={farm.id}
                  onClick={() => handleFarmClick(farm.id)}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{farm.name}</h3>
                  {farm.area_hectares && (
                    <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                      Area: {farm.area_hectares.toFixed(2)} ha
                    </p>
                  )}
                  {farm.boundaries && farm.boundaries.length > 0 && (
                    <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                      {farm.boundaries.length} polygon{farm.boundaries.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#999' }}>
                    Created: {new Date(farm.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FarmsPage() {
  return (
    <ProtectedRoute>
      <FarmsPageContent />
    </ProtectedRoute>
  );
}

export default FarmsPage;

