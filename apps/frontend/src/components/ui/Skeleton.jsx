import { cn } from '../../lib/cn.js';

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('skeleton-shimmer animate-shimmer rounded-md', className)} />;
}

const LARGURAS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/12', 'w-7/12'];

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="w-full overflow-hidden">
      <span className="sr-only">Carregando equipamentos…</span>
      <div className="flex gap-4 border-b border-line bg-surface-muted/60 px-4 py-3">
        {Array.from({ length: columns }, (_, c) => (
          <div key={c} className="flex-1">
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }, (_, c) => (
              <div key={c} className="flex-1">
                <Skeleton className={cn('h-4', LARGURAS[(r + c * 2) % LARGURAS.length])} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
