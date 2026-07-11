import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { IconAlert, IconCheck } from '../components/icons'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const ToastContext = createContext<{ notify: (message: string, kind?: ToastKind) => void } | undefined>(
  undefined,
)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++counter
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-fade-in ${
              t.kind === 'success'
                ? 'bg-verde-dark text-white'
                : t.kind === 'error'
                  ? 'bg-rojo-dark text-white'
                  : 'bg-slate-900 text-white'
            }`}
          >
            {t.kind === 'error' ? <IconAlert width={16} height={16} /> : <IconCheck width={16} height={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
