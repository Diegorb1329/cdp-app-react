import { Routes, Route, Navigate } from "react-router-dom";
import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks";
import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import UserBalance from "../components/UserBalance";
import EOATransaction from "../components/EOATransaction";
import Loading from "../components/Loading";

// Lazy load heavy pages to reduce initial bundle size
const HumanityProofPage = lazy(() => import("./HumanityProofPage"));
const FarmsPage = lazy(() => import("./FarmsPage"));
const FarmDetailPage = lazy(() => import("./FarmDetailPage"));
const HypercertsPage = lazy(() => import("./HypercertsPage"));

/**
 * Create a viem client to access user's balance on the Base Sepolia network
 */
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Wallet page with balance and transaction actions
function WalletPage() {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const [balance, setBalance] = useState<bigint | undefined>(undefined);

  const formattedBalance = useMemo(() => {
    if (balance === undefined) return undefined;
    return formatEther(balance);
  }, [balance]);

  const getBalance = useCallback(async () => {
    if (!evmAddress) return;
    const weiBalance = await client.getBalance({
      address: evmAddress,
    });
    setBalance(weiBalance);
  }, [evmAddress]);

  useEffect(() => {
    getBalance();
    const interval = setInterval(getBalance, 500);
    return () => clearInterval(interval);
  }, [getBalance]);

  return (
    <div className="page-content">
      <h1 className="page-title">Wallet</h1>
      <p className="page-description">Manage your wallet and transactions</p>
      
      <div className="wallet-grid">
        <div className="wallet-card">
          <UserBalance balance={formattedBalance} />
        </div>
        {isSignedIn && evmAddress && (
          <div className="wallet-card">
            <EOATransaction balance={formattedBalance} onSuccess={getBalance} />
          </div>
        )}
        {/* Earnings section */}
        <div className="wallet-card">
          <div className="balance-container">
            <h2 className="card-title">Total Earnings</h2>
            <div className="user-balance">
              <span className="flex-row-container">
                <span style={{ fontSize: '2.5rem', fontWeight: 600, color: '#000' }}>347</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 500, color: '#666', marginLeft: '0.5rem' }}>USD</span>
              </span>
            </div>
            <p className="balance-info" style={{ marginTop: '1rem', color: '#666' }}>
              You have made 347 USD from your coffee production
            </p>
          </div>
        </div>
        {/* Oframp box */}
        <div className="wallet-card">
          <div className="balance-container">
            <h2 className="card-title">Offramp</h2>
            <p className="balance-info" style={{ marginTop: '1rem', marginBottom: '1.5rem', color: '#666' }}>
              Convert your crypto earnings to fiat currency
            </p>
            <button
              style={{
                padding: '0.875rem 2rem',
                backgroundColor: '#8B6F47',
                color: '#fff',
                border: 'none',
                borderRadius: '2rem',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#6F5B3A';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#8B6F47';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Start Offramp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The Signed In screen with sidebar navigation
 */
function SignedInScreen() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/app/wallet" replace />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/humanity-proof" element={<HumanityProofPage />} />
              <Route path="/farms" element={<FarmsPage />} />
              <Route path="/farms/:farmId" element={<FarmDetailPage />} />
              <Route path="/hypercerts" element={<HypercertsPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default SignedInScreen;

