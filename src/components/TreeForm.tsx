import { useState } from 'react';
import { createTree } from '../services/treeService';
import { FarmMap } from './FarmMap';
import type { Farm } from '../lib/supabase';

export interface TreeFormProps {
  farmId: string;
  farm?: Farm;
  onSuccess?: (tree: any) => void;
  onCancel?: () => void;
}

export function TreeForm({ farmId, farm, onSuccess, onCancel }: TreeFormProps) {
  const [variety, setVariety] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [status, setStatus] = useState<'active' | 'dormant' | 'removed'>('active');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMapClick = (loc: { lat: number; lng: number }) => {
    setLocation(loc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!location) {
      setError('Please click on the map to select the tree location');
      return;
    }

    setIsSubmitting(true);

    try {
      const tree = await createTree(farmId, {
        variety: variety.trim() || undefined,
        planting_date: plantingDate || undefined,
        status: status,
        metadata: {}
      }, location);

      if (tree) {
        onSuccess?.(tree);
        // Reset form
        setVariety('');
        setPlantingDate('');
        setStatus('active');
        setLocation(null);
      } else {
        setError('Failed to create tree. Please try again.');
      }
    } catch (err) {
      console.error('Error creating tree:', err);
      setError('An error occurred while creating the tree.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate center for map (use farm boundaries or default)
  const getMapCenter = () => {
    if (location) {
      return { lat: location.lat, lng: location.lng };
    }
    if (farm?.boundaries && farm.boundaries.length > 0) {
      const firstPolygon = farm.boundaries[0];
      const coords = firstPolygon.coordinates[0];
      const sum = coords.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), { lng: 0, lat: 0 });
      return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
    }
    return undefined;
  };

  return (
    <div className="tree-form" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Add New Tree</h2>
      <p style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        Click on the map to place the tree, then fill in the details below.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Map first - location selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Tree Location * (click on map to place tree)
          </label>
          {location && (
            <div style={{ 
              marginBottom: '0.5rem', 
              padding: '0.5rem', 
              backgroundColor: '#d1fae5', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              ✓ Location selected: Lat {location.lat.toFixed(6)}, Lng {location.lng.toFixed(6)}
            </div>
          )}
          <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <FarmMap
              farm={farm}
              trees={[]}
              mode="view"
              onMapClick={handleMapClick}
              selectedLocation={location || undefined}
              initialCenter={getMapCenter()}
              initialZoom={farm?.boundaries ? 15 : 10}
            />
          </div>
        </div>

        {/* Form fields */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="variety" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Variety
          </label>
          <input
            id="variety"
            type="text"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            placeholder="e.g., Arabica, Robusta, Typica"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="planting-date" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Planting Date
          </label>
          <input
            id="planting-date"
            type="date"
            value={plantingDate}
            onChange={(e) => setPlantingDate(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="status" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Status *
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'dormant' | 'removed')}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
            <option value="removed">Removed</option>
          </select>
        </div>

        {error && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={isSubmitting || !location}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: (isSubmitting || !location) ? '#ccc' : '#8B6F47',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: (isSubmitting || !location) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add Tree'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#e5e5e5',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
