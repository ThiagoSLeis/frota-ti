import { STATUS_LIST, STATUS_META } from '@frota/shared';
import { cn } from '../../lib/cn.js';

const DOT = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

function Chip({ ativo, onClick, children, contagem, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        ativo
          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
          : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {tone && <span className={cn('size-2 rounded-full', DOT[tone], ativo && 'ring-2 ring-white/70')} aria-hidden="true" />}
      {children}
      <span
        className={cn(
          'rounded-full px-1.5 text-xs tabular-nums',
          ativo ? 'bg-white/20 text-white' : 'bg-surface-muted text-fg-muted',
        )}
      >
        {contagem}
      </span>
    </button>
  );
}

export function StatusFilter({ value, onChange, resumo }) {
  const porStatus = resumo?.porStatus ?? {};

  return (
    <div
      role="group"
      aria-label="Filtrar por status"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <Chip ativo={value == null} onClick={() => onChange(null)} contagem={resumo?.total ?? 0}>
        Todos
      </Chip>
      {STATUS_LIST.map((status) => (
        <Chip
          key={status}
          ativo={value === status}
          onClick={() => onChange(value === status ? null : status)}
          contagem={porStatus[status] ?? 0}
          tone={STATUS_META[status].tone}
        >
          {STATUS_META[status].label}
        </Chip>
      ))}
    </div>
  );
}
