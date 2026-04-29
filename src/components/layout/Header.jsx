import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Wallet, ChevronDown, LogOut, Images, ShieldQuestion } from 'lucide-react';
import { useWalletContext } from '../../context/WalletContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Header() {
  const { account, isConnecting, isCorrectNetwork, connect, disconnect, switchToPolygon } =
    useWalletContext();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Create', to: '/' },
    { label: 'Verify', to: '/verify' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 text-foreground">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <span className="text-[15px] font-semibold tracking-tight">ProofMint</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                location.pathname === to
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {label}
            </Link>
          ))}
          {account && (
            <Link
              to={`/gallery/${account}`}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                location.pathname.startsWith('/gallery')
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              Gallery
            </Link>
          )}
        </nav>

        {/* Wallet area */}
        <div className="flex shrink-0 items-center gap-2">
          {!account ? (
            <Button size="sm" onClick={connect} disabled={isConnecting}>
              <Wallet className="h-3.5 w-3.5" />
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </Button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs text-muted-foreground">
                  {truncateAddress(account)}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-card p-1 shadow-xl">
                    {!isCorrectNetwork && (
                      <button
                        onClick={() => { switchToPolygon(); setMenuOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-400 transition-colors hover:bg-accent"
                      >
                        Switch to Polygon Amoy
                      </button>
                    )}
                    <Link
                      to={`/gallery/${account}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <Images className="h-4 w-4 text-muted-foreground" />
                      My Gallery
                    </Link>
                    <Link
                      to="/verify"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
                      Verify Ownership
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => { disconnect(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
