import { useEffect, useRef, useState } from 'react'
import * as db from '../lib/db'
import type { AssistantChatMessage } from '../lib/db'
import { useToast } from '../context/ToastContext'
import { IconSparkles } from './icons'

interface Props {
  /** Negocio seleccionado en el tablero, para aterrizar las respuestas. */
  businessId?: string | null
  businessName?: string | null
}

const SUGGESTIONS = [
  '¿Qué trámites me faltan para abrir?',
  '¿En qué orden hago mis trámites?',
  '¿Cuál es mi trámite más urgente?',
  '¿Qué necesito para vender alcohol?',
]

const GRADIENT = 'linear-gradient(135deg,#6d5efc,#4d38d4)'

/** Íconos locales mínimos (el set global no incluye enviar/cerrar). */
function IconSend(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  )
}
function IconClose(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export default function AssistantChat({ businessId, businessName }: Props) {
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Autoscroll al último mensaje.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, open])

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return
    const next: AssistantChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await db.sendAssistantMessage({ businessId, messages: next })
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pude responder en este momento.'
      notify(msg, 'error')
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Lo siento, tuve un problema para responder. Intenta de nuevo.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  // --- Botón flotante (cerrado) ---
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir Asesor IA"
        className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow transition hover:scale-105 active:scale-95"
        style={{ backgroundImage: GRADIENT }}
      >
        <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ backgroundImage: GRADIENT }} />
        <IconSparkles width={24} height={24} className="relative" />
        <span className="absolute -top-1 -right-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-brand-700 shadow">
          IA
        </span>
      </button>
    )
  }

  // --- Panel de chat (abierto) ---
  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(72vh,580px)] w-[min(92vw,384px)] flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl animate-fade-in">
      {/* Encabezado */}
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundImage: GRADIENT }}>
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/15">
          <IconSparkles width={20} height={20} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-display text-sm font-bold">Asesor CumplIA</div>
          <div className="truncate text-[11px] text-white/75">
            {businessName ? `Sobre: ${businessName}` : 'IA de cumplimiento regulatorio'}
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="grid h-8 w-8 flex-none place-items-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <IconClose />
        </button>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-ink-50/60 p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-ink-700 shadow-sm">
              👋 Hola, soy tu asesor de cumplimiento. Pregúntame sobre tus trámites, vigencias o qué
              hacer primero{businessName ? ` en ${businessName}` : ''}.
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm text-white shadow-sm'
                  : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm text-ink-800 shadow-sm'
              }
              style={m.role === 'user' ? { backgroundImage: GRADIENT } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
            </div>
          </div>
        )}
      </div>

      {/* Entrada */}
      <div className="border-t border-ink-100 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Escribe tu pregunta…"
            className="max-h-28 flex-1 resize-none rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            aria-label="Enviar"
            className="grid h-10 w-10 flex-none place-items-center rounded-xl text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundImage: GRADIENT }}
          >
            <IconSend />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-ink-400">
          Guía orientativa · no sustituye asesoría legal
        </p>
      </div>
    </div>
  )
}
