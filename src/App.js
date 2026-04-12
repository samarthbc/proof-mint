import { useMemo, useState } from 'react';
import { CheckCircle2, Link2, ShieldCheck, UploadCloud, Wallet } from 'lucide-react';
import { parseUnits } from 'ethers';
import { Button } from './components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { POLYGON_AMOY } from './config/chains';
import { useWallet } from './hooks/useWallet';
import { getContractAddress, getProofContract } from './services/proofContract';

function truncateAddress(address) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function sha256Hex(file) {
  const bytes = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(digest));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${hashHex}`;
}

async function getSafeFeeOverrides(contract) {
  const minTip = parseUnits('25', 'gwei');
  const minMaxFee = parseUnits('30', 'gwei');
  const bump = parseUnits('2', 'gwei');

  const feeData = await contract.runner.provider.getFeeData();

  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minTip
      ? feeData.maxPriorityFeePerGas
      : minTip;

  let maxFeePerGas =
    feeData.maxFeePerGas && feeData.maxFeePerGas > minMaxFee
      ? feeData.maxFeePerGas
      : minMaxFee;

  if (maxFeePerGas <= maxPriorityFeePerGas) {
    maxFeePerGas = maxPriorityFeePerGas + bump;
  }

  return { maxPriorityFeePerGas, maxFeePerGas };
}

function App() {
  const {
    account,
    chainId,
    isConnecting,
    isCorrectNetwork,
    error: walletError,
    connect,
    disconnect,
    switchToPolygon,
  } = useWallet();

  const [imageFile, setImageFile] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [claimedHash, setClaimedHash] = useState('');
  const [verifyFile, setVerifyFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const activeError = error || walletError;
  const contractAddress = getContractAddress();

  const claimDisabled = useMemo(() => {
    return !account || !isCorrectNetwork || !imageFile || isClaiming;
  }, [account, isCorrectNetwork, imageFile, isClaiming]);

  const verifyDisabled = useMemo(() => {
    return !verifyFile || isVerifying;
  }, [verifyFile, isVerifying]);

  const onFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setError('');
  };

  const onClaimOwnership = async () => {
    setError('');
    setTxHash('');

    if (!imageFile) {
      setError('Please select an image first.');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Switch to Polygon Amoy before claiming ownership.');
      return;
    }

    setIsClaiming(true);
    try {
      const contentHash = await sha256Hex(imageFile);
      const pseudoCid = `image-${imageFile.name}-${contentHash.slice(2, 18)}`;
      const contract = await getProofContract();
      const feeOverrides = await getSafeFeeOverrides(contract);

      const tx = await contract.registerContent(contentHash, pseudoCid, feeOverrides);
      await tx.wait();

      setClaimedHash(contentHash);
      setTxHash(tx.hash);
    } catch (err) {
      setError(err?.reason || err?.shortMessage || err?.message || 'Failed to claim ownership.');
    } finally {
      setIsClaiming(false);
    }
  };

  const onVerifyFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setVerifyFile(file);
    setVerifyError('');
  };

  const onVerifyOwnership = async () => {
    setVerifyError('');
    setVerifyResult(null);

    if (!verifyFile) {
      setVerifyError('Please select an image to verify ownership.');
      return;
    }

    setIsVerifying(true);
    try {
      const contentHash = await sha256Hex(verifyFile);
      const contract = await getProofContract();
      const result = await contract.verifyOwnership(contentHash);

      setVerifyResult({
        hash: contentHash,
        owner: result.owner,
        ipfsCID: result.ipfsCID,
        timestamp: Number(result.timestamp),
      });
    } catch (err) {
      const reason = err?.reason || err?.shortMessage || err?.message || 'Verification failed.';
      if (reason.toLowerCase().includes('not found')) {
        setVerifyError('No ownership record found for this image hash.');
      } else {
        setVerifyError(reason);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,146,60,0.28),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.24),transparent_28%),radial-gradient(circle_at_50%_95%,rgba(30,64,175,0.2),transparent_35%)]" />

      <section className="relative mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card className="animate-floatIn border-orange-200/30 bg-card/85 shadow-glow">
          <CardHeader>
            <div className="mb-3 flex items-center justify-between">
              <Badge>{POLYGON_AMOY.chainName}</Badge>
              <Badge className="bg-accent text-accent-foreground">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                On-chain Proof
              </Badge>
            </div>
            <CardTitle className="text-3xl md:text-4xl">Proof Mint</CardTitle>
            <CardDescription className="max-w-xl text-base">
              Connect your wallet, upload an image, and anchor ownership on Polygon Amoy using your deployed ProofOfOwnership smart contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Wallet Session</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-mono text-sm">{account ? truncateAddress(account) : 'Not connected'}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Chain</p>
                <p className="font-mono text-sm">{chainId ? `ID ${chainId}` : 'Unknown'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!account ? (
                <Button onClick={connect} disabled={isConnecting}>
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet To Login'}
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={disconnect}>
                    Disconnect
                  </Button>
                  {!isCorrectNetwork ? (
                    <Button variant="outline" onClick={switchToPolygon}>
                      Switch To Amoy
                    </Button>
                  ) : null}
                </>
              )}
            </div>

            {activeError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {activeError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="animate-floatIn border-sky-200/30 bg-card/90 [animation-delay:160ms]">
          <CardHeader>
            <CardTitle className="text-2xl">Claim Ownership</CardTitle>
            <CardDescription>
              The app computes an SHA-256 content hash from your image and sends it to registerContent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="image-file" className="text-sm font-medium text-muted-foreground">
                Upload Image
              </label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={onFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Contract: {contractAddress ? truncateAddress(contractAddress) : 'Set REACT_APP_PROOF_CONTRACT_ADDRESS'}
              </p>
            </div>

            <Button className="w-full" disabled={claimDisabled} onClick={onClaimOwnership}>
              <UploadCloud className="h-4 w-4" />
              {isClaiming ? 'Claiming Ownership...' : 'Claim Ownership'}
            </Button>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            {txHash ? (
              <>
                <p className="inline-flex items-center gap-2 font-medium text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  Ownership claim submitted successfully.
                </p>
                <a
                  className="inline-flex items-center gap-1 text-sky-600 underline underline-offset-4"
                  href={`${POLYGON_AMOY.blockExplorerUrls[0]}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  View transaction
                </a>
                <p className="font-mono text-xs text-muted-foreground">Hash: {claimedHash}</p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Connect wallet, switch to Amoy, choose image, then claim.
              </p>
            )}
          </CardFooter>
        </Card>

        <Card className="animate-floatIn border-emerald-200/30 bg-card/90 lg:col-span-2 [animation-delay:220ms]">
          <CardHeader>
            <CardTitle className="text-2xl">Ownership Verify</CardTitle>
            <CardDescription>
              Upload an image to compute its SHA-256 hash and fetch registered ownership details.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid gap-2">
              <label htmlFor="verify-image-file" className="text-sm font-medium text-muted-foreground">
                Upload Image To Verify
              </label>
              <Input
                id="verify-image-file"
                type="file"
                accept="image/*"
                onChange={onVerifyFileChange}
              />
            </div>
            <Button className="md:w-48" variant="outline" disabled={verifyDisabled} onClick={onVerifyOwnership}>
              {isVerifying ? 'Verifying...' : 'Verify Ownership'}
            </Button>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            {verifyError ? (
              <p className="w-full rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                {verifyError}
              </p>
            ) : null}

            {verifyResult ? (
              <div className="grid w-full gap-2 rounded-lg border border-border/60 bg-background/70 p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Owner:</span>{' '}
                  <span className="font-mono">{verifyResult.owner}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">IPFS CID:</span>{' '}
                  <span className="font-mono">{verifyResult.ipfsCID}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Timestamp:</span>{' '}
                  {new Date(verifyResult.timestamp * 1000).toLocaleString()}
                </p>
                <p className="break-all font-mono text-xs text-muted-foreground">Hash: {verifyResult.hash}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No verification result yet.</p>
            )}
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

export default App;
