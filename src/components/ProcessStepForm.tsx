import { useState, useRef, useEffect } from 'react';
import { createProcessStep } from '../services/farmProcessService';
import { FarmMap } from './FarmMap';
import { getFarmById } from '../services/farmService';
import { getTreesByFarm } from '../services/treeService';
import type { Farm, Tree } from '../lib/supabase';

export interface ProcessStepFormProps {
  farmId: string;
  stepType: 'monthly_update' | 'drying' | 'final_bag';
  stepNumber?: number;
  treeId?: string; // Pre-selected tree (for monthly updates from tracker)
  batchId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function ProcessStepForm({ 
  farmId, 
  stepType, 
  stepNumber,
  treeId: preSelectedTreeId,
  batchId,
  onComplete, 
  onCancel 
}: ProcessStepFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load farm data and trees
  useEffect(() => {
    const loadData = async () => {
      const farmData = await getFarmById(farmId);
      if (farmData) setFarm(farmData);
      
      const treesData = await getTreesByFarm(farmId);
      setTrees(treesData);
      
      // Use pre-selected tree or auto-select first tree if available and monthly update
      if (treesData.length > 0 && stepType === 'monthly_update' && !selectedTreeId) {
        setSelectedTreeId(preSelectedTreeId || treesData[0].id);
      }
    };
    loadData();
  }, [farmId, stepType, preSelectedTreeId]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      const fileDate = file.lastModified || new Date().getTime();
      const now = new Date().getTime();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      if (fileDate < fiveMinutesAgo) {
        setError('Please use a recently captured photo. File uploads are not allowed.');
        if (cameraInputRef.current) {
          cameraInputRef.current.value = '';
        }
        return;
      }
      
      handleFileSelect(file);
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Error getting location: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access.';
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
        setError(errorMessage);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a photo');
      return;
    }

    if (!location) {
      setError('Please get your location first');
      return;
    }

    // For monthly updates, tree_id is required
    if (stepType === 'monthly_update' && !selectedTreeId) {
      setError('Please select a tree for monthly updates');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await createProcessStep(farmId, {
        step_type: stepType,
        step_number: stepNumber,
        tree_id: stepType === 'monthly_update' ? selectedTreeId! : undefined,
        photoFile: selectedFile,
        location: location,
        notes: notes || undefined
      }, batchId);
      onComplete?.();
    } catch (error) {
      console.error('Error creating process step:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const stepLabel = stepType === 'monthly_update' 
    ? `Month ${stepNumber} - Plant Photo` 
    : stepType === 'drying' 
      ? 'Drying Method Photo' 
      : 'Final Bag Photo';

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>{stepLabel}</h3>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* Tree selection for monthly updates */}
      {stepType === 'monthly_update' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Select Tree * (Required for monthly updates)
          </label>
          {trees.length === 0 ? (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              No trees found. Please add trees to your farm first.
            </div>
          ) : (
            <select
              value={selectedTreeId || ''}
              onChange={(e) => setSelectedTreeId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a tree --</option>
              {trees.map(tree => (
                <option key={tree.id} value={tree.id}>
                  {tree.tree_number || `Tree ${tree.id.slice(0, 8)}`}
                  {tree.variety && ` - ${tree.variety}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Camera capture */}
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
            fontSize: '1rem',
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
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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

      {/* Location */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
          Location Access Required
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
        {location && (
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
        )}
      </div>

      {/* Map */}
      {farm && location && (
        <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
          <FarmMap
            farm={farm}
            mode="view"
            selectedLocation={location}
            initialCenter={location}
            initialZoom={15}
          />
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem',
            fontFamily: 'inherit'
          }}
          placeholder="Add any notes about this step..."
        />
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleSubmit}
          disabled={!selectedFile || !location || isUploading || (stepType === 'monthly_update' && !selectedTreeId)}
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: (!selectedFile || !location || isUploading || (stepType === 'monthly_update' && !selectedTreeId)) ? '#ccc' : '#8B6F47',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: (!selectedFile || !location || isUploading) ? 'not-allowed' : 'pointer'
          }}
        >
          {isUploading ? 'Uploading...' : 'Complete Step'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#e5e5e5',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

