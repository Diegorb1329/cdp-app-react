# Coffee Production Tracking & Hypercert Platform

A decentralized application for tracking sustainable coffee production, minting verifiable impact certificates (hypercerts), and enabling transparent supply chain traceability. Built with React, Coinbase Developer Platform (CDP), Supabase, IPFS, and Hypercerts protocol.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Current Status](#current-status)
- [Simulated Functionality](#simulated-functionality)
- [Pain Points & Known Issues](#pain-points--known-issues)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Future Improvements](#future-improvements)

## Overview

This application enables coffee farmers to:
- Track their farms and individual coffee trees with GPS coordinates
- Upload monthly progress photos stored on IPFS
- Create verifiable impact certificates (hypercerts) for completed production batches
- Prove humanity verification using zero-knowledge proofs (ZKPassport)
- Sell hypercerts to buyers who want to support sustainable coffee production

**Key Features:**
- 🗺️ Interactive map visualization of farms and trees (Mapbox)
- 📸 Photo upload with GPS metadata to IPFS (Pinata)
- 🏆 Hypercert minting for verifiable impact claims
- 🔐 Zero-knowledge proof of humanity verification
- 💰 Wallet integration via Coinbase Developer Platform
- 🌍 Public marketplace for buying/selling hypercerts

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  CDP Hooks   │  │  Mapbox GL   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐  ┌─────────▼─────────┐  ┌─────▼──────┐
│   Supabase   │  │  IPFS (Pinata)    │  │  CDP SDK   │
│  PostgreSQL  │  │  Photo Storage    │  │  Wallets   │
│  + PostGIS   │  └───────────────────┘  └────────────┘
└──────────────┘
        │
┌───────▼──────────────────────────────────────────┐
│         Blockchain Layer                         │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Hypercerts   │  │  ZKPassport  │            │
│  │  Protocol    │  │  (Aztec)     │            │
│  └──────────────┘  └──────────────┘            │
│  (Sepolia/Base)    (ZK Proofs)                 │
└──────────────────────────────────────────────────┘
```

### Data Flow

1. **Farm & Tree Management**
   - User creates farms with polygon boundaries (stored as GeoJSON in Supabase)
   - Trees are added with GPS coordinates (PostGIS POINT type)
   - All data stored in Supabase PostgreSQL with PostGIS extension

2. **Photo Upload Workflow**
   - User uploads photo → EXIF data extracted (GPS, timestamp)
   - Photo uploaded to IPFS via Pinata SDK
   - IPFS CID and gateway URL stored in Supabase
   - Metadata includes tree_id, photo_type, location_metadata

3. **Hypercert Minting**
   - Batch completion triggers hypercert eligibility check
   - Metadata formatted according to Hypercerts schema
   - Transaction signed via CDP embedded wallet
   - Minted on Sepolia/Base testnet
   - Claim ID stored in application state (currently simulated for demo data)

4. **Public Marketplace**
   - Hypercerts generated from farms/trees in database
   - Purchase transactions simulated (stored in localStorage)
   - Buyer information displayed publicly

### Component Architecture

```
src/
├── pages/              # Route-level components
│   ├── LandingPage.tsx        # Public landing page
│   ├── MapPage.tsx             # Public map with hypercert marketplace
│   ├── SignedInScreen.tsx      # Main authenticated app shell
│   ├── FarmsPage.tsx           # List of user's farms
│   ├── FarmDetailPage.tsx      # Individual farm management
│   ├── HypercertsPage.tsx      # Hypercert minting interface
│   └── HumanityProofPage.tsx   # ZK proof verification
│
├── components/         # Reusable UI components
│   ├── FarmMap.tsx            # Mapbox map with farm boundaries
│   ├── PublicHypercertMap.tsx # Public map with tree markers
│   ├── ProcessWorkflow.tsx    # Coffee production workflow UI
│   ├── PhotoUpload.tsx        # IPFS photo upload component
│   └── HumanityProof.tsx      # ZKPassport integration
│
├── services/          # Business logic & API calls
│   ├── farmService.ts         # Farm CRUD operations
│   ├── treeService.ts         # Tree management
│   ├── photoService.ts        # Photo upload to IPFS
│   ├── hypercertService.ts    # Hypercert minting
│   ├── ipfsService.ts        # Pinata IPFS integration
│   ├── zkPassportService.ts  # ZK proof generation
│   └── userService.ts        # User management
│
└── lib/               # Core libraries & config
    └── supabase.ts           # Supabase client & types
```

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Mapbox GL JS v3** - Interactive maps
- **Turf.js** - Geospatial calculations

### Backend & Database
- **Supabase** - PostgreSQL database with PostGIS extension
- **Row Level Security (RLS)** - Data access control
- **PostGIS** - Geospatial data types (POINT, Polygon)

### Blockchain & Web3
- **Coinbase Developer Platform (CDP)**
  - Embedded wallets
  - Authentication hooks (`useEvmAddress`, `useIsSignedIn`)
  - Wallet client integration
- **Viem** - Ethereum library for transaction handling
- **Hypercerts SDK v2.9.1** - Impact certificate protocol
- **ZKPassport SDK v0.12.4** - Zero-knowledge proof verification

### Storage & IPFS
- **Pinata** - IPFS pinning service
- **IPFS** - Decentralized file storage
- **EXIFR** - Photo metadata extraction

### Styling
- **CSS Modules** - Component-scoped styles
- **Custom CSS Variables** - Theme system
- **Responsive Design** - Mobile-first approach

## Project Structure

```
cdp-app-react/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route-level page components
│   ├── services/           # Business logic & API services
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core libraries (Supabase client)
│   ├── types/               # TypeScript type definitions
│   ├── supabase/           # Database migrations
│   ├── App.tsx             # Main app component
│   ├── AppRouter.tsx       # Route configuration
│   ├── main.tsx            # Entry point
│   └── config.ts           # CDP configuration
│
├── public/                 # Static assets
├── dist/                   # Production build output
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Current Status

### ✅ Implemented Features

1. **Authentication & User Management**
   - ✅ Coinbase CDP embedded wallet integration
   - ✅ User sync to Supabase database
   - ✅ Wallet address management

2. **Farm Management**
   - ✅ Create farms with polygon boundaries
   - ✅ Edit farm details
   - ✅ Delete farms (cascade to trees)
   - ✅ Farm list view with search/filter

3. **Tree Management**
   - ✅ Add trees with GPS coordinates
   - ✅ Tree status tracking (active/dormant/removed)
   - ✅ Tree variety and planting date
   - ✅ Visual tree markers on map

4. **Photo Upload & IPFS**
   - ✅ Photo upload with drag-and-drop
   - ✅ EXIF metadata extraction (GPS, timestamp)
   - ✅ IPFS upload via Pinata
   - ✅ Photo gallery per tree
   - ✅ Monthly update tracking

5. **Production Workflow**
   - ✅ Batch creation and management
   - ✅ Process step tracking (monthly updates, drying, final bag)
   - ✅ Workflow visualization
   - ✅ Batch completion status

6. **Hypercert Minting**
   - ✅ Batch readiness validation
   - ✅ Metadata formatting
   - ✅ Hypercert client initialization
   - ✅ Transaction signing via CDP wallet
   - ✅ Minting on Sepolia/Base testnet

7. **Map Visualization**
   - ✅ Interactive Mapbox maps
   - ✅ Farm boundary polygons
   - ✅ Tree location markers
   - ✅ Public map with all trees
   - ✅ Globe projection view

8. **Humanity Verification**
   - ✅ ZKPassport SDK integration
   - ✅ Zero-knowledge proof generation
   - ✅ Age verification (>= 18) without revealing identity
   - ⚠️ Bug recovering the proof id

9. **Public Marketplace**
   - ✅ Hypercert listing from farms
   - ✅ Purchase interface
   - ✅ Public buyer information display

### 🚧 Partially Implemented

1. **Hypercert Display**
   - ⚠️ Demo data mixed with real data
   - ⚠️ Claim IDs stored in component state (not persisted)
   - ⚠️ No on-chain verification of ownership

2. **Marketplace**
   - ⚠️ Purchase transactions simulated
   - ⚠️ No actual token transfers
   - ⚠️ Data stored in localStorage (not persistent across devices)

## Simulated Functionality

- Hypercert purchase transactions are simulated with `setTimeout` (2-second delay), no actual blockchain interaction, and random transaction hashes generated in `src/components/PublicHypercertMap.tsx`.
- Demo hypercerts are hardcoded, include fake claim IDs and transaction hashes, and are mixed with real data in `src/pages/HypercertsPage.tsx`.
- Wallet earnings display is hardcoded to "347 USD" in `src/pages/SignedInScreen.tsx`.
- "Start Offramp" button has no real functionality in `src/pages/SignedInScreen.tsx`.
- Hypercerts have placeholder image CIDs and no actual image generation in `src/services/hypercertService.ts`.
- Available hypercerts are randomly generated for each farm/tree, with arbitrary prices and no backing tokens in `src/components/PublicHypercertMap.tsx`.

## Pain Points & Known Issues

- Mapbox GL JS v3 requires workarounds for ES module import issues, including custom type declarations and Vite config adjustments.
- The Hypercerts SDK's dependency on AJV causes ESM/CommonJS compatibility issues and requires workarounds in typings and Vite aliases.
- ZKPassport SDK bundle size is very large due to ZK proof libraries, causing large initial load times.
- Minted hypercert claim IDs are not persisted to a database, and are lost on page refresh.
- Photo upload progress bar is simulated, not based on actual upload progress, in `src/components/PhotoUpload.tsx`.
- Hypercert purchases are stored only in browser localStorage, not synced or validated on backend.
- Hypercert images are not generated; only placeholder CIDs are used.
- TypeScript code uses non-null assertion operators, potentially causing runtime errors and compromising type safety.
- No error recovery or retry for failed hypercert minting transactions.
- All coffee trees are loaded at once on the public map, potentially impacting performance for large datasets.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm, yarn, or pnpm
- Coinbase CDP Project ID
- Supabase account and project
- Pinata account (for IPFS)
- Mapbox access token

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cdp-app-react

# Install dependencies
npm install

# Copy environment variables
cp env.example .env

# Edit .env with your credentials
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Coinbase Developer Platform
VITE_CDP_PROJECT_ID=your_cdp_project_id

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox
VITE_MAPBOX_API_KEY=your_mapbox_token

# Pinata (IPFS)
VITE_PINATA_JWT=your_pinata_jwt

# Hypercerts (optional)
VITE_HYPERCERT_CHAIN_ID=11155111  # Sepolia testnet

# Logging (optional)
VITE_LOG_LEVEL=info
```

### Database Setup

Run Supabase migrations in order:

1. `supabase/migrations/initial` - Users table
2. `supabase/migrations/001_farms_and_trees.sql` - Farms and trees with PostGIS
3. `supabase/migrations/002_farm_process_steps.sql` - Process workflow
4. `supabase/migrations/003_add_batch_id.sql` - Batch tracking
5. `supabase/migrations/004_add_tree_id_to_process_steps.sql` - Tree linking

**Important:** Enable PostGIS extension in Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```