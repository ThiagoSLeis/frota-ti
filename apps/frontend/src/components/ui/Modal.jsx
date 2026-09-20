import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn.js';
import { IconAlertTriangle, IconClose, IconInfo } from '../icons.jsx';
import { Button, IconButton } from './Button.jsx';

const FOCAVEIS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

const pilha = [];
let overflowOriginal = '';

function travarScroll() {
  if (pilha.length === 1) {
    overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
}

function liberarScroll() {
  if (pilha.length === 0) document.body.style.overflow = overflowOriginal;
}

function focaveisDentro(container) {
  return Array.from(container.querySelectorAll(FOCAVEIS)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0,
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  initialFocusRef,
  describedByBody = false,
}) {
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const initialFocusRefRef = useRef(initialFocusRef);
  const baseId = useId().replace(/:/g, '');
  const titleId = `modal-${baseId}-titulo`;
  const descId = `modal-${baseId}-descricao`;
  const bodyId = `modal-${baseId}-corpo`;

  onCloseRef.current = onClose;
  initialFocusRefRef.current = initialFocusRef;

  useEffect(() => {
    if (!open) return undefined;

    const token = {};
    const anterior = document.activeElement;
    pilha.push(token);
    travarScroll();

    const dialog = dialogRef.current;
    const alvo =
      initialFocusRefRef.current?.current ??
      (bodyRef.current ? focaveisDentro(bodyRef.current)[0] : null) ??
      (dialog ? focaveisDentro(dialog)[0] : null) ??
      dialog;
    const frame = requestAnimationFrame(() => alvo?.focus({ preventScroll: true }));

    function onKeyDown(event) {
      if (pilha[pilha.length - 1] !== token || !dialog) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const focaveis = focaveisDentro(dialog);
      if (focaveis.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;

      if (event.shiftKey && (ativo === primeiro || !dialog.contains(ativo))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (ativo === ultimo || !dialog.contains(ativo))) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      const indice = pilha.indexOf(token);
      if (indice !== -1) pilha.splice(indice, 1);
      liberarScroll();
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) {
        anterior.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onCloseRef.current?.();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : describedByBody && children ? bodyId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-pop outline-none',
          'animate-sheet-in rounded-t-2xl sm:animate-modal-in sm:rounded-card',
          'dark:bg-surface-raised',
          SIZES[size] ?? SIZES.md,
        )}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 sm:px-6">
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 id={titleId} className="text-base font-semibold tracking-tight text-fg">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descId} className="mt-1 text-sm text-fg-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Fechar" size="sm" className="-mt-1 -mr-2" onClick={() => onCloseRef.current?.()}>
            <IconClose />
          </IconButton>
        </div>

        {children ? (
          <div ref={bodyRef} id={bodyId} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:pb-3 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

const CONFIRM_TONES = {
  danger: { icone: IconAlertTriangle, circulo: 'bg-danger-soft text-danger-strong', botao: 'danger' },
  primary: { icone: IconInfo, circulo: 'bg-brand-soft text-brand-strong', botao: 'primary' },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  const config = CONFIRM_TONES[tone] ?? CONFIRM_TONES.danger;
  const Icone = config.icone;

  return (
    <Modal
      open={open}
      size="sm"
      onClose={() => {
        if (!loading) onCancel?.();
      }}
      title={title}
      initialFocusRef={cancelRef}
      describedByBody
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={config.botao} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? (
        <div className="flex items-start gap-3">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', config.circulo)}>
            <Icone className="size-5" />
          </span>
          <div className="pt-2 text-sm text-fg-muted">{description}</div>
        </div>
      ) : null}
    </Modal>
  );
}
