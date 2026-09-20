import { forwardRef } from 'react';

import { cn } from '../../lib/cn.js';
import { Spinner } from './Spinner.jsx';

const BASE =
  'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium ' +
  'select-none transition-[background-color,border-color,color,box-shadow] duration-150 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 ' +
    'dark:bg-brand-500 dark:hover:bg-brand-400 dark:active:bg-brand-600 dark:shadow-none',
  secondary:
    'border border-line-strong bg-surface text-fg shadow-sm hover:bg-surface-muted active:bg-surface-muted ' +
    'dark:bg-surface-raised dark:shadow-none dark:hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg active:bg-surface-muted',
  danger:
    'bg-danger text-white shadow-sm hover:brightness-95 active:brightness-90 dark:shadow-none dark:hover:brightness-110',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
};

const ICON_SIZES = {
  sm: 'size-8',
  md: 'size-10',
};

export const Button = forwardRef(function Button(
  {
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  className,
  children,
  type = 'button',
  disabled,
  ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant] ?? VARIANTS.primary, SIZES[size] ?? SIZES.md, className)}
      {...props}
    >
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {iconLeft ? <span className="inline-flex shrink-0 [&>svg]:size-4">{iconLeft}</span> : null}
        {children}
        {iconRight ? <span className="inline-flex shrink-0 [&>svg]:size-4">{iconRight}</span> : null}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size === 'sm' ? 'sm' : 'md'} />
        </span>
      ) : null}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton(
  {
  label,
  children,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant] ?? VARIANTS.ghost,
        ICON_SIZES[size] ?? ICON_SIZES.md,
        'p-0 [&>svg]:size-[18px]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
