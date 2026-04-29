import { createContext, useContext } from 'react';
import { useWallet } from '../hooks/useWallet';

const WalletCtx = createContext(null);

export function WalletProvider({ children }) {
  const wallet = useWallet();
  return <WalletCtx.Provider value={wallet}>{children}</WalletCtx.Provider>;
}

export function useWalletContext() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error('useWalletContext must be used inside WalletProvider');
  return ctx;
}
