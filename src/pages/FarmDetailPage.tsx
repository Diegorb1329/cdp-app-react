import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { FarmMap } from '../components/FarmMap';
import { TreeForm } from '../components/TreeForm';
import { PhotoUpload } from '../components/PhotoUpload';
import { getFarmById } from '../services/farmService';
import { getTreesByFarm } from '../services/treeService';
import type { Farm, Tree } from '../lib/supabase';

function FarmDetailPageContent() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const [farm, setFarm] = useState<(Farm & { trees?: Tree[] }) | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTreeForm, setShowTreeForm] = useState(false);
  const [selectedTreeForPhoto, setSelectedTreeForPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (farmId) {
      loadFarmData();
    }
  }, [farmId]);

  const loadFarmData = async () => {
    if (!farmId) return;
    
    setLoading(true);
    const farmData = await getFarmById(farmId);
    if (farmData) {
      setFarm(farmData);
      setTrees(farmData.trees || []);
    }
    setLoading(false);
  };

  const handleTreeCreated = async () => {
    if (farmId) {
      const updatedTrees = await getTreesByFarm(farmId);
      setTrees(updatedTrees);
      setShowTreeForm(false);
    }
  };

  const handlePhotoUploaded = () => {
    setSelectedTreeForPhoto(null);
    // Optionally reload tree data to show new photo count
  };

  if (loading) {
    return (
      <div className="page-content">
        <p>Loading farm...</p>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="page-content">
        <p>Farm not found</p>
        <button onClick={() => navigate('/app/farms')}>Back to Farms</button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/app/farms')}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#e5e5e5',
            color: '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back to Farms
        </button>
        <h1 className="page-title">{farm.name}</h1>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {farm.area_hectares && (
            <p className="page-description">Area: {farm.area_hectares.toFixed(2)} hectares</p>
          )}
          {farm.boundaries && farm.boundaries.length > 0 && (
            <p className="page-description">{farm.boundaries.length} polygon{farm.boundaries.length !== 1 ? 's' : ''}</p>
          )}
          <p className="page-description">Trees: {trees.length}</p>
        </div>
      </div>

      {/* Map view */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Farm Map</h2>
          <button
            onClick={() => setShowTreeForm(!showTreeForm)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: showTreeForm ? '#ccc' : '#8B6F47',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            {showTreeForm ? 'Cancel' : '+ Add Tree'}
          </button>
        </div>
        <div style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
          <FarmMap
            farm={farm}
            trees={trees}
            mode="view"
            onTreeClick={(treeId) => {
              // Could navigate to tree detail or show photo upload
              setSelectedTreeForPhoto(treeId);
            }}
          />
        </div>
      </div>

      {/* Tree form */}
      {showTreeForm && farmId && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <TreeForm
            farmId={farmId}
            farm={farm}
            onSuccess={handleTreeCreated}
            onCancel={() => {
              setShowTreeForm(false);
            }}
          />
        </div>
      )}

      {/* Photo upload modal */}
      {selectedTreeForPhoto && (
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
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Upload Photo for Tree</h2>
              <button
                onClick={() => setSelectedTreeForPhoto(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#e5e5e5',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
            <PhotoUpload
              treeId={selectedTreeForPhoto}
              onUploadComplete={handlePhotoUploaded}
              onError={(error) => {
                console.error('Photo upload error:', error);
                alert(`Upload failed: ${error.message}`);
              }}
            />
          </div>
        </div>
      )}

      {/* Trees list */}
      <div>
        <h2 style={{ marginBottom: '1rem' }}>Trees ({trees.length})</h2>
        {trees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>No trees yet. Click "Add Tree" to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {trees.map(tree => (
              <div
                key={tree.id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => setSelectedTreeForPhoto(tree.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    {tree.tree_number || `Tree ${tree.id.slice(0, 8)}`}
                  </h3>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    backgroundColor: tree.status === 'active' ? '#d1fae5' : '#fee2e2',
                    color: tree.status === 'active' ? '#065f46' : '#991b1b'
                  }}>
                    {tree.status}
                  </span>
                </div>
                {tree.variety && (
                  <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                    Variety: {tree.variety}
                  </p>
                )}
                {tree.planting_date && (
                  <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                    Planted: {new Date(tree.planting_date).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTreeForPhoto(tree.id);
                  }}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#8B6F47',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Upload Photo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FarmDetailPage() {
  return (
    <ProtectedRoute>
      <FarmDetailPageContent />
    </ProtectedRoute>
  );
}

export default FarmDetailPage;

