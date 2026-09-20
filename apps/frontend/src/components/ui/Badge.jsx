import { STATUS_META, normalizeStatus } from '@frota/shared';

import { cn } from '../../lib/cn.js';
import { STATUS_TONE } from '../../lib/constants.js';

const TONES = {
  neutral: { badge: 'bg-surface-muted text-fg-muted ring-line-strong/60', dot: 'bg-fg-subtle' },
  success: { badge: 'bg-success-soft text-success-strong ring-success/20', dot: 'bg-success' },
  info: { badge: 'bg-info-soft text-info-strong ring-info/20', dot: 'bg-info' },
  warning: { badge: 'bg-warning-soft text-warning-strong ring-warning/25', dot: 'bg-warning' },
  danger: { badge: 'bg-danger-soft text-danger-strong ring-danger/20', dot: 'bg-danger' },
};

export function Badge({ tone = 'neutral', children, className, dot = true }) {
  const estilo = TONES[tone] ?? TONES.neutral;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        estilo.badge,
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', estilo.dot)} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const canonico = normalizeStatus(status);
  if (!canonico) {
    const texto = typeof status === 'string' && status.trim() ? status.trim() : 'Sem status';
    return (
      <Badge tone="neutral" className={className}>
        {texto}
      </Badge>
    );
  }
  return (
    <Badge tone={STATUS_TONE[canonico] ?? STATUS_META[canonico]?.tone ?? 'neutral'} className={className}>
      {STATUS_META[canonico]?.label ?? canonico}
    </Badge>
  );
}
