import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Upload } from 'lucide-react';
import Header from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { getProofContract } from '../services/proofContract';
import { POLYGON_AMOY } from '../config/chains';

async function sha256Hex(file) {
  const bytes = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return `0x${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function truncateAddress(address) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Verify() {
  const [verifyFile, setVerifyFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const verifyDisabled = useMemo(() => !verifyFile || isVerifying, [verifyFile, isVerifying]);

  const handleFile = (file) => {
    if (!file) return;
    setVerifyFile(file);
    setVerifyError('');
    setVerifyResult(null);
  };

  const onVerifyFileChange = (e) => handleFile(e.target.files?.[0] || null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  };

  const onVerifyOwnership = async () => {
    setVerifyError('');
    setVerifyResult(null);
    if (!verifyFile) { setVerifyError('Please select an image to verify.'); return; }
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
      setVerifyError(
        reason.toLowerCase().includes('not found')
          ? 'No ownership record found for this image.'
          : reason
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Verify Ownership</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload any image to check whether it has a registered ownership record on Polygon Amoy.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Image</CardTitle>
            <CardDescription>
              The SHA-256 hash of your file is computed locally and checked against the smart contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <label
              htmlFor="verify-file"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
                dragOver
                  ? 'border-foreground/40 bg-accent'
                  : 'border-border hover:border-foreground/25 hover:bg-accent/50'
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              {verifyFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{verifyFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(verifyFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Drop an image here or <span className="text-foreground underline underline-offset-2">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF, WEBP supported</p>
                </div>
              )}
              <Input
                id="verify-file"
                type="file"
                accept="image/*"
                onChange={onVerifyFileChange}
                className="sr-only"
              />
            </label>

            <Button
              className="w-full"
              variant={verifyFile ? 'default' : 'secondary'}
              disabled={verifyDisabled}
              onClick={onVerifyOwnership}
            >
              <ShieldCheck className="h-4 w-4" />
              {isVerifying ? 'Verifying…' : 'Check Ownership'}
            </Button>

            {verifyError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {verifyError}
              </p>
            )}

            {verifyResult && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">Ownership record found</p>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-mono text-xs">{verifyResult.owner}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-muted-foreground">Registered</span>
                    <span>{new Date(verifyResult.timestamp * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-muted-foreground">IPFS CID</span>
                    <span className="font-mono text-xs break-all">{verifyResult.ipfsCID}</span>
                  </div>
                  <div className="mt-1 border-t border-border pt-2">
                    <p className="break-all font-mono text-xs text-muted-foreground">
                      SHA-256: {verifyResult.hash}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      to={`/gallery/${verifyResult.owner}`}
                      className="text-xs text-sky-400 underline underline-offset-2 hover:text-sky-300"
                    >
                      View owner's gallery →
                    </Link>
                    <a
                      href={`${POLYGON_AMOY.blockExplorerUrls[0]}/address/${verifyResult.owner}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 underline underline-offset-2 hover:text-sky-300"
                    >
                      View on explorer →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
