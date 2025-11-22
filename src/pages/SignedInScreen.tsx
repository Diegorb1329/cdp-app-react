import { useEvmAddress, useIsSignedIn } from "@coinbase/cdp-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";

import EOATransaction from "../components/EOATransaction";
import Header from "../components/Header";
import UserBalance from "../components/UserBalance";

/**
 * Create a viem client to access user's balance on the Base Sepolia network
 */
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

/**
 * The Signed In screen
 */
function SignedInScreen() {
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
    <>
      <Header />
      <main className="dashboard">
        <div className="dashboard-content">
          <h1 className="dashboard-title">Your Dashboard</h1>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <UserBalance balance={formattedBalance} />
            </div>
            {isSignedIn && evmAddress && (
              <div className="dashboard-card">
                <EOATransaction balance={formattedBalance} onSuccess={getBalance} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default SignedInScreen;

