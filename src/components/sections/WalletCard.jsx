import Button from '../ui/Button';

function truncateAddress(address) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletCard({
  account,
  chainId,
  isConnecting,
  isCorrectNetwork,
  error,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}) {
  return (
    <section className="wallet-card">
      <div className="wallet-row">
        <p className="wallet-label">Wallet</p>
        <p className="wallet-value">{account ? truncateAddress(account) : 'Not connected'}</p>
      </div>

      <div className="wallet-row">
        <p className="wallet-label">Network</p>
        <p className="wallet-value">{chainId ? `Chain ID: ${chainId}` : 'Unknown'}</p>
      </div>

      <div className="wallet-actions">
        {!account ? (
          <Button onClick={onConnect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onDisconnect}>
            Disconnect
          </Button>
        )}

        {account && !isCorrectNetwork && (
          <Button variant="secondary" onClick={onSwitchNetwork}>
            Switch to Polygon
          </Button>
        )}
      </div>

      {error ? <p className="wallet-error">{error}</p> : null}
    </section>
  );
}

export default WalletCard;
