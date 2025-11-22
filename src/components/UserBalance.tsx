import { LoadingSkeleton } from "@coinbase/cdp-react/components/ui/LoadingSkeleton";

interface Props {
  balance?: string;
}

/**
 * A component that displays the user's balance.
 *
 * @param {Props} props - The props for the UserBalance component.
 * @param {string} [props.balance] - The user's balance.
 * @returns A component that displays the user's balance.
 */
function UserBalance(props: Props) {
  const { balance } = props;

  return (
    <div className="balance-container">
      <h2 className="card-title">Available Balance</h2>
      <div className="user-balance">
        {balance === undefined && <LoadingSkeleton as="span" className="loading--balance" />}
        {balance !== undefined && (
          <span className="flex-row-container">
            <img src="/eth.svg" alt="" className="balance-icon" />
            <span>{balance}</span>
            <span className="sr-only">Ethereum</span>
          </span>
        )}
      </div>
      <p className="balance-info">
        Get testnet ETH from{" "}
        <a
          href="https://portal.cdp.coinbase.com/products/faucet"
          target="_blank"
          rel="noopener noreferrer"
          className="balance-link"
        >
          Base Sepolia Faucet
        </a>
      </p>
    </div>
  );
}

export default UserBalance;

