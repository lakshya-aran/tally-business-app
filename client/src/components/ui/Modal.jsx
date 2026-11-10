import { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from './Button';
import { cn } from '../../utils/cn';

/**
 * Accessible modal built on the native <dialog> element:
 * focus trapping, Esc-to-close and the backdrop come from the browser.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => e.target === ref.current && onClose?.()}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-[2px]',
        'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
        widths[size]
      )}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 id="modal-title" className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-3 sm:flex-row sm:justify-end dark:border-slate-800">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </Modal>
  );
}
