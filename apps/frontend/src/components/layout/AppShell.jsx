import { useEffect } from 'react';
import { cn } from '../../lib/cn.js';

export function AppShell({ sidebar, topbar, children, sidebarOpen = false, onCloseSidebar }) {
  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseSidebar?.();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sidebarOpen, onCloseSidebar]);

  return (
    <div className="flex min-h-dvh bg-canvas text-fg">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        Pular para o conteúdo
      </a>

      <aside
        aria-label="Navegação principal"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:flex lg:flex-col"
      >
        {sidebar}
      </aside>

      <div
        className={cn('fixed inset-0 z-50 lg:hidden', sidebarOpen ? 'visible' : 'invisible pointer-events-none')}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        aria-hidden={!sidebarOpen}
      >
        <div
          aria-hidden="true"
          onClick={onCloseSidebar}
          className={cn(
            'absolute inset-0 bg-overlay transition-opacity duration-200 motion-reduce:transition-none',
            sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface shadow-xl',
            'transition-transform duration-200 ease-out motion-reduce:transition-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebar}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {topbar}
        <main id="conteudo-principal" tabIndex={-1} className="flex-1 focus:outline-none">
          <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
