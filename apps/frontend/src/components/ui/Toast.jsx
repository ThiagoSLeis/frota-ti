import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/cn.js';
import { ToastContext } from '../../hooks/useToast.js';
import { IconAlertCircle, IconCheckCircle, IconClose, IconInfo } from '../icons.jsx';


const MAX_VISIVEIS = 4;
const DURACAO_PADRAO = { sucesso: 4000, info: 4000, erro: 6000 };

const ESTILOS = {
  sucesso: { icone: IconCheckCircle, borda: 'border-l-success', cor: 'text-success' },
  erro: { icone: IconAlertCircle, borda: 'border-l-danger', cor: 'text-danger' },
  info: { icone: IconInfo, borda: 'border-l-info', cor: 'text-info' },
};

let sequencia = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remover = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((lista) => lista.filter((t) => t.id !== id));
  }, []);

  const agendar = useCallback(
    (id, duracao) => {
      clearTimeout(timers.current.get(id));
      if (duracao > 0 && Number.isFinite(duracao)) {
        timers.current.set(
          id,
          setTimeout(() => remover(id), duracao),
        );
      }
    },
    [remover],
  );

  const pausar = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const adicionar = useCallback(
    (tipo, mensagem, opts = {}) => {
      const id = ++sequencia;
      const duracao = opts.duracao ?? DURACAO_PADRAO[tipo];
      const item = { id, tipo, mensagem: String(mensagem ?? ''), titulo: opts.titulo, duracao };

      setToasts((lista) => {
        const proxima = [...lista, item];
        for (const antigo of proxima.slice(0, Math.max(proxima.length - MAX_VISIVEIS, 0))) {
          clearTimeout(timers.current.get(antigo.id));
          timers.current.delete(antigo.id);
        }
        return proxima.slice(-MAX_VISIVEIS);
      });
      agendar(id, duracao);
      return id;
    },
    [agendar],
  );

  useEffect(() => {
    const mapa = timers.current;
    return () => {
      for (const timer of mapa.values()) clearTimeout(timer);
      mapa.clear();
    };
  }, []);

  const api = useMemo(
    () => ({
      sucesso: (mensagem, opts) => adicionar('sucesso', mensagem, opts),
      erro: (mensagem, opts) => adicionar('erro', mensagem, opts),
      info: (mensagem, opts) => adicionar('info', mensagem, opts),
      remover,
    }),
    [adicionar, remover],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-relevant="additions"
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col gap-2 p-4',
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
          'sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-auto sm:w-[380px] sm:p-5',
        )}
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onClose={() => remover(toast.id)}
            onPause={() => pausar(toast.id)}
            onResume={() => agendar(toast.id, toast.duracao)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose, onPause, onResume }) {
  const estilo = ESTILOS[toast.tipo] ?? ESTILOS.info;
  const Icone = estilo.icone;

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-card border border-l-4 border-line',
        'bg-surface py-3 pr-2 pl-3.5 shadow-pop dark:bg-surface-raised',
        estilo.borda,
      )}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
    >
      <Icone className={cn('mt-0.5 size-5 shrink-0', estilo.cor)} />
      <div className="min-w-0 flex-1 pt-px">
        {toast.titulo ? <p className="text-sm font-semibold text-fg">{toast.titulo}</p> : null}
        <p className={cn('text-sm break-words', toast.titulo ? 'mt-0.5 text-fg-muted' : 'text-fg')}>
          {toast.mensagem}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar notificação"
        title="Fechar"
        className="-my-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <IconClose className="size-4" />
      </button>
    </div>
  );
}
