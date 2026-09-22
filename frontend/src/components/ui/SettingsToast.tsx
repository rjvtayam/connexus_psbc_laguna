import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type SettingsToastVariant = 'toggle' | 'success' | 'error';

interface SettingsToastEvent {
  id: number;
  label: string;
  enabled?: boolean;
  variant: SettingsToastVariant;
}

let globalId = 0;
let listeners: Array<(e: SettingsToastEvent) => void> = [];

function emit(e: Omit<SettingsToastEvent, 'id'>) {
  const event = { ...e, id: ++globalId };
  listeners.forEach((fn) => fn(event));
}

export function pushSettingsToast(label: string, enabled: boolean) {
  emit({ label, enabled, variant: 'toggle' });
}

export function pushAccountToast(message: string, type: 'success' | 'error') {
  emit({ label: message, variant: type });
}

export function SettingsToast() {
  const [events, setEvents] = useState<SettingsToastEvent[]>([]);

  const addEvent = useCallback((e: SettingsToastEvent) => {
    setEvents((prev) => [...prev.slice(-2), e]);
    const duration = e.variant === 'toggle' ? 2000 : 3500;
    setTimeout(() => {
      setEvents((prev) => prev.filter((x) => x.id !== e.id));
    }, duration);
  }, []);

  useEffect(() => {
    listeners.push(addEvent);
    return () => { listeners = listeners.filter((fn) => fn !== addEvent); };
  }, [addEvent]);

  const dismiss = (id: number) => {
    setEvents((prev) => prev.filter((x) => x.id !== id));
  };

  if (events.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] flex flex-col gap-2 pointer-events-none">
      {events.map((e) => {
        if (e.variant === 'success' || e.variant === 'error') {
          const isSuccess = e.variant === 'success';
          return (
            <div
              key={e.id}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full border backdrop-blur-md shadow-xl animate-slide-up ${
                isSuccess
                  ? 'border-emerald-500/40 bg-emerald-950/95 shadow-emerald-500/20'
                  : 'border-rose-500/40 bg-rose-950/95 shadow-rose-500/20'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              ) : (
                <XCircle size={14} className="text-rose-400 shrink-0" />
              )}
              <span className={`text-xs font-medium ${isSuccess ? 'text-emerald-100' : 'text-rose-100'}`}>
                {e.label}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isSuccess ? 'OK' : 'Failed'}
              </span>
              <button
                onClick={() => dismiss(e.id)}
                className={`ml-1 p-0.5 rounded hover:bg-white/10 transition-colors ${isSuccess ? 'text-emerald-500 hover:text-emerald-200' : 'text-rose-500 hover:text-rose-200'}`}
              >
                <X size={10} />
              </button>
            </div>
          );
        }
        return (
          <div
            key={e.id}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-gray-700/60 bg-gray-800/95 backdrop-blur-md shadow-xl animate-slide-up"
          >
            <CheckCircle2 size={14} className={e.enabled ? 'text-green-400' : 'text-gray-500'} />
            <span className="text-xs font-medium text-white">{e.label}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${e.enabled ? 'text-green-400' : 'text-gray-500'}`}>
              {e.enabled ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={() => dismiss(e.id)}
              className="ml-1 p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
