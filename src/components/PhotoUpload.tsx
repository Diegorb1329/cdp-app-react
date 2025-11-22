import { useState, useRef, useEffect } from 'react';
import { uploadTreePhoto, validatePhotoLocationInFarm } from '../services/photoService';
import { extractPhotoMetadata } from '../services/ipfsService';
import { FarmMap } from './FarmMap';
import { getTreeById } from '../services/treeService';
import { getFarmById } from '../services/farmService';
import type { Farm } from '../lib/supabase';

export interface PhotoUploadProps {
  treeId: string;
  onUploadComplete?: (photo: any) => void;
  onError?: (error: Error) => void;
}

export function PhotoUpload({ treeId, onUploadComplete, onError }: PhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [exifMetadata, setExifMetadata] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCid, setUploadedCid] = useState<string | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [locationValidation, setLocationValidation] = useState<{ valid: boolean; error?: string; validating: boolean } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load farm data to show boundaries
  useEffect(() => {
    const loadFarmData = async () => {
      try {
        const tree = await getTreeById(treeId);
        if (tree) {
          const farmData = await getFarmById(tree.farm_id);
          if (farmData) {
            setFarm(farmData);
          }
        }
      } catch (error) {
        console.error('Error loading farm data:', error);
      }
    };
    loadFarmData();
  }, [treeId]);

  // Validate location when it changes
  useEffect(() => {
    if (location && treeId) {
      setLocationValidation({ valid: false, validating: true });
      validatePhotoLocationInFarm(treeId, location)
        .then(result => {
          setLocationValidation({ ...result, validating: false });
        })
        .catch(error => {
          console.error('Error validating location:', error);
          setLocationValidation({ valid: false, error: 'Error validating location', validating: false });
        });
    } else {
      setLocationValidation(null);
    }
  }, [location, treeId]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setUploadedCid(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Extract EXIF metadata (optional, for display purposes only)
    try {
      const metadata = await extractPhotoMetadata(file);
      setExifMetadata(metadata);
      // Note: We don't use GPS from photo anymore, only from geolocation API
    } catch (error) {
      console.error('Error extracting EXIF metadata:', error);
    }
  };

  const handleCameraCapture = async () => {
    // Try to use getUserMedia API directly for better camera control
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, // Use back camera
          audio: false 
        });
        
        // Create video element to show camera preview
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.style.width = '100%';
        video.style.maxHeight = '400px';
        video.style.borderRadius = '8px';
        
        // Create container for camera preview
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '0';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.zIndex = '10000';
        container.style.padding = '2rem';
        
        const captureButton = document.createElement('button');
        captureButton.textContent = 'Capture Photo';
        captureButton.style.marginTop = '1rem';
        captureButton.style.padding = '1rem 2rem';
        captureButton.style.backgroundColor = '#8B6F47';
        captureButton.style.color = 'white';
        captureButton.style.border = 'none';
        captureButton.style.borderRadius = '8px';
        captureButton.style.fontSize = '1.1rem';
        captureButton.style.cursor = 'pointer';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.marginTop = '0.5rem';
        cancelButton.style.padding = '0.75rem 1.5rem';
        cancelButton.style.backgroundColor = '#666';
        cancelButton.style.color = 'white';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '8px';
        cancelButton.style.cursor = 'pointer';
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        captureButton.onclick = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx?.drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
              handleFileSelect(file);
            }
            
            // Stop stream and remove preview
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(container);
          }, 'image/jpeg', 0.9);
        };
        
        cancelButton.onclick = () => {
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(container);
        };
        
        container.appendChild(video);
        container.appendChild(captureButton);
        container.appendChild(cancelButton);
        document.body.appendChild(container);
      } catch (error) {
        console.error('Error accessing camera:', error);
        // Fallback to file input with capture attribute
        cameraInputRef.current?.click();
      }
    } else {
      // Fallback to file input with capture attribute
      cameraInputRef.current?.click();
    }
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verify that the file was created recently (within last 5 minutes)
      // This helps ensure it's a fresh camera capture, not an old file
      const fileDate = file.lastModified || new Date().getTime();
      const now = new Date().getTime();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      if (fileDate < fiveMinutesAgo) {
        onError?.(new Error('Please use a recently captured photo. File uploads are not allowed.'));
        // Reset input
        if (cameraInputRef.current) {
          cameraInputRef.current.value = '';
        }
        return;
      }
      
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(newLocation);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Error getting location: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access to upload photos.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location.';
            break;
        }
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Don't use cached location
      }
    );
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      onError?.(new Error('No photo selected'));
      return;
    }

    if (!location) {
      onError?.(new Error('Location is required. Please select a location on the map or ensure your photo has GPS metadata.'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (actual upload happens in service)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const photo = await uploadTreePhoto(treeId, {
        photoFile: selectedFile,
        location: location,
        photo_type: 'monthly_update'
      });

      // Clear progress interval if upload fails
      if (!photo) {
        clearInterval(progressInterval);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (photo) {
        setUploadedCid(photo.ipfs_cid);
        onUploadComplete?.(photo);
        
        // Reset form after successful upload
        setTimeout(() => {
          setSelectedFile(null);
          setPreview(null);
          setExifMetadata(null);
          setLocation(null);
          setUploadProgress(0);
          setUploadedCid(null);
          if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
          }
        }, 2000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      onError?.(error instanceof Error ? error : new Error('Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="photo-upload">
      <h3 style={{ marginBottom: '1rem' }}>Upload Tree Photo</h3>
      
      {/* Camera capture button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={handleCameraCapture}
          disabled={isUploading}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: isUploading ? '#ccc' : '#8B6F47',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: '500',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {selectedFile ? 'Take Another Photo' : 'Take Photo with Camera'}
        </button>
        
        {/* Hidden camera input - only camera, no file selection */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment" // Use back camera on mobile devices, forces camera on desktop
          onChange={handleCameraInputChange}
          style={{ display: 'none' }}
        />
        <p style={{ 
          fontSize: '0.85rem', 
          color: '#666', 
          marginTop: '0.5rem', 
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          Only camera capture is allowed. File uploads are not permitted.
        </p>
      </div>

      {/* Preview */}
      {preview && (
        <div style={{ marginBottom: '1rem' }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              display: 'block',
              margin: '0 auto'
            }}
          />
          {selectedFile && (
            <p style={{ 
              textAlign: 'center', 
              marginTop: '0.5rem', 
              fontSize: '0.9rem', 
              color: '#666' 
            }}>
              Photo: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      )}

      {/* EXIF Metadata info (optional display) */}
      {exifMetadata && (exifMetadata.dateTime || exifMetadata.make || exifMetadata.model) && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          <strong>Photo Info:</strong>
          {exifMetadata.dateTime && (
            <p style={{ margin: '0.5rem 0' }}>
              Date: {new Date(exifMetadata.dateTime).toLocaleString()}
            </p>
          )}
          {exifMetadata.make && exifMetadata.model && (
            <p style={{ margin: '0.5rem 0' }}>
              Camera: {exifMetadata.make} {exifMetadata.model}
            </p>
          )}
        </div>
      )}

      {/* Location access section */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
          Location Access Required
        </p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          To upload photos, you must allow location access. Your current location will be used to verify you are within the farm boundaries.
        </p>
        
        {!location && (
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isGettingLocation}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isGettingLocation ? '#ccc' : '#8B6F47',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isGettingLocation ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            {isGettingLocation ? (
              <>
                <span>⏳</span>
                <span>Getting location...</span>
              </>
            ) : (
              <>
                <span>📍</span>
                <span>Allow Location Access</span>
              </>
            )}
          </button>
        )}

        {locationError && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            borderRadius: '4px',
            color: '#991b1b',
            fontSize: '0.9rem'
          }}>
            <strong>⚠️ Error:</strong> {locationError}
          </div>
        )}

        {location && (
          <>
            <div style={{
              marginBottom: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#d1fae5',
              borderRadius: '4px',
              fontSize: '0.9rem',
              color: '#065f46'
            }}>
              <strong>✓ Location obtained:</strong> Lat {location.lat.toFixed(6)}, Lng {location.lng.toFixed(6)}
            </div>
            
            {/* Location validation status */}
            {locationValidation && (
              <div style={{
                marginBottom: '0.5rem',
                padding: '0.75rem',
                borderRadius: '4px',
                backgroundColor: locationValidation.validating 
                  ? '#f5f5f5' 
                  : locationValidation.valid 
                    ? '#d1fae5' 
                    : '#fee2e2',
                color: locationValidation.validating 
                  ? '#666' 
                  : locationValidation.valid 
                    ? '#065f46' 
                    : '#991b1b',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {locationValidation.validating ? (
                  <>
                    <span>⏳</span>
                    <span>Validating location...</span>
                  </>
                ) : locationValidation.valid ? (
                  <>
                    <span>✓</span>
                    <span>Location is within farm boundaries (20m buffer)</span>
                  </>
                ) : (
                  <>
                    <span>✗</span>
                    <span>{locationValidation.error || 'Location is outside farm boundaries'}</span>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Map to show location and farm boundaries */}
        <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem' }}>
          <FarmMap
            farm={farm || undefined}
            mode="view"
            selectedLocation={location || undefined}
            initialCenter={location || undefined}
            initialZoom={location ? 15 : 10}
          />
        </div>
        {farm && (
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', fontStyle: 'italic' }}>
            Note: Photo location must be within farm boundaries (20m buffer allowed)
          </p>
        )}
      </div>

      {/* Upload button - only enabled if inside polygon */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || !location || isUploading || !locationValidation?.valid || locationValidation?.validating}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: (!selectedFile || !location || isUploading || !locationValidation?.valid || locationValidation?.validating) ? '#ccc' : '#8B6F47',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: (!selectedFile || !location || isUploading || !locationValidation?.valid || locationValidation?.validating) ? 'not-allowed' : 'pointer'
        }}
      >
        {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload to IPFS'}
      </button>
      {!locationValidation?.valid && location && !locationValidation?.validating && (
        <p style={{ 
          marginTop: '0.5rem', 
          fontSize: '0.85rem', 
          color: '#991b1b', 
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          You must be inside the farm boundaries to upload photos
        </p>
      )}
      {!location && (
        <p style={{ 
          marginTop: '0.5rem', 
          fontSize: '0.85rem', 
          color: '#666', 
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          Take a photo to get GPS location, or select location on map
        </p>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e5e5',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              backgroundColor: '#8B6F47',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Success message */}
      {uploadedCid && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#d1fae5',
          borderRadius: '4px',
          color: '#065f46'
        }}>
          <p style={{ margin: 0, fontWeight: '500' }}>✓ Upload successful!</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
            IPFS CID: <code style={{ fontSize: '0.85rem' }}>{uploadedCid}</code>
          </p>
        </div>
      )}
    </div>
  );
}
