import { useState } from 'react';
import { createFarm } from '../services/farmService';
import { FarmMap, calculatePolygonArea } from './FarmMap';
import type { Polygon } from 'geojson';

export interface FarmFormProps {
  farmerId: string;
  onSuccess?: (farm: any) => void;
  onCancel?: () => void;
}

export function FarmForm({ farmerId, onSuccess, onCancel }: FarmFormProps) {
  const [name, setName] = useState('');
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePolygonsChange = (newPolygons: Polygon[]) => {
    setPolygons(newPolygons);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Farm name is required');
      return;
    }

    if (polygons.length === 0) {
      setError('Please draw at least one polygon to define your farm boundaries');
      return;
    }

    setIsSubmitting(true);

    try {
      const farm = await createFarm(farmerId, {
        name: name.trim(),
        boundaries: polygons,
        metadata: {}
      });

      if (farm) {
        onSuccess?.(farm);
        // Reset form
        setName('');
        setPolygons([]);
      } else {
        setError('Failed to create farm. Please try again.');
      }
    } catch (err) {
      console.error('Error creating farm:', err);
      setError('An error occurred while creating the farm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total area
  const totalArea = polygons.reduce((sum, polygon) => {
    return sum + calculatePolygonArea(polygon);
  }, 0);

  return (
    <div className="farm-form" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Create New Farm</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="farm-name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Farm Name *
          </label>
          <input
            id="farm-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            placeholder="Enter farm name"
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Draw Farm Boundaries * (draw one or more polygons on the map)
          </label>
          <div style={{ 
            marginBottom: '0.5rem', 
            padding: '0.75rem', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            <p style={{ margin: 0, marginBottom: '0.5rem' }}>
              <strong>Instructions:</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>Click the polygon tool in the map toolbar</li>
              <li>Click on the map to start drawing</li>
              <li>Click to add points, double-click to finish</li>
              <li>You can draw multiple polygons for different areas</li>
              <li>Use the trash tool to delete polygons</li>
            </ul>
          </div>
          {polygons.length > 0 && (
            <div style={{ 
              marginBottom: '0.5rem', 
              padding: '0.75rem', 
              backgroundColor: '#d1fae5', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              <p style={{ margin: 0, fontWeight: '500' }}>
                ✓ {polygons.length} polygon{polygons.length !== 1 ? 's' : ''} drawn
              </p>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                Total area: <strong>{totalArea.toFixed(2)} hectares</strong>
              </p>
            </div>
          )}
          <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <FarmMap
              mode="draw"
              onPolygonsChange={handlePolygonsChange}
            />
          </div>
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
            disabled={isSubmitting || !name.trim() || polygons.length === 0}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: (isSubmitting || !name.trim() || polygons.length === 0) ? '#ccc' : '#8B6F47',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: (isSubmitting || !name.trim() || polygons.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Farm'}
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
