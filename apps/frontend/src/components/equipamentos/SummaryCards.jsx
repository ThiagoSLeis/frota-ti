import { STATUS, STATUS_LIST, STATUS_META } from '@frota/shared';
import { cn } from '../../lib/cn.js';
import { formatarContagem, percentual, pluralizar } from '../../lib/format.js';
import { Skeleton } from '../ui/Skeleton.jsx';
import { IconCheckCircle, IconLaptop, IconUser, IconWrench } from '../icons.jsx';

const ICONE_STATUS = {
  [STATUS.DISPONIVEL]: IconCheckCircle,
  [STATUS.EM_USO]: IconUser,
  [STATUS.EM_MANUTENCAO]: IconWrench,
};

const TONE = {
  brand: { tile: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300', bar: 'bg-brand-600', ring: 'ring-brand-500' },
  success: { tile: 'bg-success-soft text-success-strong', bar: 'bg-success', ring: 'ring-success' },
  info: { tile: 'bg-info-soft text-info-strong', bar: 'bg-info', ring: 'ring-info' },
  warning: { tile: 'bg-warning-soft text-warning-strong', bar: 'bg-warning', ring: 'ring-warning' },
};

function toNumero(valor) {
  return Number.parseFloat(valor) || 0;
}

function CardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-10 rounded-xl" />
      </div>
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
      <Skeleton className="mt-2 h-3 w-40" />
    </div>
  );
}

function CardConteudo({ label, valor, icone: Icone, tone, pct, rodape }) {
  const t = TONE[tone] ?? TONE.brand;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', t.tile)}>
          <Icone className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-fg tabular-nums">{valor}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', t.bar)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-fg-subtle">{rodape}</p>
    </>
  );
}

const CARD_BASE =
  'relative rounded-card border bg-surface p-4 sm:p-5 text-left shadow-card transition outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

export function SummaryCards({ resumo, carregando, statusFiltro, onSelecionarStatus }) {
  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-busy="true" aria-label="Carregando resumo">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const total = resumo?.total ?? 0;
  const porStatus = resumo?.porStatus ?? {};
  const outros = resumo?.outros ?? 0;
  const semFiltro = statusFiltro == null;

  return (
    <section aria-label="Resumo do inventário" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <button
        type="button"
        onClick={() => onSelecionarStatus(null)}
        aria-pressed={semFiltro}
        className={cn(
          CARD_BASE,
          'focus-visible:ring-brand-500 hover:border-line-strong',
          semFiltro ? 'border-brand-500 ring-1 ring-brand-500' : 'border-line',
        )}
      >
        <CardConteudo
          label="Total de equipamentos"
          valor={total}
          icone={IconLaptop}
          tone="brand"
          pct={total > 0 ? 100 : 0}
          rodape={
            outros > 0 ? (
              <span className="text-warning-strong">
                {formatarContagem(outros)} {pluralizar(outros, 'item', 'itens')} com status fora do padrão
              </span>
            ) : semFiltro ? (
              'Exibindo todos os status'
            ) : (
              'Clique para ver todos'
            )
          }
        />
      </button>

      {STATUS_LIST.map((status) => {
        const meta = STATUS_META[status];
        const qtd = porStatus[status] ?? 0;
        const pct = toNumero(percentual(qtd, total));
        const ativo = statusFiltro === status;
        const t = TONE[meta.tone] ?? TONE.brand;

        return (
          <button
            key={status}
            type="button"
            onClick={() => onSelecionarStatus(ativo ? null : status)}
            aria-pressed={ativo}
            title={meta.description}
            className={cn(
              CARD_BASE,
              'hover:border-line-strong',
              ativo ? cn('border-transparent ring-2', t.ring) : 'border-line',
            )}
          >
            <CardConteudo
              label={meta.label}
              valor={qtd}
              icone={ICONE_STATUS[status]}
              tone={meta.tone}
              pct={pct}
              rodape={
                <>
                  <span className="font-medium tabular-nums text-fg-muted">{Math.round(pct)}%</span> do total
                  <span className="hidden sm:inline"> · {meta.description}</span>
                </>
              }
            />
          </button>
        );
      })}
    </section>
  );
}
