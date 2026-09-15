import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronLeft, Video, Monitor,
  Radio, ArrowRight, Check,
  MessageSquare, AlertTriangle, Megaphone, Settings,
  Smile, Hand, Circle
} from 'lucide-react';

interface LiveDemoProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

interface DemoStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  labels: { text: string; target: string; color: string; delay: string }[];
  roles: string[];
}

const demoSteps: DemoStep[] = [
  {
    id: 1,
    title: 'Your Camera Feed',
    description: 'This is your live camera feed. The other campus sees you here. Use the camera button below to toggle it on/off.',
    icon: <Video size={14} />,
    color: 'text-cyan-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Your Camera', target: '[data-demo="local-video"]', color: 'text-cyan-400', delay: '0.1s' },
    ],
  },
  {
    id: 2,
    title: 'Remote Video Area',
    description: 'When the other campus joins, their live feed appears here. This is the main view for intercampus video communication.',
    icon: <Monitor size={14} />,
    color: 'text-purple-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Remote Campus Feed', target: '[data-demo="remote-area"]', color: 'text-purple-400', delay: '0.1s' },
    ],
  },
  {
    id: 3,
    title: 'Your Campus',
    description: 'Shows which campus you are currently connected as. This is auto-detected from your login account.',
    icon: <Radio size={14} />,
    color: 'text-green-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Your Campus', target: '[data-demo="campus-badge"]', color: 'text-green-400', delay: '0.1s' },
    ],
  },
  {
    id: 4,
    title: 'Portal / Meeting Toggle',
    description: 'Switch between PORTAL mode (auto-connect campuses) and IN MEETING mode (private session). Toggle this to control connectivity.',
    icon: <Radio size={14} />,
    color: 'text-amber-400',
    roles: ['admin', 'principal'],
    labels: [
      { text: 'Toggle Mode', target: '[data-demo="portal-toggle"]', color: 'text-amber-400', delay: '0.1s' },
    ],
  },
  {
    id: 5,
    title: 'Video Controls',
    description: 'Toggle your camera on/off, mute/unmute your microphone, or share your screen to present to both campuses.',
    icon: <Settings size={14} />,
    color: 'text-pink-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Camera Toggle', target: '[data-demo="btn-video"]', color: 'text-cyan-400', delay: '0.1s' },
      { text: 'Screen Share', target: '[data-demo="btn-screen"]', color: 'text-pink-400', delay: '0.3s' },
    ],
  },
  {
    id: 6,
    title: 'Reactions',
    description: 'Send emoji reactions during the session. Click the smile icon to pick an emoji — it floats on the video for everyone to see.',
    icon: <Smile size={14} />,
    color: 'text-yellow-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Reaction Picker', target: '[data-demo="btn-reaction"]', color: 'text-yellow-400', delay: '0.1s' },
    ],
  },
  {
    id: 7,
    title: 'Raise Hand',
    description: 'Need attention? Click the hand icon to raise your hand. It shows an amber highlight so others know you want to speak.',
    icon: <Hand size={14} />,
    color: 'text-amber-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Raise Hand', target: '[data-demo="btn-hand"]', color: 'text-amber-400', delay: '0.1s' },
    ],
  },
  {
    id: 8,
    title: 'Emergency Broadcast',
    description: 'Press this button to immediately override ALL campus screens with a red emergency alert. Use only for urgent situations.',
    icon: <AlertTriangle size={14} />,
    color: 'text-red-400',
    roles: ['admin', 'principal'],
    labels: [
      { text: 'Emergency Button', target: '[data-demo="btn-emergency"]', color: 'text-red-400', delay: '0.1s' },
    ],
  },
  {
    id: 9,
    title: 'Chat Panel',
    description: 'Open the chat panel to send messages. You can message everyone or filter by campus (All / Paete / Pagsanjan).',
    icon: <MessageSquare size={14} />,
    color: 'text-blue-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Open Chat', target: '[data-demo="btn-chat"]', color: 'text-blue-400', delay: '0.1s' },
    ],
  },
  {
    id: 10,
    title: 'Notifications & Bulletins',
    description: 'Click the bell to view notifications and post bulletins visible to both campuses.',
    icon: <Megaphone size={14} />,
    color: 'text-emerald-400',
    roles: ['admin', 'principal'],
    labels: [
      { text: 'Notifications', target: '[data-demo="btn-bell"]', color: 'text-emerald-400', delay: '0.1s' },
    ],
  },
  {
    id: 11,
    title: 'Record Meetings',
    description: 'Admin can record the video session. Click the record button to start — the recording uploads automatically when stopped. Check the Recordings page in the sidebar to view and manage them.',
    icon: <Circle size={14} />,
    color: 'text-red-400',
    roles: ['admin'],
    labels: [
      { text: 'Record Button', target: '[data-demo="btn-record"]', color: 'text-red-400', delay: '0.1s' },
    ],
  },
  {
    id: 12,
    title: 'Online Users',
    description: 'Shows how many users are currently connected. Click to see the full list of online users and their campuses.',
    icon: <Settings size={14} />,
    color: 'text-gray-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [
      { text: 'Online Users', target: '[data-demo="online-count"]', color: 'text-gray-400', delay: '0.1s' },
    ],
  },
  {
    id: 13,
    title: 'You\'re All Set!',
    description: 'You now know the essentials. Start communicating between PSBC Paete and PSBC Pagsanjan — in real time.',
    icon: <Check size={14} />,
    color: 'text-green-400',
    roles: ['admin', 'principal', 'teacher', 'staff'],
    labels: [],
  },
];

