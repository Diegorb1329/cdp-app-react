import { supabase, type Farm } from '../lib/supabase';
import type { Polygon } from 'geojson';
import { calculatePolygonArea } from '../components/FarmMap';

export interface CreateFarmData {
  name: string;
  boundaries: Polygon[]; // Array of polygons
  metadata?: Record<string, any>;
}

/**
 * Calculate total area from multiple polygons
 */
function calculateTotalArea(polygons: Polygon[]): number {
  return polygons.reduce((total, polygon) => {
    return total + calculatePolygonArea(polygon);
  }, 0);
}

/**
 * Create a new farm
 */
export async function createFarm(
  farmerId: string,
  farmData: CreateFarmData
): Promise<Farm | null> {
  try {
    // Calculate area from polygons
    const totalArea = calculateTotalArea(farmData.boundaries);

    const { data, error } = await supabase
      .from('farms')
      .insert({
        farmer_id: farmerId,
        name: farmData.name,
        boundaries: farmData.boundaries, // Store as JSONB
        area_hectares: totalArea,
        metadata: farmData.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating farm:', error);
      return null;
    }

    return {
      ...data,
      boundaries: data.boundaries as Polygon[]
    } as Farm;
  } catch (error) {
    console.error('Error in createFarm:', error);
    return null;
  }
}

/**
 * Get farms by farmer ID
 */
export async function getFarmsByFarmer(farmerId: string): Promise<Farm[]> {
  try {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching farms:', error);
      return [];
    }

    return data.map(farm => ({
      ...farm,
      boundaries: farm.boundaries as Polygon[]
    })) as Farm[];
  } catch (error) {
    console.error('Error in getFarmsByFarmer:', error);
    return [];
  }
}

/**
 * Get farm by ID with trees included
 */
export async function getFarmById(farmId: string): Promise<Farm & { trees?: any[] } | null> {
  try {
    // First, get the farm
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

    if (farmError) {
      console.error('Error fetching farm:', farmError);
      return null;
    }

    if (!farmData) {
      return null;
    }

    // Then, get trees separately
    // Note: Supabase automatically converts POINT to string format "(-93.37,18.36)"
    const { data: treesData, error: treesError } = await supabase
      .from('trees')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false });

    if (treesError) {
      console.error('Error fetching trees:', treesError);
      // Return farm without trees if trees query fails
    }

    // Parse tree locations
    const parsedTrees = (treesData || []).map((tree: any) => {
      try {
        // Supabase returns location as string "(-93.37,18.36)" or as object
        const locationData = tree.location;
        const parsedLocation = parseLocation(locationData);
        
        // Validate parsed location
        if (isNaN(parsedLocation.lat) || isNaN(parsedLocation.lng)) {
          console.error('Invalid location parsed for tree:', tree.id, locationData, parsedLocation);
          return null;
        }
        
        return {
          ...tree,
          location: parsedLocation
        };
      } catch (error) {
        console.error('Error parsing tree location in getFarmById:', tree.id, error);
        return null;
      }
    }).filter((tree: any) => tree !== null);

    return {
      ...farmData,
      boundaries: farmData.boundaries as Polygon[],
      trees: parsedTrees
    } as Farm & { trees?: any[] };
  } catch (error) {
    console.error('Error in getFarmById:', error);
    return null;
  }
}

/**
 * Parse location from PostGIS POINT format
 */
function parseLocation(point: string | any): { lat: number; lng: number } {
  if (typeof point === 'object' && point !== null) {
    if ('lat' in point && 'lng' in point) {
      const lat = typeof point.lat === 'number' ? point.lat : parseFloat(String(point.lat));
      const lng = typeof point.lng === 'number' ? point.lng : parseFloat(String(point.lng));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    if ('latitude' in point && 'longitude' in point) {
      const lat = typeof point.latitude === 'number' ? point.latitude : parseFloat(String(point.latitude));
      const lng = typeof point.longitude === 'number' ? point.longitude : parseFloat(String(point.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  if (typeof point === 'string') {
    // Try (lng,lat) format (PostGIS point format) - e.g., "(-93.37,18.36)"
    const match1 = point.match(/\(([^,]+),([^)]+)\)/);
    if (match1) {
      const lng = parseFloat(match1[1].trim());
      const lat = parseFloat(match1[2].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    // Try POINT(lng lat) format (WKT format)
    const match2 = point.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match2) {
      const lng = parseFloat(match2[1]);
      const lat = parseFloat(match2[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    // Try "lng,lat" format
    const parts = point.split(',');
    if (parts.length === 2) {
      const lng = parseFloat(parts[0].trim());
      const lat = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  console.error('Failed to parse location:', point, typeof point);
  throw new Error(`Invalid location format: ${JSON.stringify(point)}`);
}

/**
 * Update farm
 */
export async function updateFarm(
  farmId: string,
  updates: Partial<CreateFarmData>
): Promise<Farm | null> {
  try {
    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.boundaries) {
      updateData.boundaries = updates.boundaries;
      // Recalculate area if boundaries changed
      updateData.area_hectares = calculateTotalArea(updates.boundaries);
    }
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { data, error } = await supabase
      .from('farms')
      .update(updateData)
      .eq('id', farmId)
      .select()
      .single();

    if (error) {
      console.error('Error updating farm:', error);
      return null;
    }

    return {
      ...data,
      boundaries: data.boundaries as Polygon[]
    } as Farm;
  } catch (error) {
    console.error('Error in updateFarm:', error);
    return null;
  }
}

/**
 * Delete farm (cascade will delete trees and photos)
 */
export async function deleteFarm(farmId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', farmId);

    if (error) {
      console.error('Error deleting farm:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFarm:', error);
    return false;
  }
}
