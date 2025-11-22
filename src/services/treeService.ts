import { supabase, type Tree } from '../lib/supabase';

export interface CreateTreeData {
  tree_number?: string;
  variety?: string;
  planting_date?: string;
  status?: 'active' | 'dormant' | 'removed';
  metadata?: Record<string, any>;
}

/**
 * Convert lat/lng to PostGIS POINT format
 * PostGIS expects format: (lng, lat) or we can use ST_MakePoint function
 * For Supabase, we'll use the WKT format or let PostGIS handle it
 */
function locationToPoint(location: { lat: number; lng: number }): string {
  // Use PostGIS ST_MakePoint format via SQL function
  // Format: (longitude, latitude) for point type
  return `(${location.lng},${location.lat})`;
}

/**
 * Convert PostGIS POINT to lat/lng object
 * Handles various formats: POINT(lng lat), {lng, lat}, or string "lng,lat"
 */
function pointToLocation(point: string | any): { lat: number; lng: number } {
  // If it's already an object with lat/lng
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
    // Supabase might return POINT as an object with x (lng) and y (lat) properties
    if ('x' in point && 'y' in point) {
      const lng = typeof point.x === 'number' ? point.x : parseFloat(String(point.x));
      const lat = typeof point.y === 'number' ? point.y : parseFloat(String(point.y));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  // If it's a string, try to parse it
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

  console.error('Failed to parse POINT:', point, typeof point);
  throw new Error(`Invalid POINT format: ${JSON.stringify(point)}`);
}

/**
 * Create a new tree
 */
export async function createTree(
  farmId: string,
  treeData: CreateTreeData,
  location: { lat: number; lng: number }
): Promise<Tree | null> {
  try {
    const { data, error } = await supabase
      .from('trees')
      .insert({
        farm_id: farmId,
        location: locationToPoint(location),
        tree_number: treeData.tree_number || null,
        variety: treeData.variety || null,
        planting_date: treeData.planting_date || null,
        status: treeData.status || 'active',
        metadata: treeData.metadata || {}
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating tree:', error);
      return null;
    }

    try {
      // Supabase returns location as string "(-93.37,18.36)"
      const locationData = data.location;
      const location = pointToLocation(locationData);
      // Validate location before returning
      if (isNaN(location.lat) || isNaN(location.lng)) {
        console.error('Invalid location after parsing:', locationData, location);
        return null;
      }
      return {
        ...data,
        location
      } as Tree;
    } catch (parseError) {
      console.error('Error parsing location in createTree:', parseError, data.location);
      return null;
    }
  } catch (error) {
    console.error('Error in createTree:', error);
    return null;
  }
}

/**
 * Get trees by farm ID
 */
export async function getTreesByFarm(farmId: string): Promise<Tree[]> {
  try {
    // Supabase automatically converts POINT to string format
    const { data, error } = await supabase
      .from('trees')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trees:', error);
      return [];
    }

    return data.map(tree => {
      try {
        // Supabase returns location as string "(-93.37,18.36)" or as object
        const locationData = tree.location;
        
        // If location is an object (Supabase might return it as an object), convert to string
        let locationString: string;
        if (typeof locationData === 'object' && locationData !== null) {
          // If it already has lat/lng, use it directly
          if ('lat' in locationData && 'lng' in locationData) {
            const lat = typeof locationData.lat === 'number' ? locationData.lat : parseFloat(String(locationData.lat));
            const lng = typeof locationData.lng === 'number' ? locationData.lng : parseFloat(String(locationData.lng));
            if (!isNaN(lat) && !isNaN(lng)) {
              return {
                ...tree,
                location: { lat, lng }
              };
            }
          }
          // Otherwise, try to convert object to string representation
          locationString = JSON.stringify(locationData);
        } else {
          locationString = locationData;
        }
        
        // If it's still not a string, log and skip
        if (typeof locationString !== 'string') {
          console.error('Location data is not a string:', tree.id, locationString, typeof locationString);
          return null;
        }
        
        const location = pointToLocation(locationString);
        
        // Validate parsed location
        if (isNaN(location.lat) || isNaN(location.lng)) {
          console.error('Invalid location parsed for tree:', tree.id, 'input:', locationData, 'output:', location);
          return null;
        }
        
        return {
          ...tree,
          location
        };
      } catch (error) {
        console.error('Error parsing location for tree:', tree.id, error, 'locationData:', tree.location);
        return null;
      }
    }).filter((tree): tree is Tree => tree !== null);
  } catch (error) {
    console.error('Error in getTreesByFarm:', error);
    return [];
  }
}

/**
 * Get tree by ID with photos included
 */
export async function getTreeById(treeId: string): Promise<Tree & { photos?: any[] } | null> {
  try {
    const { data, error } = await supabase
      .from('trees')
      .select(`
        *,
        tree_photos (*)
      `)
      .eq('id', treeId)
      .single();

    if (error) {
      console.error('Error fetching tree:', error);
      return null;
    }

    try {
      // Supabase returns location as string "(-93.37,18.36)"
      const locationData = data.location;
      const location = pointToLocation(locationData);
      // Validate location
      if (isNaN(location.lat) || isNaN(location.lng)) {
        console.error('Invalid location in getTreeById:', locationData, location);
        return null;
      }
      return {
        ...data,
        location,
        photos: data.tree_photos || []
      } as Tree & { photos?: any[] };
    } catch (parseError) {
      console.error('Error parsing location in getTreeById:', parseError, data.location);
      return null;
    }
  } catch (error) {
    console.error('Error in getTreeById:', error);
    return null;
  }
}

/**
 * Update tree
 */
export async function updateTree(
  treeId: string,
  updates: Partial<CreateTreeData & { location?: { lat: number; lng: number } }>
): Promise<Tree | null> {
  try {
    const updateData: any = {};

    if (updates.tree_number !== undefined) updateData.tree_number = updates.tree_number;
    if (updates.variety !== undefined) updateData.variety = updates.variety;
    if (updates.planting_date !== undefined) updateData.planting_date = updates.planting_date;
    if (updates.status) updateData.status = updates.status;
    if (updates.metadata) updateData.metadata = updates.metadata;
    if (updates.location) updateData.location = locationToPoint(updates.location);

    const { data, error } = await supabase
      .from('trees')
      .update(updateData)
      .eq('id', treeId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating tree:', error);
      return null;
    }

    try {
      // Supabase returns location as string "(-93.37,18.36)"
      const locationData = data.location;
      const location = pointToLocation(locationData);
      // Validate location
      if (isNaN(location.lat) || isNaN(location.lng)) {
        console.error('Invalid location in updateTree:', locationData, location);
        return null;
      }
      return {
        ...data,
        location
      } as Tree;
    } catch (parseError) {
      console.error('Error parsing location in updateTree:', parseError, data.location);
      return null;
    }
  } catch (error) {
    console.error('Error in updateTree:', error);
    return null;
  }
}

/**
 * Delete tree
 */
export async function deleteTree(treeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trees')
      .delete()
      .eq('id', treeId);

    if (error) {
      console.error('Error deleting tree:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteTree:', error);
    return false;
  }
}

