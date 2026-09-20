import { STATUS_LIST, STATUS_META } from '@frota/shared';
import { cn } from '../../lib/cn.js';
import { formatarContagem, percentual, pluralizar } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { IconLaptop, IconLayers, IconPlus, IconSheet, IconUsers, IconDashboard } from '../icons.jsx';

const TONE_BAR = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const NAV_FUTURO = [
  { label: 'Relatórios', icon: IconDashboard },
  { label: 'Colaboradores', icon: IconUsers },
];

function toNumero(valor) {
  return Number.parseFloat(valor) || 0;
}

export function Sidebar({ resumo, onNovo }) {
  const total = resumo?.total ?? 0;
  const porStatus = resumo?.porStatus ?? {};

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5">
      <div className="flex items-center gap-3 px-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
          <IconLaptop className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">Frota de TI</p>
          <p className="truncate text-xs text-fg-muted">Gestão de equipamentos</p>
        </div>
      </div>

      <nav aria-label="Seções">
        <ul className="space-y-1">
          <li>
            <a
              href="#conteudo-principal"
              aria-current="page"
              className="flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-brand-950 dark:text-brand-200"
            >
              <IconLayers className="size-4" aria-hidden="true" />
              Inventário
            </a>
          </li>
          {NAV_FUTURO.map(({ label, icon: Icon }) => (
            <li key={label}>
              <span
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-subtle"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <span className="rounded-full border border-line px-1.5 py-px text-[10px] font-medium uppercase tracking-wide">
                  breve
                </span>
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="sidebar-resumo" className="rounded-xl border border-line bg-surface-muted p-3">
        <div className="flex items-baseline justify-between">
          <h2 id="sidebar-resumo" className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Resumo
          </h2>
          <span className="text-xs tabular-nums text-fg-muted">
            {formatarContagem(total)} {pluralizar(total, 'item', 'itens')}
          </span>
        </div>

        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
          {STATUS_LIST.map((status) => (
            <span
              key={status}
              className={cn('h-full transition-[width] duration-300', TONE_BAR[STATUS_META[status].tone])}
              style={{ width: `${toNumero(percentual(porStatus[status] ?? 0, total))}%` }}
            />
          ))}
        </div>

        <ul className="mt-3 space-y-1.5">
          {STATUS_LIST.map((status) => {
            const meta = STATUS_META[status];
            const qtd = porStatus[status] ?? 0;
            return (
              <li key={status} className="flex items-center gap-2 text-xs">
                <span className={cn('size-2 shrink-0 rounded-full', TONE_BAR[meta.tone])} aria-hidden="true" />
                <span className="flex-1 truncate text-fg-muted">{meta.label}</span>
                <span className="font-medium tabular-nums text-fg">{qtd}</span>
                <span className="w-9 text-right tabular-nums text-fg-subtle">
                  {Math.round(toNumero(percentual(qtd, total)))}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <Button onClick={onNovo} iconLeft={<IconPlus className="size-4" aria-hidden="true" />} className="w-full">
        Novo equipamento
      </Button>

      <p className="mt-auto flex items-center gap-2 px-2 text-xs text-fg-subtle">
        <IconSheet className="size-4" aria-hidden="true" />
        Dados: Google Sheets
      </p>
    </div>
  );
}
