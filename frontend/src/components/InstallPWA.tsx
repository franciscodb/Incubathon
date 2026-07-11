// =====================================================================
// Botón flotante "Instalar app": aparece cuando el navegador dispara el
// evento beforeinstallprompt (PWA instalable). Se oculta tras instalar.
// =====================================================================
import { useEffect, useState } from 'react'
import { IconPlus } from './icons'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferred) return null

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <button
      onClick={install}
      className="btn-primary fixed bottom-20 right-4 z-40 shadow-glow sm:bottom-5"
    >
      <IconPlus width={16} height={16} /> Instalar app
    </button>
  )
}
