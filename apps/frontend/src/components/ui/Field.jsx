import { forwardRef, useId } from 'react';

import { cn } from '../../lib/cn.js';
import { IconAlertCircle, IconChevronDown } from '../icons.jsx';

const CONTROL =
  'block w-full rounded-control border bg-surface text-sm text-fg shadow-sm ' +
  'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 ' +
  'focus:outline-none focus-visible:outline-none focus:ring-3 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle ' +
  'dark:bg-surface-raised dark:shadow-none';

const CONTROL_OK = 'border-line-strong hover:border-fg-subtle focus:border-brand-500 focus:ring-brand-500/20';
const CONTROL_ERRO = 'border-danger focus:border-danger focus:ring-danger/20';

function FieldShell({ id, label, error, hint, required, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-erro`} className="flex items-start gap-1.5 text-[13px] text-danger-strong">
          <IconAlertCircle className="mt-px size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-dica`} className="text-[13px] text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function useFieldIds(idProp, error, hint, describedByProp) {
  const autoId = useId();
  const id = idProp ?? `campo-${autoId.replace(/:/g, '')}`;
  const describedBy =
    [describedByProp, error ? `${id}-erro` : hint ? `${id}-dica` : null].filter(Boolean).join(' ') ||
    undefined;
  return { id, describedBy };
}

export const Input = forwardRef(function Input(
  { id: idProp, label, error, hint, required, className, ...props },
  ref,
) {
  const { id, describedBy } = useFieldIds(idProp, error, hint, props['aria-describedby']);

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <input
        {...props}
        ref={ref}
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL, error ? CONTROL_ERRO : CONTROL_OK, 'h-10 px-3')}
      />
    </FieldShell>
  );
});

export function Select({
  id: idProp,
  label,
  error,
  hint,
  required,
  options = [],
  placeholder,
  className,
  ...props
}) {
  const { id, describedBy } = useFieldIds(idProp, error, hint, props['aria-describedby']);

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        <select
          {...props}
          id={id}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL,
            error ? CONTROL_ERRO : CONTROL_OK,
            'h-10 cursor-pointer appearance-none pr-9 pl-3',
          )}
        >
          {placeholder !== undefined ? (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          ) : null}
          {options.map((opcao) => (
            <option key={opcao.value} value={opcao.value} disabled={opcao.disabled}>
              {opcao.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle" />
      </div>
    </FieldShell>
  );
}
