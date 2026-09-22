import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Megaphone, Info, X } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

export interface NotificationEvent {
  id: number;
  title: string;
  message: string;
  type: 'bulletin' | 'emergency' | 'info';
  created_by: string;
}

let globalId = 0;
let listeners: Set<(e: NotificationEvent) => void> = new Set();

export function pushNotification(event: Omit<NotificationEvent, 'id'>) {
  if (!useSettingsStore.getState().notifications) return;
  const e = { ...event, id: ++globalId };
  listeners.forEach((fn) => fn(e));
}

export function NotificationToast() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const listenerRef = useRef<(e: NotificationEvent) => void>();

  const addEvent = useCallback((e: NotificationEvent) => {
    setEvents((prev) => [...prev.slice(-4), e]);
    setTimeout(() => {
      setEvents((prev) => prev.filter((x) => x.id !== e.id));
    }, 5000);
  }, []);

  useEffect(() => {
    listenerRef.current = addEvent;
    listeners.add(addEvent);
    return () => {
      listeners.delete(addEvent);
    };
  }, [addEvent]);

  const dismiss = (id: number) => {
    setEvents((prev) => prev.filter((x) => x.id !== id));
  };

  if (events.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[95] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {events.map((e) => {
        const config = e.type === 'emergency'
          ? { bg: 'bg-red-500/15 border-red-500/40', icon: <AlertTriangle size={14} className="text-red-400" />, accent: 'text-red-400' }
          : e.type === 'bulletin'
          ? { bg: 'bg-blue-500/15 border-blue-500/40', icon: <Megaphone size={14} className="text-blue-400" />, accent: 'text-blue-400' }
          : { bg: 'bg-gray-500/15 border-gray-500/40', icon: <Info size={14} className="text-gray-400" />, accent: 'text-gray-400' };

        return (
          <div
            key={e.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg ${config.bg} animate-slide-in-right`}
          >
            <div className="mt-0.5 flex-shrink-0">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`text-xs font-bold ${config.accent}`}>{e.title}</h4>
                <span className="text-[9px] text-gray-500">by {e.created_by}</span>
              </div>
              {e.message && (
                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{e.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(e.id)}
              className="mt-0.5 p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
