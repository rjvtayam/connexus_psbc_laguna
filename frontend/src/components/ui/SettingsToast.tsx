import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SettingsToastEvent {
  id: number;
  label: string;
  enabled: boolean;
}

let globalId = 0;
let listeners: Array<(e: SettingsToastEvent) => void> = [];

export function pushSettingsToast(label: string, enabled: boolean) {
  const e = { id: ++globalId, label, enabled };
  listeners.forEach((fn) => fn(e));
}

export function SettingsToast() {
  const [events, setEvents] = useState<SettingsToastEvent[]>([]);

  const addEvent = useCallback((e: SettingsToastEvent) => {
    setEvents((prev) => [...prev.slice(-2), e]);
    setTimeout(() => {
      setEvents((prev) => prev.filter((x) => x.id !== e.id));
    }, 2000);
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
      {events.map((e) => (
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
      ))}
    </div>
  );
}
