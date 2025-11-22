import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  wallet_address: string;
  zk_verified: boolean;
  zk_proof_hash: string | null;
  unique_identifier: string | null;
  created_at: string;
  role: 'farmer' | 'tester' | null;
}

import type { Polygon } from 'geojson';

export interface Farm {
  id: string;
  farmer_id: string;
  name: string;
  boundaries: Polygon[]; // Array of polygons defining farm boundaries
  area_hectares: number | null; // Calculated automatically from polygons
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Tree {
  id: string;
  farm_id: string;
  location: { lat: number; lng: number }; // Converted from POINT
  tree_number: string | null;
  variety: string | null;
  planting_date: string | null;
  status: 'active' | 'dormant' | 'removed';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TreePhoto {
  id: string;
  tree_id: string;
  ipfs_cid: string;
  ipfs_gateway_url: string;
  photo_type: 'monthly_update' | 'packing' | 'harvest' | 'other';
  taken_at: string;
  location_metadata: Record<string, any>;
  created_at: string;
}

export interface FarmProcessStep {
  id: string;
  farm_id: string;
  batch_id: string; // For batch/cycle tracking
  tree_id: string | null; // Required for monthly_update, null for drying/final_bag
  step_type: 'monthly_update' | 'drying' | 'final_bag' | 'completed';
  step_number: number | null; // For monthly updates: month number (1-12)
  photo_id: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreeMonthlyStatus {
  tree_id: string;
  tree_number: string | null;
  completed_months: number[]; // Array of month numbers (1-12) that are completed
  missing_months: number[]; // Array of month numbers (1-12) that are missing
}

export interface ProcessBatch {
  batch_id: string;
  farm_id: string;
  created_at: string;
  steps: FarmProcessStep[];
}

