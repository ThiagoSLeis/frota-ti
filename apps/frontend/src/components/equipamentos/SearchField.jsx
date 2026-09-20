import { useRef } from 'react';
import { formatarContagem, pluralizar } from '../../lib/format.js';
import { IconButton } from '../ui/Button.jsx';
import { IconClose, IconSearch } from '../icons.jsx';

export function SearchField({ value, onChange, total, filtrados }) {
  const inputRef = useRef(null);

  const limpar = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full min-w-0">
      <label htmlFor="busca-equipamentos" className="sr-only">
        Buscar equipamentos
      </label>
      <div className="relative">
        <IconSearch
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="busca-equipamentos"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault();
              onChange('');
            }
          }}
          placeholder="Buscar por responsável ou patrimônio…"
          aria-label="Buscar por responsável ou patrimônio"
          aria-describedby="busca-resultado"
          autoComplete="off"
          spellCheck={false}
          className="h-10 w-full rounded-control border border-line-strong bg-surface pl-9 pr-10 text-sm text-fg shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-fg-subtle hover:border-fg-subtle focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20 dark:bg-surface-raised dark:shadow-none [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <IconButton
            label="Limpar busca"
            variant="ghost"
            size="sm"
            onClick={limpar}
            className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            <IconClose className="size-4" aria-hidden="true" />
          </IconButton>
        )}
      </div>
      <p id="busca-resultado" aria-live="polite" className="mt-1.5 text-xs text-fg-muted">
        Mostrando <span className="font-medium tabular-nums text-fg">{formatarContagem(filtrados)}</span> de{' '}
        <span className="tabular-nums">{formatarContagem(total)} {pluralizar(total, 'equipamento', 'equipamentos')}</span>
      </p>
    </div>
  );
}
