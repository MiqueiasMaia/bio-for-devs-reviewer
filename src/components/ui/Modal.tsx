import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** 'default' (max-w-lg) fits simple forms; 'wide' (max-w-3xl) is for
   * content with its own internal rows/actions (tables, cards with
   * buttons) that would otherwise clip in a narrow panel. */
  size?: 'default' | 'wide'
}

export function Modal({ open, onClose, title, children, size = 'default' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'max-h-[85vh] w-full overflow-y-auto rounded-xl border border-line bg-white p-6 shadow-lg',
          size === 'wide' ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-mut hover:bg-bg focus-visible:outline-2 focus-visible:outline-include"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
