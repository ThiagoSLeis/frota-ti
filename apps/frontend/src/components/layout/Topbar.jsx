import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn.js';
import { IconButton } from '../ui/Button.jsx';
import { IconMenu, IconMoon, IconRefresh, IconSun } from '../icons.jsx';

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

function tempoRelativo(data, agora) {
  const segundos = Math.round((data.getTime() - agora) / 1000);
  if (Math.abs(segundos) < 45) return 'agora mesmo';
  const minutos = Math.round(segundos / 60);
  if (Math.abs(minutos) < 60) return rtf.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return rtf.format(horas, 'hour');
  return rtf.format(Math.round(horas / 24), 'day');
}

function useAgora(intervaloMs = 30_000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return agora;
}

export function Topbar({
  titulo,
  subtitulo,
  atualizando,
  onRecarregar,
  theme,
  onToggleTheme,
  onAbrirMenu,
  ultimaAtualizacao,
}) {
  const agora = useAgora();
  const escuro = theme === 'dark';

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <IconButton label="Abrir menu" variant="ghost" onClick={onAbrirMenu} className="lg:hidden">
          <IconMenu className="size-5" aria-hidden="true" />
        </IconButton>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-fg sm:text-lg">{titulo}</h1>
          {subtitulo && <p className="hidden truncate text-xs text-fg-muted sm:block">{subtitulo}</p>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {ultimaAtualizacao instanceof Date && (
            <p className="hidden text-xs text-fg-muted md:block" aria-live="polite">
              {atualizando ? (
                'Atualizando…'
              ) : (
                <>
                  Atualizado{' '}
                  <time dateTime={ultimaAtualizacao.toISOString()} title={ultimaAtualizacao.toLocaleString('pt-BR')}>
                    {tempoRelativo(ultimaAtualizacao, agora)}
                  </time>
                </>
              )}
            </p>
          )}

          <IconButton
            label={atualizando ? 'Atualizando dados' : 'Recarregar dados'}
            variant="ghost"
            onClick={onRecarregar}
            disabled={atualizando}
            aria-busy={atualizando || undefined}
          >
            <IconRefresh
              className={cn('size-5', atualizando && 'animate-spin motion-reduce:animate-none')}
              aria-hidden="true"
            />
          </IconButton>

          <IconButton
            label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
            variant="ghost"
            onClick={onToggleTheme}
          >
            {escuro ? (
              <IconSun className="size-5" aria-hidden="true" />
            ) : (
              <IconMoon className="size-5" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>
    </header>
  );
}
