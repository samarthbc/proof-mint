import { cn } from '../../lib/utils';

export function Badge({ className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border/70 bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}
