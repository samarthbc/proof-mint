import { BrowserProvider, Contract } from 'ethers';

const PROOF_CONTRACT_ABI = [
  'function registerContent(string hash, string ipfsCID) public',
  'function verifyOwnership(string hash) public view returns (address owner, string ipfsCID, uint256 timestamp)',
];

export function getContractAddress() {
  return process.env.REACT_APP_PROOF_CONTRACT_ADDRESS || '';
}

export async function getProofContract() {
  if (!window.ethereum) {
    throw new Error('No wallet found. Please install MetaMask.');
  }

  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error('Missing REACT_APP_PROOF_CONTRACT_ADDRESS in environment variables.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new Contract(contractAddress, PROOF_CONTRACT_ABI, signer);
}
