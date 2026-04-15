'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [clientState, setClientState] = useState<{
    isIOS: boolean;
    isStandalone: boolean;
    isDismissed: boolean;
  } | null>(null);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isDismissed = window.localStorage.getItem(DISMISS_KEY) === '1';

    setClientState({ isIOS, isStandalone, isDismissed });

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const dismissPrompt = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setClientState((prev) => prev ? { ...prev, isDismissed: true } : prev);
  };

  const installApp = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === 'accepted') {
      setInstallEvent(null);
      setClientState((prev) => prev ? { ...prev, isDismissed: true } : prev);
    }
  };

  if (!clientState) return null;
  if (clientState.isStandalone || clientState.isDismissed) return null;
  if (!clientState.isIOS && !installEvent) return null;

  return (
    <div className="rounded-xl border border-[#d0d7e7] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-(--primary)/10 p-2 text-(--primary)">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              install_mobile
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0e121b]">Instalar app móvil</p>
            {clientState.isIOS ? (
              <p className="mt-1 text-xs text-[#4d6599]">
                En iPhone/iPad: toca compartir y luego "Agregar a pantalla de inicio".
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#4d6599]">
                Instálala para abrir más rápido y usar una experiencia tipo app.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={dismissPrompt}
          className="text-[#4d6599] hover:text-[#0e121b]"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            close
          </span>
        </button>
      </div>

      {!clientState.isIOS && installEvent && (
        <button
          type="button"
          onClick={installApp}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-(--primary) px-3 py-2 text-sm font-medium text-white hover:bg-(--primary-dark)"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            download
          </span>
          Instalar
        </button>
      )}
    </div>
  );
}
