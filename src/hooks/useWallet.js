import { useCallback, useEffect, useMemo, useState } from 'react';
import { POLYGON_AMOY } from '../config/chains';
import {
  getChainId,
  hasEthereum,
  requestAccounts,
  switchToPolygon as switchToPolygonNetwork,
} from '../services/wallet';

export function useWallet() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const isCorrectNetwork = useMemo(() => {
    return chainId === POLYGON_AMOY.chainIdDecimal;
  }, [chainId]);

  const connect = useCallback(async () => {
    setError('');
    setIsConnecting(true);

    try {
      const { accounts } = await requestAccounts();
      const currentChainId = await getChainId();
      setAccount(accounts[0] || '');
      setChainId(currentChainId);
    } catch (err) {
      setError(err?.message || 'Failed to connect wallet.');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount('');
    setError('');
  }, []);

  const switchToPolygon = useCallback(async () => {
    setError('');

    try {
      await switchToPolygonNetwork();
      const currentChainId = await getChainId();
      setChainId(currentChainId);
    } catch (err) {
      setError(err?.message || 'Failed to switch network.');
    }
  }, []);

  useEffect(() => {
    if (!hasEthereum()) return;

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0] || '');
    };

    const handleChainChanged = (newChainIdHex) => {
      setChainId(parseInt(newChainIdHex, 16));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    getChainId().then((id) => setChainId(id));

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return {
    account,
    chainId,
    isConnecting,
    isCorrectNetwork,
    error,
    connect,
    disconnect,
    switchToPolygon,
  };
}
