import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Farm, Tree } from '../lib/supabase';
import type { Feature, Polygon } from 'geojson';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY || import.meta.env.MAPBOX_API_KEY || '';

export interface FarmMapProps {
  farm?: Farm;
  farms?: Farm[]; // For displaying multiple farms
  trees?: Tree[];
  mode?: 'view' | 'draw';
  onPolygonsChange?: (polygons: Polygon[]) => void;
  onTreeClick?: (treeId: string) => void;
  onMapClick?: (location: { lat: number; lng: number }) => void;
  selectedLocation?: { lat: number; lng: number }; // For showing selected location marker
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
}

/**
 * Calculate area of a polygon in hectares
 * Uses spherical geometry for accurate calculation
 */
function calculatePolygonArea(polygon: Polygon): number {
  const coordinates = polygon.coordinates[0]; // Outer ring
  if (coordinates.length < 3) return 0;

  let area = 0;
  const R = 6371000; // Earth radius in meters

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[i + 1];
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
  }

  area = Math.abs(area * R * R / 2);
  return area / 10000; // Convert to hectares
}

export function FarmMap({
  farm,
  farms = [],
  trees = [],
  mode = 'view',
  onPolygonsChange,
  onTreeClick,
  onMapClick,
  selectedLocation,
  initialCenter,
  initialZoom = 10
}: FarmMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const selectedMarker = useRef<mapboxgl.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxgl.accessToken) {
      console.error('Mapbox token not configured');
      return;
    }

    // Determine initial center
    let center: [number, number] = [-74.5, 40]; // Default
    if (initialCenter) {
      center = [initialCenter.lng, initialCenter.lat];
    } else if (farm?.boundaries && farm.boundaries.length > 0) {
      // Use center of first polygon
      const firstPolygon = farm.boundaries[0];
      const coords = firstPolygon.coordinates[0];
      const sum = coords.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), { lng: 0, lat: 0 });
      center = [sum.lng / coords.length, sum.lat / coords.length];
    } else if (farms.length > 0 && farms[0].boundaries && farms[0].boundaries.length > 0) {
      // Use center of first farm's first polygon
      const firstPolygon = farms[0].boundaries[0];
      const coords = firstPolygon.coordinates[0];
      const sum = coords.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), { lng: 0, lat: 0 });
      center = [sum.lng / coords.length, sum.lat / coords.length];
    } else if (trees.length > 0) {
      center = [trees[0].location.lng, trees[0].location.lat];
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: center,
      zoom: initialZoom || 10
    });

    // Initialize Draw for polygon drawing
    if (mode === 'draw') {
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true
        },
        defaultMode: 'draw_polygon'
      });
      map.current.addControl(draw.current);
    }

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    // Handle draw events
    if (mode === 'draw' && draw.current) {
      const handleDrawUpdate = () => {
        const features = draw.current?.getAll();
        if (features && onPolygonsChange) {
          const polygons: Polygon[] = [];
          features.features.forEach((feature: Feature) => {
            if (feature.geometry.type === 'Polygon') {
              polygons.push(feature.geometry);
            } else if (feature.geometry.type === 'MultiPolygon') {
              // Split MultiPolygon into individual polygons
              feature.geometry.coordinates.forEach(ring => {
                polygons.push({
                  type: 'Polygon',
                  coordinates: ring
                });
              });
            }
          });
          onPolygonsChange(polygons);
        }
      };

      map.current.on('draw.create', handleDrawUpdate);
      map.current.on('draw.update', handleDrawUpdate);
      map.current.on('draw.delete', handleDrawUpdate);
    }

    // Add click handler for location selection (when in view mode with onMapClick)
    if (mode === 'view' && onMapClick) {
      map.current.on('click', (e: mapboxgl.MapMouseEvent) => {
        // Only trigger if clicking directly on the map canvas, not on markers/controls/popups
        const target = e.originalEvent.target as HTMLElement;
        
        // Skip if clicking on markers, controls, or popups
        if (target.closest('.mapboxgl-marker') || 
            target.closest('.mapboxgl-ctrl') || 
            target.closest('.mapboxgl-popup')) {
          return;
        }
        
        // Only proceed if clicking on the canvas itself
        if (target.classList.contains('mapboxgl-canvas') || target.closest('.mapboxgl-canvas-container')) {
          const location = {
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          };
          onMapClick(location);
          
          // Show temporary marker for selected location
          if (selectedMarker.current) {
            selectedMarker.current.remove();
          }
          
          const markerEl = document.createElement('div');
          markerEl.className = 'selected-location-marker';
          markerEl.style.width = '24px';
          markerEl.style.height = '24px';
          markerEl.style.borderRadius = '50%';
          markerEl.style.backgroundColor = '#3b82f6';
          markerEl.style.border = '3px solid white';
          markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
          markerEl.style.cursor = 'pointer';
          
          selectedMarker.current = new mapboxgl.Marker(markerEl)
            .setLngLat([location.lng, location.lat])
            .addTo(map.current!);
        }
      });
    }

    return () => {
      if (selectedMarker.current) {
        selectedMarker.current.remove();
        selectedMarker.current = null;
      }
      if (draw.current && map.current) {
        map.current.removeControl(draw.current);
      }
      map.current?.remove();
    };
  }, [mode]);

  // Update selected location marker
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove existing selected marker
    if (selectedMarker.current) {
      selectedMarker.current.remove();
      selectedMarker.current = null;
    }

    // Add marker for selected location if provided
    if (selectedLocation && mode === 'view') {
      const markerEl = document.createElement('div');
      markerEl.className = 'selected-location-marker';
      markerEl.style.width = '24px';
      markerEl.style.height = '24px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = '#3b82f6';
      markerEl.style.border = '3px solid white';
      markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      markerEl.style.cursor = 'pointer';

      selectedMarker.current = new mapboxgl.Marker(markerEl)
        .setLngLat([selectedLocation.lng, selectedLocation.lat])
        .addTo(map.current);
    }
  }, [selectedLocation, isMapLoaded, mode]);

  // Update map with farm boundaries and trees
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add farm boundaries (single farm or multiple farms)
    const farmsToDisplay = farm ? [farm] : farms;
    if (farmsToDisplay.length > 0 && mode === 'view') {
      farmsToDisplay.forEach((displayFarm, farmIndex) => {
        if (displayFarm.boundaries && displayFarm.boundaries.length > 0) {
          displayFarm.boundaries.forEach((polygon, index) => {
            const sourceId = `farm-boundary-${farmIndex}-${index}`;
            const layerId = `farm-boundary-layer-${farmIndex}-${index}`;

            // Remove existing source/layer if they exist
            if (map.current!.getSource(sourceId)) {
              map.current!.removeLayer(`${layerId}-outline`);
              map.current!.removeLayer(layerId);
              map.current!.removeSource(sourceId);
            }

            map.current!.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: polygon,
                properties: { name: displayFarm.name }
              }
            });

            map.current!.addLayer({
              id: layerId,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': '#8B6F47',
                'fill-opacity': 0.3
              }
            });

            map.current!.addLayer({
              id: `${layerId}-outline`,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#8B6F47',
                'line-width': 2
              }
            });
          });
        }
      });

      // Fit bounds to show all polygons from all farms
      const bounds = new mapboxgl.LngLatBounds();
      farmsToDisplay.forEach(displayFarm => {
        if (displayFarm.boundaries) {
          displayFarm.boundaries.forEach(polygon => {
            polygon.coordinates[0].forEach(([lng, lat]) => {
              // Validate coordinates before adding to bounds
              if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
                bounds.extend([lng, lat]);
              }
            });
          });
        }
      });
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 });
      }
    }

    // Add tree markers
    trees.forEach(tree => {
      // Validate location coordinates
      if (!tree.location) {
        console.warn('Tree has no location:', tree.id);
        return;
      }

      // Debug: log the location to see what format we're getting
      console.log('Tree location data:', tree.id, tree.location, typeof tree.location);

      // Check if location is still a string (not parsed)
      let location: { lat: number; lng: number } | null = null;
      const locationValue = tree.location as string | { lat: number; lng: number };
      if (typeof locationValue === 'string') {
        // Try to parse it
        const match = locationValue.match(/\(([^,]+),([^)]+)\)/);
        if (match) {
          location = {
            lng: parseFloat(match[1].trim()),
            lat: parseFloat(match[2].trim())
          };
        } else {
          console.warn('Could not parse location string:', locationValue);
          return;
        }
      } else if (typeof locationValue === 'object' && locationValue !== null && 'lat' in locationValue && 'lng' in locationValue) {
        location = locationValue as { lat: number; lng: number };
      } else {
        console.warn('Invalid location format:', locationValue);
        return;
      }
      
      if (!location) {
        return;
      }

      // Final validation
      if (typeof location.lng !== 'number' || 
          typeof location.lat !== 'number' ||
          isNaN(location.lng) || 
          isNaN(location.lat)) {
        console.warn('Invalid tree location coordinates, skipping marker:', tree.id, location);
        return;
      }

      const treeEl = document.createElement('div');
      treeEl.className = 'tree-marker';
      treeEl.style.width = '20px';
      treeEl.style.height = '20px';
      treeEl.style.borderRadius = '50%';
      treeEl.style.backgroundColor = tree.status === 'active' ? '#22c55e' : '#ef4444';
      treeEl.style.border = '2px solid white';
      treeEl.style.cursor = 'pointer';
      treeEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      const popupContent = `
        <div style="padding: 8px;">
          <strong>Tree ${tree.tree_number || tree.id.slice(0, 8)}</strong>
          ${tree.variety ? `<br/>Variety: ${tree.variety}` : ''}
          <br/>Status: ${tree.status}
        </div>
      `;

      const treeMarker = new mapboxgl.Marker(treeEl)
        .setLngLat([location.lng, location.lat])
        .setPopup(new mapboxgl.Popup().setHTML(popupContent))
        .addTo(map.current!);

      if (onTreeClick) {
        treeEl.addEventListener('click', () => onTreeClick(tree.id));
      }

      markers.current.push(treeMarker);
    });

      // Fit bounds to show all trees if no farm boundaries
      const hasBoundaries = (farm?.boundaries && farm.boundaries.length > 0) || 
                          (farms.length > 0 && farms.some(f => f.boundaries && f.boundaries.length > 0));
      if (!hasBoundaries && trees.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        trees.forEach(tree => {
          if (!tree.location) return;
          
          // Parse location if it's a string
          let location: { lat: number; lng: number } | null = null;
          const locationValue = tree.location as string | { lat: number; lng: number };
          if (typeof locationValue === 'string') {
            const match = locationValue.match(/\(([^,]+),([^)]+)\)/);
            if (match) {
              location = {
                lng: parseFloat(match[1].trim()),
                lat: parseFloat(match[2].trim())
              };
            } else {
              return;
            }
          } else if (typeof locationValue === 'object' && locationValue !== null && 'lat' in locationValue && 'lng' in locationValue) {
            location = locationValue as { lat: number; lng: number };
          } else {
            return;
          }
          
          if (!location) {
            return;
          }

          // Validate coordinates before adding to bounds
          if (typeof location.lng === 'number' && 
              typeof location.lat === 'number' &&
              !isNaN(location.lng) && 
              !isNaN(location.lat)) {
            bounds.extend([location.lng, location.lat]);
          }
        });
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 18 });
        }
      }
  }, [farm, farms, trees, isMapLoaded, onTreeClick, mode]);

  if (!mapboxgl.accessToken) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
        Mapbox token not configured. Please set VITE_MAPBOX_API_KEY in your environment variables.
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }} 
    />
  );
}

// Export helper function for area calculation
export { calculatePolygonArea };
