import { PinataSDK } from "pinata";
import exifr from 'exifr';

const pinataJwt = import.meta.env.VITE_PINATA_JWT || import.meta.env.PINATA_JWT;
// Group ID is optional - only use if explicitly configured (no default value)
const PINATA_GROUP_ID = import.meta.env.VITE_PINATA_GROUP_ID || undefined;

if (!pinataJwt) {
  console.warn('Pinata JWT not configured. IPFS uploads will not work.');
}

// Initialize Pinata client
let pinata: PinataSDK | null = null;

function initializePinata() {
  if (!pinataJwt) {
    throw new Error('Pinata JWT is not configured');
  }
  
  if (!pinata) {
    pinata = new PinataSDK({
      pinataJwt: pinataJwt,
      pinataGateway: "gateway.pinata.cloud"
    });
  }
  
  return pinata;
}

export interface IPFSUploadResult {
  cid: string;
  gatewayUrl: string;
  size: number;
}

export interface PhotoMetadata {
  gps?: {
    latitude: number;
    longitude: number;
  };
  dateTime?: string;
  make?: string;
  model?: string;
  [key: string]: any;
}

/**
 * Upload file to IPFS via Pinata
 */
export async function uploadToIPFS(
  file: File | Blob,
  metadata?: Record<string, any>
): Promise<IPFSUploadResult> {
  try {
    const pinataClient = initializePinata();
    
    // Verify upload exists
    if (!pinataClient.upload) {
      throw new Error('Pinata SDK upload is not available. Check SDK initialization.');
    }
    
    // Convert Blob to File if needed
    const fileObj = file instanceof File 
      ? file 
      : new File([file], 'upload', { type: file.type || 'application/octet-stream' });

    // Upload using the correct API: upload.file() returns UploadBuilder
    let uploadBuilder = pinataClient.upload.file(fileObj);
    
    // Build metadata object
    const pinataMetadata: { name?: string; keyvalues?: Record<string, string> } = {};
    
    if (fileObj.name) {
      pinataMetadata.name = fileObj.name;
    }
    
    if (metadata?.keyvalues) {
      pinataMetadata.keyvalues = metadata.keyvalues;
    }
    
    // Add metadata using chainable methods
    if (Object.keys(pinataMetadata).length > 0) {
      uploadBuilder = uploadBuilder.addMetadata(pinataMetadata);
    }
    
    // Add group ID only if configured and not empty (optional)
    if (PINATA_GROUP_ID && PINATA_GROUP_ID.trim() !== '') {
      uploadBuilder = uploadBuilder.group(PINATA_GROUP_ID);
    }
    
    // Execute the upload
    const upload = await uploadBuilder;

    if (!upload || !upload.cid) {
      console.error('Upload response:', upload);
      throw new Error('Upload failed: Invalid response from Pinata');
    }

    const cid = upload.cid;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    
    return {
      cid,
      gatewayUrl,
      size: upload.size || file.size
    };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

/**
 * Upload JSON data to IPFS
 */
export async function uploadJSONToIPFS(data: any): Promise<IPFSUploadResult> {
  try {
    const pinataClient = initializePinata();
    
    // Verify upload exists
    if (!pinataClient.upload) {
      throw new Error('Pinata SDK upload is not available. Check SDK initialization.');
    }
    
    // Use the correct API: upload.json() is better for JSON data
    let uploadBuilder = pinataClient.upload
      .json(data)
      .addMetadata({ name: 'data.json' });
    
    // Add group ID only if configured and not empty (optional)
    if (PINATA_GROUP_ID && PINATA_GROUP_ID.trim() !== '') {
      uploadBuilder = uploadBuilder.group(PINATA_GROUP_ID);
    }
    
    const upload = await uploadBuilder;

    if (!upload || !upload.cid) {
      console.error('Upload response:', upload);
      throw new Error('Upload failed: Invalid response from Pinata');
    }

    const cid = upload.cid;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    
    return {
      cid,
      gatewayUrl,
      size: upload.size || JSON.stringify(data).length
    };
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    throw error;
  }
}

/**
 * Extract EXIF metadata from photo
 */
export async function extractPhotoMetadata(photoFile: File): Promise<PhotoMetadata> {
  try {
    const exifData = await exifr.parse(photoFile, {
      gps: true,
      exif: true,
      ifd0: true as any,
      ifd1: true,
      translateKeys: false,
      translateValues: false,
      reviveValues: true,
      sanitize: true,
      mergeOutput: true
    });

    const metadata: PhotoMetadata = {};

    if (exifData?.latitude && exifData?.longitude) {
      metadata.gps = {
        latitude: exifData.latitude,
        longitude: exifData.longitude
      };
    }

    if (exifData?.DateTimeOriginal || exifData?.DateTime) {
      metadata.dateTime = exifData.DateTimeOriginal || exifData.DateTime;
    }

    if (exifData?.Make) {
      metadata.make = exifData.Make;
    }

    if (exifData?.Model) {
      metadata.model = exifData.Model;
    }

    // Include all other EXIF data
    Object.assign(metadata, exifData);

    return metadata;
  } catch (error) {
    console.error('Error extracting EXIF metadata:', error);
    return {};
  }
}

/**
 * Upload photo with metadata to IPFS
 * Uses provided location (from geolocation API) - no need for GPS in photo
 */
export async function uploadPhotoWithMetadata(
  photoFile: File,
  location: { lat: number; lng: number }
): Promise<IPFSUploadResult & { metadata: PhotoMetadata }> {
  try {
    if (!location) {
      throw new Error('Location is required to upload photo');
    }

    // Extract EXIF metadata (optional, for date/camera info)
    const exifMetadata = await extractPhotoMetadata(photoFile);

    // Prepare keyvalues for Pinata
    const keyvalues: Record<string, string> = {
      uploaded_via_app: 'true',
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
    };

    if (exifMetadata.dateTime) {
      keyvalues.dateTime = exifMetadata.dateTime;
    }
    if (exifMetadata.make) {
      keyvalues.make = exifMetadata.make;
    }
    if (exifMetadata.model) {
      keyvalues.model = exifMetadata.model;
    }

    // Upload to IPFS using correct API
    const pinataClient = initializePinata();
    
    // Verify upload exists
    if (!pinataClient.upload) {
      console.error('Pinata client structure:', pinataClient);
      throw new Error('Pinata SDK upload is not available. Check SDK initialization.');
    }
    
    // Use the correct API: upload.file() returns UploadBuilder with chainable methods
    let uploadBuilder = pinataClient.upload
      .file(photoFile)
      .addMetadata({
        name: photoFile.name || 'photo.jpg',
        keyvalues: keyvalues
      });
    
    // Add group ID only if configured and not empty (optional)
    if (PINATA_GROUP_ID && PINATA_GROUP_ID.trim() !== '') {
      uploadBuilder = uploadBuilder.group(PINATA_GROUP_ID);
    }
    
    const upload = await uploadBuilder;
    
    if (!upload || !upload.cid) {
      console.error('Upload response:', upload);
      throw new Error('Upload failed: Invalid response from Pinata');
    }

    const cid = upload.cid;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    // Combine metadata
    const fullMetadata: PhotoMetadata = {
      ...exifMetadata,
      gps: {
        latitude: location.lat,
        longitude: location.lng
      },
      uploaded_via_app: true,
      ipfs_cid: cid
    };

    return {
      cid,
      gatewayUrl,
      size: upload.size || photoFile.size,
      metadata: fullMetadata
    };
  } catch (error) {
    console.error('Error uploading photo with metadata:', error);
    throw error;
  }
}

/**
 * Get content from IPFS by CID
 */
export async function getIPFSContent<T>(cid: string): Promise<T | null> {
  try {
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(gatewayUrl);
    
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json() as T;
    }
    
    return await response.blob() as T;
  } catch (error) {
    console.error('Error fetching IPFS content:', error);
    return null;
  }
}

/**
 * Verify that IPFS content exists
 */
export async function verifyIPFSContent(cid: string): Promise<boolean> {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`, {
      method: 'HEAD'
    });
    return response.ok;
  } catch {
    return false;
  }
}