interface LabelPosition {
  text: string;
  color: string;
  delay: string;
  x: number;
  y: number;
  arrowDir: 'up' | 'down' | 'left' | 'right';
}

function ArrowSVG({ dir, color }: { dir: 'up' | 'down' | 'left' | 'right'; color: string }) {
  const neonGlow = color.includes('cyan')
    ? '0 0 8px rgba(34,211,238,0.6), 0 0 16px rgba(34,211,238,0.3)'
    : color.includes('purple')
    ? '0 0 8px rgba(168,85,247,0.6), 0 0 16px rgba(168,85,247,0.3)'
    : color.includes('amber')
    ? '0 0 8px rgba(251,191,36,0.6), 0 0 16px rgba(251,191,36,0.3)'
    : color.includes('red')
    ? '0 0 8px rgba(239,68,68,0.6), 0 0 16px rgba(239,68,68,0.3)'
    : color.includes('blue')
    ? '0 0 8px rgba(59,130,246,0.6), 0 0 16px rgba(59,130,246,0.3)'
    : color.includes('pink')
    ? '0 0 8px rgba(236,72,153,0.6), 0 0 16px rgba(236,72,153,0.3)'
    : color.includes('green') || color.includes('emerald')
    ? '0 0 8px rgba(34,197,94,0.6), 0 0 16px rgba(34,197,94,0.3)'
    : '0 0 8px rgba(156,163,175,0.6), 0 0 16px rgba(156,163,175,0.3)';

  if (dir === 'up') {
    return (
      <svg width="20" height="26" viewBox="0 0 20 26" fill="none" className={`${color} drop-shadow-lg animate-bounce-arrow`} style={{ filter: `drop-shadow(${neonGlow})` }}>
        <path d="M10 26V6M10 6L3 13M10 6L17 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (dir === 'down') {
    return (
      <svg width="20" height="26" viewBox="0 0 20 26" fill="none" className={`${color} drop-shadow-lg animate-bounce-arrow`} style={{ filter: `drop-shadow(${neonGlow})` }}>
        <path d="M10 0V20M10 20L3 13M10 20L17 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (dir === 'left') {
    return (
      <svg width="26" height="20" viewBox="0 0 26 20" fill="none" className={`${color} drop-shadow-lg animate-bounce-arrow-x`} style={{ filter: `drop-shadow(${neonGlow})` }}>
        <path d="M26 10H6M6 10L13 3M6 10L13 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="26" height="20" viewBox="0 0 26 20" fill="none" className={`${color} drop-shadow-lg animate-bounce-arrow-x`} style={{ filter: `drop-shadow(${neonGlow})` }}>
      <path d="M0 10H20M20 10L13 3M20 10L13 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LiveDemo({ isOpen, onClose, userRole }: LiveDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [labelPositions, setLabelPositions] = useState<LabelPosition[]>([]);

  const filteredSteps = demoSteps.filter(s => s.roles.includes(userRole));
  const step = filteredSteps[currentStep];

  const calculatePositions = useCallback(() => {
    if (!step) return;
    const positions: LabelPosition[] = [];

    step.labels.forEach((label) => {
      const el = document.querySelector(label.target);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let arrowDir: 'up' | 'down' | 'left' | 'right' = 'up';
      let x = cx;
      let y = cy;

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      if (cy > viewportH * 0.6) {
        // Element is in bottom half — put label ABOVE, arrow points DOWN to element
        arrowDir = 'down';
        y = rect.top - 55;
      } else if (cy < viewportH * 0.3) {
        // Element is in top third — put label BELOW, arrow points UP to element
        arrowDir = 'up';
        y = rect.bottom + 55;
      } else if (cx < viewportW * 0.35) {
        // Element is on left — put label to LEFT, arrow points RIGHT to element
        arrowDir = 'right';
        x = rect.left - 20;
      } else if (cx > viewportW * 0.65) {
        // Element is on right — put label to RIGHT, arrow points LEFT to element
        arrowDir = 'left';
        x = rect.right + 20;
      } else {
        // Center — put label ABOVE, arrow points DOWN
        arrowDir = 'down';
        y = rect.top - 55;
      }

      x = Math.max(90, Math.min(viewportW - 90, x));
      y = Math.max(40, Math.min(viewportH - 40, y));

      positions.push({ text: label.text, color: label.color, delay: label.delay, x, y, arrowDir });
    });

    setLabelPositions(positions);
  }, [step]);

  // Determine panel position based on label positions
  const getPanelPosition = () => {
    if (labelPositions.length === 0) return { className: 'bottom-5 left-1/2 -translate-x-1/2' };
    const avgY = labelPositions.reduce((sum, p) => sum + p.y, 0) / labelPositions.length;
    const viewportH = window.innerHeight;
    // If labels are mostly at the bottom, put panel at top
    if (avgY > viewportH * 0.55) {
      return { className: 'top-5 left-1/2 -translate-x-1/2' };
    }
    // If labels are mostly at the right, put panel at left
    const avgX = labelPositions.reduce((sum, p) => sum + p.x, 0) / labelPositions.length;
    const viewportW = window.innerWidth;
    if (avgX > viewportW * 0.6) {
      return { className: 'bottom-5 left-5' };
    }
    return { className: 'bottom-5 left-1/2 -translate-x-1/2' };
  };

  const goNext = useCallback(() => {
    if (currentStep < filteredSteps.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentStep, filteredSteps.length, isAnimating]);

  const goPrev = useCallback(() => {
    if (currentStep > 0 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentStep, isAnimating]);

  useEffect(() => {
    if (!isOpen) setCurrentStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Small delay to let DOM settle after step change
    const t = setTimeout(calculatePositions, 100);
    return () => clearTimeout(t);
  }, [isOpen, currentStep, calculatePositions]);

  // Recalculate on resize
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => calculatePositions();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, calculatePositions]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, goNext, goPrev]);

  if (!isOpen || !step) {
    // Safety: if no matching steps for role, close immediately and mark demo completed
    if (isOpen && !step && filteredSteps.length === 0) {
      onClose();
    }
    return null;
  }

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-gray-950/40 backdrop-blur-[1px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Spotlight glow on targets */}
      {labelPositions.map((pos, i) => {
        const el = document.querySelector(step.labels[i]?.target);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return (
          <div
            key={`glow-${i}`}
            className="fixed z-[152] pointer-events-none animate-pulse"
            style={{
              left: rect.left - 8,
              top: rect.top - 8,
              width: rect.width + 16,
              height: rect.height + 16,
              borderRadius: '12px',
              boxShadow: `0 0 20px 4px ${pos.color.includes('cyan') ? 'rgba(34,211,238,0.3)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.3)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.3)' : pos.color.includes('red') ? 'rgba(239,68,68,0.3)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.3)' : pos.color.includes('green') ? 'rgba(34,197,94,0.3)' : pos.color.includes('emerald') ? 'rgba(16,185,129,0.3)' : 'rgba(156,163,175,0.3)'}`,
            }}
          />
        );
      })}

      {/* Floating labels with arrows */}
      {labelPositions.map((pos, i) => (
        <div
          key={`label-${i}`}
          className="fixed z-[155] pointer-events-none animate-fade-in"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -50%)',
            animationDelay: pos.delay,
          }}
        >
          {/* Layout: arrow → label, or label → arrow depending on direction */}
          {pos.arrowDir === 'down' ? (
            <div className="flex flex-col items-center">
              <ArrowSVG dir="down" color={pos.color} />
              <div className={`px-3 py-1.5 rounded-lg bg-gray-900/95 border text-[11px] font-bold ${pos.color} whitespace-nowrap shadow-2xl backdrop-blur-sm`} style={{ borderColor: pos.color.includes('cyan') ? 'rgba(34,211,238,0.5)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.5)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.5)' : pos.color.includes('red') ? 'rgba(239,68,68,0.5)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.5)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.5)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.5)' : 'rgba(156,163,175,0.5)', boxShadow: `0 0 10px ${pos.color.includes('cyan') ? 'rgba(34,211,238,0.2)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.2)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.2)' : pos.color.includes('red') ? 'rgba(239,68,68,0.2)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.2)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.2)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)'}` }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <span className="relative flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${pos.color.replace('text-', 'bg-')}`} />
                  {pos.text}
                </span>
              </div>
            </div>
          ) : pos.arrowDir === 'up' ? (
            <div className="flex flex-col items-center">
              <div className={`px-3 py-1.5 rounded-lg bg-gray-900/95 border text-[11px] font-bold ${pos.color} whitespace-nowrap shadow-2xl backdrop-blur-sm`} style={{ borderColor: pos.color.includes('cyan') ? 'rgba(34,211,238,0.5)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.5)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.5)' : pos.color.includes('red') ? 'rgba(239,68,68,0.5)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.5)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.5)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.5)' : 'rgba(156,163,175,0.5)', boxShadow: `0 0 10px ${pos.color.includes('cyan') ? 'rgba(34,211,238,0.2)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.2)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.2)' : pos.color.includes('red') ? 'rgba(239,68,68,0.2)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.2)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.2)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)'}` }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <span className="relative flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${pos.color.replace('text-', 'bg-')}`} />
                  {pos.text}
                </span>
              </div>
              <ArrowSVG dir="up" color={pos.color} />
            </div>
          ) : pos.arrowDir === 'left' ? (
            <div className="flex items-center">
              <div className={`px-3 py-1.5 rounded-lg bg-gray-900/95 border text-[11px] font-bold ${pos.color} whitespace-nowrap shadow-2xl backdrop-blur-sm`} style={{ borderColor: pos.color.includes('cyan') ? 'rgba(34,211,238,0.5)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.5)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.5)' : pos.color.includes('red') ? 'rgba(239,68,68,0.5)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.5)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.5)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.5)' : 'rgba(156,163,175,0.5)', boxShadow: `0 0 10px ${pos.color.includes('cyan') ? 'rgba(34,211,238,0.2)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.2)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.2)' : pos.color.includes('red') ? 'rgba(239,68,68,0.2)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.2)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.2)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)'}` }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <span className="relative flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${pos.color.replace('text-', 'bg-')}`} />
                  {pos.text}
                </span>
              </div>
              <ArrowSVG dir="left" color={pos.color} />
            </div>
          ) : (
            <div className="flex items-center">
              <ArrowSVG dir="right" color={pos.color} />
              <div className={`px-3 py-1.5 rounded-lg bg-gray-900/95 border text-[11px] font-bold ${pos.color} whitespace-nowrap shadow-2xl backdrop-blur-sm`} style={{ borderColor: pos.color.includes('cyan') ? 'rgba(34,211,238,0.5)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.5)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.5)' : pos.color.includes('red') ? 'rgba(239,68,68,0.5)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.5)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.5)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.5)' : 'rgba(156,163,175,0.5)', boxShadow: `0 0 10px ${pos.color.includes('cyan') ? 'rgba(34,211,238,0.2)' : pos.color.includes('purple') ? 'rgba(168,85,247,0.2)' : pos.color.includes('amber') ? 'rgba(251,191,36,0.2)' : pos.color.includes('red') ? 'rgba(239,68,68,0.2)' : pos.color.includes('blue') ? 'rgba(59,130,246,0.2)' : pos.color.includes('pink') ? 'rgba(236,72,153,0.2)' : pos.color.includes('green') || pos.color.includes('emerald') ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)'}` }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <span className="relative flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${pos.color.replace('text-', 'bg-')}`} />
                  {pos.text}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Floating control panel */}
      <div
        className={`fixed z-[160] transition-all duration-500 ${
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } ${getPanelPosition().className}`}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-800/60 shadow-2xl shadow-black/50 overflow-hidden w-[calc(100vw-2rem)] sm:min-w-[480px] sm:max-w-[560px]">
          {/* Top accent line */}
          <div className="h-0.5 bg-gradient-to-r from-primary-500/60 via-cyan-400/80 to-primary-500/60" />

          <div className="p-3 sm:p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/20 flex items-center justify-center ${step.color}`}>
                  {step.icon}
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                    Step {currentStep + 1} / {filteredSteps.length}
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">{step.title}</h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all"
                title="Skip demo"
              >
                <X size={14} />
              </button>
            </div>

            {/* Description */}
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3 pl-[42px]">
              {step.description}
            </p>

            {/* Active label chips */}
            {step.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 pl-[42px]">
                {step.labels.map((l, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-800/80 border border-gray-700/50 ${l.color} animate-fade-in`}
                    style={{ animationDelay: l.delay }}
                  >
                    {l.text}
                  </span>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800/60">
              <button
                onClick={goPrev}
                disabled={currentStep === 0}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>

              <div className="flex items-center gap-1">
                {filteredSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'bg-primary-500 w-4'
                        : i < currentStep
                        ? 'bg-primary-500/50 w-1.5'
                        : 'bg-gray-700 w-1.5'
                    }`}
                  />
                ))}
              </div>

              {currentStep < filteredSteps.length - 1 ? (
                <button
                  onClick={goNext}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors whitespace-nowrap"
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors whitespace-nowrap"
                >
                  Finish <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
