import { useEvmAddress } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useCallback, useEffect, useState } from "react";

import { IconCheck, IconCopy, IconUser } from "./Icons";

/**
 * Header component
 */
function Header() {
  const { evmAddress } = useEvmAddress();
  const [isCopied, setIsCopied] = useState(false);

  const formatAddress = useCallback((address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const copyAddress = async () => {
    if (!evmAddress) return;
    try {
      await navigator.clipboard.writeText(evmAddress);
      setIsCopied(true);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!isCopied) return;
    const timeout = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
          <span className="app-header-title">Coffee Traceability</span>
        </div>
        <div className="app-header-actions">
          {evmAddress && (
            <button
              aria-label="copy wallet address"
              className="wallet-button"
              onClick={copyAddress}
            >
              {!isCopied && (
                <>
                  <IconUser className="wallet-icon" />
                  <IconCopy className="wallet-icon wallet-icon--copy" />
                </>
              )}
              {isCopied && <IconCheck className="wallet-icon" />}
              <span className="wallet-address">{formatAddress(evmAddress)}</span>
            </button>
          )}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

export default Header;

