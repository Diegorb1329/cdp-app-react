import { useEvmAddress } from "@coinbase/cdp-hooks";
import {
  SendEvmTransactionButton,
  type SendEvmTransactionButtonProps,
} from "@coinbase/cdp-react/components/SendEvmTransactionButton";
import { Button } from "@coinbase/cdp-react/components/ui/Button";
import { LoadingSkeleton } from "@coinbase/cdp-react/components/ui/LoadingSkeleton";
import { useMemo, useState } from "react";

interface Props {
  balance?: string;
  onSuccess?: () => void;
}

/**
 * This component demonstrates how to send an EVM transaction using EOA (Externally Owned Accounts).
 *
 * @param {Props} props - The props for the EOATransaction component.
 * @param {string} [props.balance] - The user's balance.
 * @param {() => void} [props.onSuccess] - A function to call when the transaction is successful.
 * @returns A component that displays a transaction form and a transaction hash.
 */
function EOATransaction(props: Props) {
  const { balance, onSuccess } = props;
  const { evmAddress } = useEvmAddress();
  const [transactionHash, setTransactionHash] = useState("");
  const [error, setError] = useState("");

  const hasBalance = useMemo(() => {
    return balance && balance !== "0";
  }, [balance]);

  const transaction = useMemo<SendEvmTransactionButtonProps["transaction"]>(() => {
    return {
      to: evmAddress, // Send to yourself for testing
      value: 1000000000000n, // 0.000001 ETH in wei
      gas: 21000n,
      chainId: 84532, // Base Sepolia
      type: "eip1559",
    };
  }, [evmAddress]);

  const handleTransactionError: SendEvmTransactionButtonProps["onError"] = error => {
    setTransactionHash("");
    setError(error.message);
  };

  const handleTransactionSuccess: SendEvmTransactionButtonProps["onSuccess"] = hash => {
    setTransactionHash(hash);
    setError("");
    onSuccess?.();
  };

  const handleReset = () => {
    setTransactionHash("");
    setError("");
  };

  return (
    <div className="transaction-container">
      {balance === undefined && (
        <>
          <h2 className="card-title">Send a Transaction</h2>
          <LoadingSkeleton className="loading--text" />
          <LoadingSkeleton className="loading--btn" />
        </>
      )}
      {balance !== undefined && (
        <>
          {!transactionHash && error && (
            <>
              <h2 className="card-title">Transaction Error</h2>
              <p className="transaction-message">{error}</p>
              <Button className="tx-button" onClick={handleReset} variant="secondary">
                Reset and try again
              </Button>
            </>
          )}
          {!transactionHash && !error && (
            <>
              <h2 className="card-title">Send a Transaction</h2>
              {hasBalance && evmAddress && (
                <>
                  <p className="transaction-description">
                    Send 0.000001 ETH to yourself on Base Sepolia
                  </p>
                  <SendEvmTransactionButton
                    account={evmAddress}
                    network="base-sepolia"
                    transaction={transaction}
                    onError={handleTransactionError}
                    onSuccess={handleTransactionSuccess}
                  />
                </>
              )}
              {!hasBalance && (
                <div className="transaction-info">
                  <p className="transaction-description">
                    This example transaction sends a tiny amount of ETH from your wallet to itself.
                  </p>
                  <p className="transaction-description">
                    Get some from{" "}
                    <a
                      href="https://portal.cdp.coinbase.com/products/faucet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transaction-link"
                    >
                      Base Sepolia Faucet
                    </a>
                  </p>
                </div>
              )}
            </>
          )}
          {transactionHash && (
            <>
              <h2 className="card-title">Transaction Sent</h2>
              <div className="transaction-success">
                <p className="transaction-label">Transaction hash:</p>
                <a
                  href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transaction-hash"
                >
                  {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                </a>
              </div>
              <Button variant="secondary" className="tx-button" onClick={handleReset}>
                Send another transaction
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default EOATransaction;

