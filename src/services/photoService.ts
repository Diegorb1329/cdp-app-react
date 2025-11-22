import { supabase, type TreePhoto } from '../lib/supabase';
import { uploadPhotoWithMetadata } from './ipfsService';
import { getTreeById } from './treeService';
import { getFarmById } from './farmService';
import * as turf from '@turf/turf';

export interface UploadPhotoData {
  photoFile: File;
  location?: { lat: number; lng: number };
  photo_type?: 'monthly_update' | 'packing' | 'harvest' | 'other';
  taken_at?: string;
}

/**
 * Validate that photo location is within farm boundaries (with 20m buffer)
 */
export async function validatePhotoLocationInFarm(
  treeId: string,
  photoLocation: { lat: number; lng: number }
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get tree to find farm_id
    const tree = await getTreeById(treeId);
    if (!tree) {
      return { valid: false, error: 'Tree not found' };
    }

    // Get farm to get boundaries
    const farm = await getFarmById(tree.farm_id);
    if (!farm || !farm.boundaries || farm.boundaries.length === 0) {
      return { valid: false, error: 'Farm boundaries not found' };
    }

    // Create point from photo location
    const photoPoint = turf.point([photoLocation.lng, photoLocation.lat]);

    // Check if point is within any of the farm polygons (with 20m buffer)
    for (const polygon of farm.boundaries) {
      // Create buffer of 20 meters around the polygon
      // turf.buffer expects distance in kilometers, so 20m = 0.02km
      const bufferedPolygon = turf.buffer(polygon, 0.02, { units: 'kilometers' });

      // Check if point is inside the buffered polygon
      if (bufferedPolygon && turf.booleanPointInPolygon(photoPoint, bufferedPolygon)) {
        return { valid: true };
      }
    }

    // Calculate distance to nearest boundary for error message
    let minDistance = Infinity;
    for (const polygon of farm.boundaries) {
      // Get the outer ring coordinates
      const coordinates = polygon.coordinates[0];
      // Calculate distance to each edge of the polygon
      for (let i = 0; i < coordinates.length - 1; i++) {
        const line = turf.lineString([coordinates[i], coordinates[i + 1]]);
        const distance = turf.pointToLineDistance(photoPoint, line, { units: 'meters' });
        minDistance = Math.min(minDistance, distance);
      }
    }

    return {
      valid: false,
      error: `Photo location is outside farm boundaries. Distance to boundary: ${minDistance.toFixed(1)}m (maximum allowed: 20m)`
    };
  } catch (error) {
    console.error('Error validating photo location:', error);
    return { valid: false, error: 'Error validating location' };
  }
}

/**
 * Upload tree photo to IPFS and save to database
 */
export async function uploadTreePhoto(
  treeId: string,
  photoData: UploadPhotoData
): Promise<TreePhoto | null> {
  try {
    // Validate location is within farm boundaries (20m buffer)
    if (photoData.location) {
      const validation = await validatePhotoLocationInFarm(treeId, photoData.location);
      if (!validation.valid) {
        throw new Error(validation.error || 'Photo location is outside farm boundaries');
      }
    }

    // Upload to IPFS with metadata
    if (!photoData.location) {
      throw new Error('Location is required to upload photo');
    }
    
    const uploadResult = await uploadPhotoWithMetadata(
      photoData.photoFile,
      photoData.location
    );

    // Prepare location metadata for database
    const locationMetadata: Record<string, any> = {
      uploaded_via_app: true,
      ...uploadResult.metadata
    };

    // Save to database
    const { data, error } = await supabase
      .from('tree_photos')
      .insert({
        tree_id: treeId,
        ipfs_cid: uploadResult.cid,
        ipfs_gateway_url: uploadResult.gatewayUrl,
        photo_type: photoData.photo_type || 'monthly_update',
        taken_at: photoData.taken_at || new Date().toISOString(),
        location_metadata: locationMetadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving photo to database:', error);
      return null;
    }

    return data as TreePhoto;
  } catch (error) {
    console.error('Error in uploadTreePhoto:', error);
    // Re-throw the error so it can be handled by the UI
    throw error;
  }
}

/**
 * Get photos by tree ID
 */
export async function getPhotosByTree(treeId: string): Promise<TreePhoto[]> {
  try {
    const { data, error } = await supabase
      .from('tree_photos')
      .select('*')
      .eq('tree_id', treeId)
      .order('taken_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      return [];
    }

    return data as TreePhoto[];
  } catch (error) {
    console.error('Error in getPhotosByTree:', error);
    return [];
  }
}

/**
 * Get photo by IPFS CID
 */
export async function getPhotoByCid(cid: string): Promise<TreePhoto | null> {
  try {
    const { data, error } = await supabase
      .from('tree_photos')
      .select('*')
      .eq('ipfs_cid', cid)
      .single();

    if (error) {
      console.error('Error fetching photo by CID:', error);
      return null;
    }

    return data as TreePhoto;
  } catch (error) {
    console.error('Error in getPhotoByCid:', error);
    return null;
  }
}

/**
 * Validate that photo has location metadata
 */
export function validatePhotoLocation(photo: TreePhoto): boolean {
  const locationMeta = photo.location_metadata;
  if (!locationMeta) return false;
  
  // Check if GPS coordinates exist
  if (locationMeta.gps) {
    const gps = locationMeta.gps;
    return (
      typeof gps.latitude === 'number' &&
      typeof gps.longitude === 'number' &&
      !isNaN(gps.latitude) &&
      !isNaN(gps.longitude)
    );
  }
  
  return false;
}

