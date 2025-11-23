// Type declaration for mapbox-gl v3 default import in Vite
// Vite's optimizeDeps will create a default export from the namespace
// This augments the existing @types/mapbox-gl package to support default import
declare module 'mapbox-gl' {
  // Add default export for Vite compatibility
  // When Vite optimizes mapbox-gl via optimizeDeps, it creates a default export
  // The actual types come from @types/mapbox-gl which is already installed
  const mapboxgl: any;
  export default mapboxgl;
}

