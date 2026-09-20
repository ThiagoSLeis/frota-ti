import { cn } from '../../lib/cn.js';
import { iniciais } from '../../lib/format.js';
import { Button, IconButton } from '../ui/Button.jsx';
import { StatusBadge } from '../ui/Badge.jsx';
import { Skeleton, TableSkeleton } from '../ui/Skeleton.jsx';
import { EmptyState } from '../ui/States.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { IconEdit, IconInbox, IconPlus, IconSearch, IconTrash } from '../icons.jsx';

function Responsavel({ nome }) {
  if (!nome) {
    return <span className="text-sm italic text-fg-subtle">— não atribuído —</span>;
  }
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200"
        aria-hidden="true"
      >
        {iniciais(nome)}
      </span>
      <span className="truncate text-sm text-fg">{nome}</span>
    </span>
  );
}

function Patrimonio({ valor }) {
  return (
    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[13px] tabular-nums text-fg">
      {valor}
    </span>
  );
}

function Acoes({ equipamento, onEditar, onRemover, removendoId }) {
  const removendo = removendoId === equipamento.id;
  const nome = equipamento.modelo || equipamento.patrimonio || equipamento.id;

  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton
        label={`Editar ${nome}`}
        variant="ghost"
        size="sm"
        onClick={() => onEditar(equipamento)}
        disabled={removendo}
      >
        <IconEdit className="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton
        label={removendo ? `Removendo ${nome}` : `Remover ${nome}`}
        variant="ghost"
        size="sm"
        className="text-danger-strong hover:bg-danger-soft hover:text-danger-strong"
        onClick={() => onRemover(equipamento)}
        disabled={removendo}
        aria-busy={removendo || undefined}
      >
        {removendo ? <Spinner size="sm" /> : <IconTrash className="size-4" aria-hidden="true" />}
      </IconButton>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <ul className="divide-y divide-line md:hidden" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="space-y-3 p-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </li>
      ))}
    </ul>
  );
}

const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted';

export function EquipamentosTable({
  equipamentos,
  carregando,
  atualizando,
  onEditar,
  onRemover,
  removendoId,
  busca,
  onLimparBusca,
  onNovo,
  total,
  filtroAtivo = false,
}) {
  const lista = equipamentos ?? [];
  const totalGeral = total ?? lista.length;
  const termo = busca?.trim();
  const vazioPorFiltro = lista.length === 0 && totalGeral > 0 && (Boolean(termo) || filtroAtivo);

  let corpo;
  if (carregando) {
    corpo = (
      <>
        <div className="hidden p-4 md:block">
          <TableSkeleton rows={6} columns={6} />
        </div>
        <CardsSkeleton />
      </>
    );
  } else if (lista.length === 0 && vazioPorFiltro) {
    corpo = (
      <EmptyState
        icon={<IconSearch />}
        title="Nenhum resultado encontrado"
        description={
          termo
            ? `Nenhum equipamento corresponde a “${termo}”${filtroAtivo ? ' com o status selecionado' : ''}.`
            : 'Nenhum equipamento com o status selecionado.'
        }
        action={
          <Button variant="secondary" onClick={onLimparBusca}>
            {termo ? 'Limpar busca' : 'Limpar filtros'}
          </Button>
        }
      />
    );
  } else if (lista.length === 0) {
    corpo = (
      <EmptyState
        icon={<IconInbox />}
        title="Nenhum equipamento cadastrado"
        description="Cadastre o primeiro notebook da frota para começar a acompanhar quem está com cada equipamento."
        action={
          <Button onClick={onNovo} iconLeft={<IconPlus className="size-4" aria-hidden="true" />}>
            Cadastrar primeiro equipamento
          </Button>
        }
      />
    );
  } else {
    corpo = (
      <>
        <div className="hidden md:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Lista de equipamentos do inventário</caption>
            <thead className="sticky top-16 z-10 bg-surface-muted/95 backdrop-blur">
              <tr className="border-b border-line">
                <th scope="col" className={cn(TH, 'w-28')}>ID</th>
                <th scope="col" className={TH}>Modelo</th>
                <th scope="col" className={cn(TH, 'w-40')}>Patrimônio</th>
                <th scope="col" className={TH}>Responsável</th>
                <th scope="col" className={cn(TH, 'w-44')}>Status</th>
                <th scope="col" className={cn(TH, 'w-24 text-right')}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lista.map((eq) => (
                <tr
                  key={eq.id}
                  className={cn(
                    'transition-colors hover:bg-surface-muted',
                    removendoId === eq.id && 'opacity-60',
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-fg-muted">{eq.id}</td>
                  <td className="max-w-[18rem] truncate px-4 py-3 font-medium text-fg" title={eq.modelo}>
                    {eq.modelo}
                  </td>
                  <td className="px-4 py-3">
                    <Patrimonio valor={eq.patrimonio} />
                  </td>
                  <td className="max-w-[16rem] px-4 py-3">
                    <Responsavel nome={eq.responsavel} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={eq.status} />
                  </td>
                  <td className="px-4 py-2">
                    <Acoes equipamento={eq} onEditar={onEditar} onRemover={onRemover} removendoId={removendoId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-line md:hidden">
          {lista.map((eq) => (
            <li key={eq.id} className={cn('p-4', removendoId === eq.id && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{eq.modelo}</p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-fg-subtle">{eq.id}</p>
                </div>
                <StatusBadge status={eq.status} />
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
                <dt className="text-xs text-fg-muted">Patrimônio</dt>
                <dd className="min-w-0">
                  <Patrimonio valor={eq.patrimonio} />
                </dd>
                <dt className="text-xs text-fg-muted">Responsável</dt>
                <dd className="min-w-0">
                  <Responsavel nome={eq.responsavel} />
                </dd>
              </dl>
              <div className="mt-3 flex justify-end border-t border-line pt-2">
                <Acoes equipamento={eq} onEditar={onEditar} onRemover={onRemover} removendoId={removendoId} />
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <section
      aria-labelledby="inventario-titulo"
      aria-busy={carregando || atualizando || undefined}
      className="overflow-clip rounded-card border border-line bg-surface shadow-card"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 id="inventario-titulo" className="text-base font-semibold text-fg">
          Inventário
        </h2>
        {!carregando && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium tabular-nums text-fg-muted">
            {lista.length === totalGeral ? totalGeral : `${lista.length} de ${totalGeral}`}
          </span>
        )}
        {atualizando && !carregando && (
          <span className="ml-auto inline-flex items-center gap-2 text-xs text-fg-muted" role="status">
            <Spinner size="sm" />
            atualizando…
          </span>
        )}
      </header>
      {corpo}
    </section>
  );
}
