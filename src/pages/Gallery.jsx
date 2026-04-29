import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import Header from '../components/layout/Header';
import { POLYGON_AMOY } from '../config/chains';

const API_BASE = 'http://localhost:4000';
const PAGE_SIZE = 20;

function truncateAddress(address) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Gallery() {
  const { wallet } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/users/${wallet}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => {});
  }, [wallet]);

  const fetchClaims = useCallback(async (pageNum, append = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/gallery/${wallet}?page=${pageNum}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to load gallery');
      const data = await res.json();
      setClaims((prev) => (append ? [...prev, ...data.claims] : data.claims));
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    }
  }, [wallet]);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    setClaims([]);
    fetchClaims(1, false).finally(() => setIsLoading(false));
  }, [wallet, fetchClaims]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    await fetchClaims(nextPage, true);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onSearch = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    navigate(`/gallery/${q}`);
    setSearchInput('');
  };

  const hasMore = claims.length < total;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        {/* Search */}
        <form onSubmit={onSearch} className="mb-8 flex gap-2">
          <Input
            placeholder="Search wallet address…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            Go
          </Button>
        </form>

        {/* Gallery header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {profile?.username ? profile.username : truncateAddress(wallet)}
            </h1>
            {profile?.username && (
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{truncateAddress(wallet)}</p>
            )}
            {profile?.bio && (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary">
                {total} claim{total !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={copyLink} className="shrink-0">
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>

        {error && (
          <p className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        )}

        {!isLoading && claims.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <p className="text-lg font-medium">No claims yet.</p>
            <Link to="/" className="text-sm text-sky-400 underline underline-offset-2 hover:text-sky-300">
              Generate and claim your first image →
            </Link>
          </div>
        )}

        {!isLoading && claims.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {claims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? 'Loading…' : `Load more (${total - claims.length} remaining)`}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ClaimCard({ claim }) {
  const [imgError, setImgError] = useState(false);
  const isPseudoCID = !claim.ipfs_cid || claim.ipfs_cid.startsWith('generated-');

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/80 hover:bg-accent/30">
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {isPseudoCID || imgError ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Image unavailable
          </div>
        ) : (
          <img
            src={`${API_BASE}/api/image/${claim.ipfs_cid}`}
            alt={claim.prompt}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm text-foreground" title={claim.prompt}>
          {claim.prompt}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {new Date(claim.claimed_at).toLocaleDateString()}
          </p>
          {claim.tx_hash && (
            <a
              href={`${POLYGON_AMOY.blockExplorerUrls[0]}/tx/${claim.tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
            >
              <ExternalLink className="h-3 w-3" />
              Tx
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
