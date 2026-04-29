import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, Link2, Sparkles, UploadCloud } from 'lucide-react';
import { parseUnits } from 'ethers';
import Header from './components/layout/Header';
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
import { Textarea } from './components/ui/textarea';
import { POLYGON_AMOY } from './config/chains';
import { useWalletContext } from './context/WalletContext';
import { getContractAddress, getProofContract } from './services/proofContract';

const API_BASE = 'http://localhost:4000';

async function sha256HexFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return `0x${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
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
    feeData.maxFeePerGas && feeData.maxFeePerGas > minMaxFee ? feeData.maxFeePerGas : minMaxFee;
  if (maxFeePerGas <= maxPriorityFeePerGas) maxFeePerGas = maxPriorityFeePerGas + bump;
  return { maxPriorityFeePerGas, maxFeePerGas };
}

function App() {
  const { account, isCorrectNetwork, error: walletError } = useWalletContext();

  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageBase64, setImageBase64] = useState('');
  const [generationId, setGenerationId] = useState('');
  const [ipfsCID, setIpfsCID] = useState('');
  const [isPinning, setIsPinning] = useState(false);
  const [phash, setPhash] = useState('');
  const [similarityWarning, setSimilarityWarning] = useState(null);

  const [userProfile, setUserProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [claimedHash, setClaimedHash] = useState('');
  const [hashCopied, setHashCopied] = useState(false);

  useEffect(() => {
    if (!account) { setUserProfile(null); setShowProfileModal(false); return; }
    fetch(`${API_BASE}/api/users/${account}`)
      .then(async (r) => {
        if (r.status === 404) { setUserProfile(null); setShowProfileModal(true); }
        else if (r.ok) { const d = await r.json(); setUserProfile(d); }
      })
      .catch(() => {});
  }, [account]);

  const onSaveProfile = async () => {
    if (!profileUsername.trim()) { setProfileError('Username is required.'); return; }
    setProfileError('');
    setIsSavingProfile(true);
    try {
      const message = `Sign in to Proofmint: ${account} ${Date.now()}`;
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [message, account] });
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: account, username: profileUsername.trim(), bio: profileBio.trim(), message, signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      setUserProfile(data);
      setShowProfileModal(false);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const contractAddress = getContractAddress();

  const claimDisabled = useMemo(
    () => !account || !isCorrectNetwork || !imageBase64 || isPinning || isClaiming,
    [account, isCorrectNetwork, imageBase64, isPinning, isClaiming]
  );

  const checkSimilarity = async (gid) => {
    try {
      const { phash: computedPhash } = await fetch(`${API_BASE}/api/phash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: gid }),
      }).then((r) => r.json());
      if (!computedPhash) return;
      setPhash(computedPhash);
      const { matches } = await fetch(`${API_BASE}/api/similarity?phash=${computedPhash}`).then((r) => r.json());
      if (matches?.length > 0) setSimilarityWarning(matches);
    } catch { /* best-effort */ }
  };

  const pinInBackground = async (gid) => {
    setIsPinning(true);
    try {
      const res = await fetch(`${API_BASE}/api/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: gid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pinning failed');
      setIpfsCID(data.ipfsCID);
    } catch (err) {
      setError(`IPFS pinning failed: ${err.message}`);
    } finally {
      setIsPinning(false);
    }
  };

  const onGenerate = async () => {
    setError('');
    setImageBase64('');
    setGenerationId('');
    setIpfsCID('');
    setPhash('');
    setTxHash('');
    setClaimedHash('');
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, seed: seed !== '' ? Number(seed) : undefined, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setImageBase64(data.imageBase64);
      setSeed(String(data.seed));
      setGenerationId(data.generationId);
      setSimilarityWarning(null);
      pinInBackground(data.generationId);
      checkSimilarity(data.generationId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const onClaimOwnership = async () => {
    setError('');
    setTxHash('');
    if (!imageBase64) { setError('Generate an image first.'); return; }
    if (!isCorrectNetwork) { setError('Switch to Polygon Amoy before claiming.'); return; }
    setIsClaiming(true);
    try {
      const contentHash = await sha256HexFromBase64(imageBase64);
      const cid = ipfsCID || `generated-${contentHash.slice(2, 18)}`;
      const contract = await getProofContract();
      const feeOverrides = await getSafeFeeOverrides(contract);
      const tx = await contract.registerContent(contentHash, cid, feeOverrides);
      await tx.wait();
      try {
        const message = `Sign in to Proofmint: ${account} ${Date.now()}`;
        const signature = await window.ethereum.request({ method: 'personal_sign', params: [message, account] });
        await fetch(`${API_BASE}/api/claims`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: account, contentHash, phash, prompt, seed: Number(seed), aspectRatio, ipfsCID: cid, txHash: tx.hash, message, signature }),
        });
      } catch { /* best-effort */ }
      setClaimedHash(contentHash);
      setTxHash(tx.hash);
    } catch (err) {
      setError(err?.reason || err?.shortMessage || err?.message || 'Failed to claim ownership.');
    } finally {
      setIsClaiming(false);
    }
  };

  const activeError = error || walletError;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Create &amp; Claim</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate an AI image and register on-chain proof of ownership on Polygon Amoy.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          {/* Generate panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate Image</CardTitle>
              <CardDescription>Describe the image you want to create and claim.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <label htmlFor="prompt" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Prompt
                </label>
                <Textarea
                  id="prompt"
                  placeholder="A vivid oil painting of a fox in an autumn forest…"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label htmlFor="seed" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Seed
                  </label>
                  <Input
                    id="seed"
                    type="number"
                    min={0}
                    placeholder="Random"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="aspect-ratio" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Ratio
                  </label>
                  <select
                    id="aspect-ratio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!prompt.trim() || isGenerating}
                onClick={onGenerate}
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? 'Generating…' : 'Generate Image'}
              </Button>

              {activeError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {activeError}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Preview + claim panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview &amp; Claim</CardTitle>
              <CardDescription>
                {account
                  ? 'Review your generated image, then claim ownership on-chain.'
                  : 'Connect your wallet from the top bar to claim ownership.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-muted/40">
                {imageBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${imageBase64}`}
                    alt="Generated preview"
                    className="w-full rounded-lg object-contain"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isGenerating ? 'Generating image…' : 'Your image will appear here'}
                  </p>
                )}
              </div>

              {similarityWarning && similarityWarning.length > 0 && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm">
                  <p className="mb-2 font-medium text-amber-400">Similar image already claimed</p>
                  {similarityWarning.slice(0, 2).map((m, i) => (
                    <div key={i} className="mb-2 flex items-start gap-3">
                      {m.ipfs_cid && (
                        <img
                          src={`https://gateway.pinata.cloud/ipfs/${m.ipfs_cid}`}
                          alt="Existing claim"
                          className="h-12 w-12 flex-shrink-0 rounded border border-border object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-muted-foreground">{m.wallet_address}</p>
                        <p className="text-xs text-muted-foreground">
                          Distance: {m.distance} bits · {new Date(m.claimed_at).toLocaleDateString()}
                        </p>
                        {m.prompt && <p className="mt-0.5 truncate text-xs text-muted-foreground">"{m.prompt}"</p>}
                      </div>
                    </div>
                  ))}
                  <button
                    className="mt-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => setSimilarityWarning(null)}
                  >
                    Dismiss and claim anyway
                  </button>
                </div>
              )}

              {ipfsCID && (
                <p className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                  IPFS: {ipfsCID}
                </p>
              )}

              <Button className="w-full" disabled={claimDisabled} onClick={onClaimOwnership}>
                <UploadCloud className="h-4 w-4" />
                {isClaiming ? 'Claiming…' : isPinning ? 'Pinning to IPFS…' : 'Claim Ownership'}
              </Button>

              <p className="text-xs text-muted-foreground">
                Contract:{' '}
                {contractAddress
                  ? `${contractAddress.slice(0, 6)}…${contractAddress.slice(-4)}`
                  : 'Set REACT_APP_PROOF_CONTRACT_ADDRESS'}
              </p>
            </CardContent>

            <CardFooter className="flex-col items-start gap-2 text-sm">
              {txHash ? (
                <>
                  <p className="inline-flex items-center gap-2 font-medium text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Ownership claimed successfully.
                  </p>
                  <a
                    className="inline-flex items-center gap-1 text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300"
                    href={`${POLYGON_AMOY.blockExplorerUrls[0]}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    View transaction
                  </a>
                  <button
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(claimedHash);
                      setHashCopied(true);
                      setTimeout(() => setHashCopied(false), 2000);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    {hashCopied ? 'Copied!' : `Hash: ${claimedHash.slice(0, 18)}…`}
                  </button>
                  <Link
                    to={`/gallery/${account}`}
                    className="inline-flex items-center gap-1 text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300"
                  >
                    View my gallery →
                  </Link>
                </>
              ) : (
                <p className="text-muted-foreground">
                  {account ? 'Generate an image, then claim.' : 'Connect your wallet to get started.'}
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Profile modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-semibold">
              {userProfile?.username ? 'Edit Profile' : 'Set up your profile'}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Your username will appear alongside your ownership claims.
            </p>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Username</label>
                <Input
                  placeholder="satoshi"
                  maxLength={50}
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Bio <span className="normal-case font-normal">(optional)</span>
                </label>
                <Textarea
                  placeholder="A few words about yourself…"
                  rows={3}
                  maxLength={300}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                />
              </div>
              {profileError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {profileError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={onSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving…' : 'Save — Sign with wallet'}
                </Button>
                <Button variant="secondary" onClick={() => setShowProfileModal(false)}>
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
