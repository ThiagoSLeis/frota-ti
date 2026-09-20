import { cn } from '../../lib/cn.js';

const SIZES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-6',
};

export function Spinner({ size = 'md', className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('spinner animate-spin shrink-0', SIZES[size] ?? SIZES.md, className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
