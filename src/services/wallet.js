import { BrowserProvider } from 'ethers';
import { POLYGON_AMOY } from '../config/chains';

export function hasEthereum() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function requestAccounts() {
  if (!hasEthereum()) {
    throw new Error('No wallet found. Please install MetaMask.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  return { provider, accounts };
}

export async function getChainId() {
  if (!hasEthereum()) return null;
  const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
  return parseInt(chainIdHex, 16);
}

export async function switchToPolygon() {
  if (!hasEthereum()) {
    throw new Error('No wallet found. Please install MetaMask.');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_AMOY.chainIdHex }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: POLYGON_AMOY.chainIdHex,
            chainName: POLYGON_AMOY.chainName,
            nativeCurrency: POLYGON_AMOY.nativeCurrency,
            rpcUrls: POLYGON_AMOY.rpcUrls,
            blockExplorerUrls: POLYGON_AMOY.blockExplorerUrls,
          },
        ],
      });
      return;
    }

    throw error;
  }
}
