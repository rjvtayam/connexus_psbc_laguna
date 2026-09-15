import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';

interface EmergencyButtonProps {
  onClick: () => void;
  onDismiss?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function EmergencyButton({ onClick, onDismiss, disabled, compact }: EmergencyButtonProps) {
  const { isEmergency, emergencyTriggeredBySid } = useSessionStore();
  const { user } = useAuthStore();
  const mySid = useSocket().socket?.id;
  const isAdmin = user?.role === 'admin';
  const isTriggerer = isEmergency && (mySid === emergencyTriggeredBySid || isAdmin);

  if (isEmergency && isTriggerer) {
    return (
      <button
        onClick={onDismiss}
        className="flex items-center gap-1.5 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-xs transition-colors duration-200 bg-white/15 hover:bg-white/25 text-white border border-white/20"
      >
        <X size={13} />
        <span className={compact ? 'hidden sm:inline' : ''}>{compact ? 'Dismiss' : 'Dismiss'}</span>
        {compact && <span className="sm:hidden"><X size={13} /></span>}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isEmergency}
      data-demo="btn-emergency"
      className={`flex items-center gap-1.5 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-xs transition-colors duration-200 ${
        disabled || isEmergency
          ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
          : 'bg-red-600 hover:bg-red-700 text-white'
      }`}
      title={disabled ? 'Disabled during Live Portal' : isEmergency ? 'Emergency already active' : 'Emergency Broadcast'}
    >
      <AlertTriangle size={13} />
      {!compact && 'Emergency'}
    </button>
  );
}

export function EmergencyAlert() {
  const { emergencyMessage, emergencyTriggeredBy, emergencyTriggeredByRole, emergencyTriggeredBySid, emergencyCampus, emergencyCampusOnly, setEmergency } = useSessionStore();
  const { user } = useAuthStore();
  const { emit } = useSocket();
  const mySid = useSocket().socket?.id;
  const isAdmin = user?.role === 'admin';
  const isTriggerer = mySid === emergencyTriggeredBySid || isAdmin;

  useEffect(() => {
    console.log('%c[EmergencyAlert] ✅ MOUNTED — Banner is now visible!', 'color: red; font-weight: bold; font-size: 14px;', {
      message: emergencyMessage,
      triggeredBy: emergencyTriggeredBy,
      campus: emergencyCampus,
      campusOnly: emergencyCampusOnly,
    });
    return () => console.log('[EmergencyAlert] unmounted');
  }, []);

  const handleDismiss = () => {
    emit('emergency_dismiss');
    setEmergency(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-600 via-red-700 to-red-600 border-b border-red-500/50 shadow-[0_4px_20px_rgba(220,38,38,0.4)] animate-pulse-slow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: icon + info */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-white animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide">EMERGENCY BROADCAST</h3>
                {emergencyCampusOnly && emergencyCampus && (
                  <span className="text-[10px] text-red-200 font-semibold bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                    {emergencyCampus} Only
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {emergencyTriggeredBy && (
                  <p className="text-[11px] sm:text-xs text-red-200 truncate">
                    <span className="text-white font-semibold">{emergencyTriggeredBy}</span>
                    {emergencyTriggeredByRole && (
                      <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{emergencyTriggeredByRole}</span>
                    )}
                  </p>
                )}
                <span className="text-[11px] sm:text-xs text-red-100 truncate">
                  {emergencyMessage || "Please pay attention to the principal's announcement"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: dismiss button */}
          {isTriggerer && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-colors duration-200 backdrop-blur-sm border border-white/20 text-xs sm:text-sm"
            >
              <X size={14} />
              <span className="hidden sm:inline">Dismiss</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
