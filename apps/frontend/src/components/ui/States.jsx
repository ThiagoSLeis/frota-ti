import { cn } from '../../lib/cn.js';
import { IconAlertTriangle, IconInbox, IconRefresh } from '../icons.jsx';
import { Button } from './Button.jsx';

function Shell({ tone = 'neutral', icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center sm:py-16">
      <span
        className={cn(
          'mb-4 flex size-12 items-center justify-center rounded-full ring-8 [&>svg]:size-6',
          tone === 'danger'
            ? 'bg-danger-soft text-danger-strong ring-danger-soft/50'
            : 'bg-brand-soft text-brand-strong ring-brand-soft/50',
        )}
      >
        {icon}
      </span>
      {title ? <h3 className="text-[15px] font-semibold text-fg">{title}</h3> : null}
      {description ? <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p> : null}
      {children ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <Shell icon={icon ?? <IconInbox />} title={title} description={description}>
      {action}
    </Shell>
  );
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description,
  onRetry,
  retryLabel = 'Tentar novamente',
}) {
  return (
    <div role="alert">
      <Shell tone="danger" icon={<IconAlertTriangle />} title={title} description={description}>
        {onRetry ? (
          <Button variant="secondary" iconLeft={<IconRefresh />} onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </Shell>
    </div>
  );
}
