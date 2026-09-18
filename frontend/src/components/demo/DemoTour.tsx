import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronLeft, Video, Monitor, Shield,
  Mic, ScreenShare, Bell, Sparkles, AlertTriangle,
  Megaphone, Volume2, MessageSquare, Radio, LogIn, ArrowRight, Check,
  Building2, EyeOff, Smile, Hand, Circle
} from 'lucide-react';

interface DemoTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  mockup: React.ReactNode;
  labels: { text: string; x: string; y: string; color: string; delay: string }[];
}

const tourSteps: Omit<TourStep, 'mockup'>[] = [
  {
    id: 1,
    title: 'Welcome to Here to There',
    subtitle: 'Your Intercampus Live Video Portal',
    description: 'A dedicated platform connecting PSBC Paete and PSBC Pagsanjan in real-time. Let us show you how it works.',
    icon: <Sparkles size={28} />,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
    borderColor: 'border-primary-500/30',
    labels: [],
  },
  {
    id: 2,
    title: 'Secure Login',
    subtitle: 'Role-Based Authentication',
    description: 'Each user logs in with their email and password. The system recognizes your campus and role — Admin, Principal, Teacher, or Staff — and shows the appropriate dashboard.',
    icon: <LogIn size={28} />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    labels: [
      { text: 'Campus Selector', x: '50%', y: '42%', color: 'text-cyan-400', delay: '0.2s' },
      { text: 'Email & Password', x: '50%', y: '55%', color: 'text-primary-400', delay: '0.5s' },
      { text: 'Two-Factor Auth', x: '50%', y: '70%', color: 'text-amber-400', delay: '0.8s' },
    ],
  },
  {
    id: 3,
    title: 'Control Room',
    subtitle: 'The Command Center',
    description: 'Admins and Principals see the Control Room — a split-screen view of both campuses with live video feeds, audio controls, screen sharing, and emergency tools.',
    icon: <Monitor size={28} />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    labels: [
      { text: 'Paete Live Feed', x: '25%', y: '30%', color: 'text-cyan-400', delay: '0.2s' },
      { text: 'Pagsanjan Live Feed', x: '75%', y: '30%', color: 'text-purple-400', delay: '0.5s' },
      { text: 'Audio Controls', x: '25%', y: '75%', color: 'text-amber-400', delay: '0.8s' },
      { text: 'Portal Toggle', x: '75%', y: '75%', color: 'text-green-400', delay: '1.1s' },
    ],
  },
  {
    id: 4,
    title: 'Portal Mode',
    subtitle: 'Live Campus-to-Campus View',
    description: 'When Portal Mode is ON, both campuses see each other in real-time — the system auto-connects without anyone pressing a call button. It\'s always-on presence.',
    icon: <Radio size={28} />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    labels: [
      { text: 'Portal Active', x: '50%', y: '15%', color: 'text-green-400', delay: '0.2s' },
      { text: 'Auto-Connected', x: '25%', y: '55%', color: 'text-cyan-400', delay: '0.5s' },
      { text: 'Real-Time Video', x: '75%', y: '55%', color: 'text-purple-400', delay: '0.8s' },
    ],
  },
  {
    id: 5,
    title: 'Screen Sharing',
    subtitle: 'Present to Both Campuses',
    description: 'Share your screen to broadcast presentations, documents, or announcements. Your screen appears as the main view while your camera stays as a thumbnail.',
    icon: <ScreenShare size={28} />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    labels: [
      { text: 'Shared Screen (Main)', x: '50%', y: '35%', color: 'text-pink-400', delay: '0.2s' },
      { text: 'Your Camera', x: '80%', y: '70%', color: 'text-cyan-400', delay: '0.5s' },
      { text: 'Other Campus', x: '20%', y: '70%', color: 'text-purple-400', delay: '0.8s' },
    ],
  },
  {
    id: 6,
    title: 'Emoji Reactions',
    subtitle: 'Express Yourself in Real-Time',
    description: 'Send emoji reactions during sessions to express yourself without interrupting. Reactions float over the video feeds for everyone to see.',
    icon: <Smile size={28} />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    labels: [
      { text: 'Reaction Picker', x: '50%', y: '25%', color: 'text-yellow-400', delay: '0.2s' },
      { text: '👍 ❤️ 😂 🎉', x: '50%', y: '55%', color: 'text-white', delay: '0.5s' },
      { text: 'Floats on Video', x: '50%', y: '80%', color: 'text-gray-400', delay: '0.8s' },
    ],
  },
  {
    id: 7,
    title: 'Raise Hand',
    subtitle: 'Request Attention',
    description: 'Raise your hand to signal the speaker or request attention during a session. Your hand status is visible to all participants.',
    icon: <Hand size={28} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    labels: [
      { text: 'Raise Hand Button', x: '50%', y: '25%', color: 'text-amber-400', delay: '0.2s' },
      { text: 'Hand Raised ✓', x: '50%', y: '55%', color: 'text-amber-400', delay: '0.5s' },
      { text: 'Visible to All', x: '50%', y: '80%', color: 'text-gray-400', delay: '0.8s' },
    ],
  },
  {
    id: 8,
    title: 'Record Meetings',
    subtitle: 'Capture for Later Review',
    description: 'Admins can record video sessions directly in the Control Room. Recordings are saved securely and can be accessed or restored from the Records page.',
    icon: <Circle size={28} />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    labels: [
      { text: 'Record Button', x: '50%', y: '25%', color: 'text-red-400', delay: '0.2s' },
      { text: '🔴 Recording...', x: '50%', y: '55%', color: 'text-red-400', delay: '0.5s' },
      { text: 'Admin Only', x: '50%', y: '80%', color: 'text-gray-400', delay: '0.8s' },
    ],
  },
  {
    id: 9,
    title: 'Talk & Mic Buttons',
    subtitle: 'Independent Audio Channels',
    description: 'The Talk button lets you speak cross-campus to Paete, Pagsanjan, or Both. The Mic button controls your same-campus audio. Both work independently for maximum flexibility.',
    icon: <Mic size={28} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    labels: [
      { text: 'Talk → Paete', x: '20%', y: '40%', color: 'text-cyan-400', delay: '0.2s' },
      { text: 'Talk → Pagsanjan', x: '50%', y: '40%', color: 'text-purple-400', delay: '0.5s' },
      { text: 'Talk → Both', x: '80%', y: '40%', color: 'text-amber-400', delay: '0.8s' },
      { text: 'Local Mic (Same Campus)', x: '50%', y: '70%', color: 'text-green-400', delay: '1.1s' },
    ],
  },
  {
    id: 10,
    title: 'Emergency Broadcast',
    subtitle: 'Instant Campus-Wide Alerts',
    description: 'Trigger an emergency to immediately override all screens with a red alert. Every campus display shows the message until the principal dismisses it.',
    icon: <AlertTriangle size={28} />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    labels: [
      { text: 'Emergency Triggered', x: '50%', y: '15%', color: 'text-red-400', delay: '0.2s' },
      { text: 'Alert Displayed', x: '25%', y: '55%', color: 'text-red-400', delay: '0.5s' },
      { text: 'Dismiss Button', x: '75%', y: '75%', color: 'text-gray-400', delay: '0.8s' },
    ],
  },
  {
    id: 11,
    title: 'Bulletin Board',
    subtitle: 'Announcements & Notices',
    description: 'Post announcements visible to both campuses. Bulletins appear as notifications with titles and messages — perfect for schedules, events, and reminders.',
    icon: <Megaphone size={28} />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    labels: [
      { text: 'New Bulletin', x: '50%', y: '25%', color: 'text-emerald-400', delay: '0.2s' },
      { text: 'Notification Bell', x: '85%', y: '15%', color: 'text-amber-400', delay: '0.5s' },
      { text: 'Campus Tabs', x: '50%', y: '60%', color: 'text-cyan-400', delay: '0.8s' },
    ],
  },
  {
    id: 12,
    title: 'Campus Chat',
    subtitle: 'Real-Time Messaging',
    description: 'Send messages to everyone or filter by campus. The chat supports All, Paete, and Pagsanjan tabs — so you can talk to one campus or both.',
    icon: <MessageSquare size={28} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    labels: [
      { text: 'All Tab', x: '25%', y: '25%', color: 'text-gray-400', delay: '0.2s' },
      { text: 'Paete Tab', x: '45%', y: '25%', color: 'text-cyan-400', delay: '0.4s' },
      { text: 'Pagsanjan Tab', x: '65%', y: '25%', color: 'text-purple-400', delay: '0.6s' },
      { text: 'Message Input', x: '50%', y: '75%', color: 'text-blue-400', delay: '0.8s' },
    ],
  },
  {
    id: 13,
    title: 'You\'re All Set!',
    subtitle: 'Start Connecting Your Campuses',
    description: 'You now know the essentials. Log in, explore the Control Room, and start communicating between PSBC Paete and PSBC Pagsanjan — instantly.',
    icon: <Check size={28} />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    labels: [],
  },
];

export function DemoTour({ isOpen, onClose }: DemoTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const step = tourSteps[currentStep];

  const goNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    }
  }, [currentStep, isAnimating]);

  const goPrev = useCallback(() => {
    if (currentStep > 0 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 300);
    }
  }, [currentStep, isAnimating]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setAutoPlay(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!autoPlay || !isOpen) return;
    const timer = setInterval(() => {
      if (currentStep < tourSteps.length - 1) {
        goNext();
      } else {
        setAutoPlay(false);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay, currentStep, isOpen, goNext]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-950/95 backdrop-blur-xl transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-4xl mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-800/60 shadow-2xl overflow-hidden transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-cyan-500 to-purple-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-1.5 sm:p-2 rounded-xl bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700/80 transition-all"
        >
          <X size={18} />
        </button>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-800/50">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-col lg:flex-row min-h-[400px] sm:min-h-[500px]">
          {/* Left panel - Content */}
          <div className="lg:w-2/5 p-4 sm:p-6 lg:p-8 flex flex-col h-auto sm:h-[500px] max-h-[50vh] sm:max-h-none overflow-y-auto lg:overflow-y-auto">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Step {currentStep + 1} of {tourSteps.length}
              </span>
              <div className="flex-1" />
              {autoPlay && (
                <span className="text-[10px] text-primary-400 animate-pulse">AUTO</span>
              )}
            </div>

            {/* Icon */}
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${step.bgColor} border ${step.borderColor} flex items-center justify-center mb-4 sm:mb-6 ${step.color}`}>
              {step.icon}
            </div>

            {/* Title */}
            <h2 className="font-orbitron text-lg sm:text-xl font-bold text-white mb-1">
              {step.title}
            </h2>
            <p className={`text-xs sm:text-sm font-medium ${step.color} mb-3 sm:mb-4`}>
              {step.subtitle}
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              {step.description}
            </p>

            {/* Labels legend */}
            {step.labels.length > 0 && (
              <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Labels</span>
                <div className="flex flex-wrap gap-2">
                  {step.labels.map((label, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-medium px-2 py-1 rounded-md bg-gray-800/80 border border-gray-700/50 ${label.color} animate-fade-in`}
                      style={{ animationDelay: label.delay }}
                    >
                      {label.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation — pinned to bottom */}
            <div className="mt-auto pt-4 sm:pt-6 border-t border-gray-800/60">
              <div className="flex items-center justify-between">
                <button
                  onClick={goPrev}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap pl-1"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>

                <div className="flex items-center gap-1">
                  {tourSteps.map((_, i) => (
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

                {currentStep < tourSteps.length - 1 ? (
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-primary-400 hover:text-primary-300 transition-colors whitespace-nowrap pr-1"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-green-400 hover:text-green-300 transition-colors whitespace-nowrap pr-1"
                  >
                    Get Started
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right panel - Visual mockup */}
          <div className="hidden sm:flex lg:w-3/5 bg-gray-950/50 border-l border-gray-800/60 p-6 lg:p-8 items-center justify-center relative overflow-hidden">
            <div className="relative w-full max-w-lg">
              {currentStep === 0 && <WelcomeMockup />}
              {currentStep === 1 && <LoginMockup labels={step.labels} />}
              {currentStep === 2 && <ControlRoomMockup labels={step.labels} />}
              {currentStep === 3 && <PortalModeMockup labels={step.labels} />}
              {currentStep === 4 && <ScreenShareMockup labels={step.labels} />}
              {currentStep === 5 && <ReactionsMockup labels={step.labels} />}
              {currentStep === 6 && <RaiseHandMockup labels={step.labels} />}
              {currentStep === 7 && <RecordingsMockup labels={step.labels} />}
              {currentStep === 8 && <AudioMockup labels={step.labels} />}
              {currentStep === 9 && <EmergencyMockup labels={step.labels} />}
              {currentStep === 10 && <BulletinMockup labels={step.labels} />}
              {currentStep === 11 && <ChatMockup labels={step.labels} />}
              {currentStep === 12 && <FinalMockup />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MOCKUP COMPONENTS ─── */

function MockupLabel({ text, x, y, color, delay }: { text: string; x: string; y: string; color: string; delay: string }) {
  return (
    <div
      className={`absolute z-30 animate-fade-in`}
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', animationDelay: delay }}
    >
      <div className={`px-3 py-1.5 rounded-lg bg-gray-900/95 border border-gray-700/60 text-[11px] font-semibold ${color} whitespace-nowrap shadow-xl backdrop-blur-sm`}>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <span className="relative">{text}</span>
      </div>
      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 bg-gray-900/95 border-r border-b border-gray-700/60 transform rotate-45" />
    </div>
  );
}

function MockupFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="w-full bg-gray-900 rounded-xl border border-gray-800/60 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 border-b border-gray-700/50">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/80" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
          <div className="w-2 h-2 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[10px] text-gray-500 font-medium">{title}</span>
        </div>
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

function WelcomeMockup() {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12 L10 7 L10 17 Z" fill="currentColor" />
          <path d="M19 12 L14 7 L14 17 Z" fill="currentColor" opacity="0.4" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      </div>
      <h3 className="font-orbitron text-lg font-bold text-white mb-2">Here to There</h3>
      <p className="text-sm text-gray-500 mb-6">PSBC Intercampus Video Portal</p>
      <div className="flex items-center justify-center gap-3">
        <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
        <div className="w-16 h-px bg-gradient-to-r from-cyan-500 to-purple-500" />
        <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
      </div>
      <p className="text-[10px] text-gray-600 mt-3">Paete ↔ Pagsanjan</p>
    </div>
  );
}

function LoginMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <div className="space-y-4 relative">
      {/* Logo header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12 L10 7 L10 17 Z" fill="currentColor" />
              <path d="M19 12 L14 7 L14 17 Z" fill="currentColor" opacity="0.4" />
              <circle cx="12" cy="12" r="1.5" />
            </svg>
          </div>
          <span className="font-orbitron text-sm font-bold text-white">Here to There</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[8px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> Paete
          </span>
          <span className="text-[8px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> Pagsanjan
          </span>
          <span className="text-[8px] text-primary-400 bg-primary-500/10 border border-primary-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary-400 animate-pulse" /> Control Room
          </span>
        </div>
      </div>

      <div className="relative">
        <MockupFrame title="Login — Here to There">
          <div className="p-5 space-y-3">
            {/* Sign In header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center">
                <Shield size={12} className="text-primary-400" />
              </div>
              <span className="text-xs font-bold text-white">Sign In</span>
            </div>

            {/* Campus selector - FIRST */}
            <div className="space-y-1">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">Campus</span>
              <div className="bg-gray-800/60 rounded-lg px-2.5 py-2 border border-gray-700/50 flex items-center gap-2">
                <Building2 size={10} className="text-gray-500" />
                <span className="text-[10px] text-white flex-1">Control Room (Admin)</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">Email</span>
              <div className="bg-gray-800/60 rounded-lg px-2.5 py-2 border border-gray-700/50 flex items-center gap-2">
                <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-[10px] text-gray-300">admin@psbc.edu.ph</span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">Password</span>
              <div className="bg-gray-800/60 rounded-lg px-2.5 py-2 border border-gray-700/50 flex items-center gap-2">
                <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="text-[10px] text-gray-300 tracking-widest flex-1">••••••••</span>
                <EyeOff size={10} className="text-gray-500" />
              </div>
            </div>

            {/* Sign In button */}
            <div className="bg-gradient-to-r from-primary-600 to-cyan-600 rounded-lg py-2.5 flex items-center justify-center gap-1.5 mt-4">
              <span className="text-[11px] text-white font-semibold">Sign In</span>
              <ArrowRight size={10} className="text-white" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-1 pt-2 border-t border-gray-800/50">
              <Shield size={8} className="text-green-500/60" />
              <span className="text-[8px] text-gray-600">End-to-end encrypted</span>
            </div>
          </div>
        </MockupFrame>

        {/* Labels overlay */}
        {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
      </div>
    </div>
  );
}

function ControlRoomMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="PSBC Control Room">
      <div className="p-3 grid grid-cols-2 gap-2">
        <div className="bg-gray-800 rounded-lg aspect-video relative overflow-hidden border border-gray-700/50">
          <img src="/images/paete.png" alt="Paete" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[7px] text-green-400 font-bold bg-green-500/20 px-1 py-0.5 rounded flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> LIVE
            </span>
          </div>
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
            <span className="text-[9px] text-white font-medium">PSBC Paete</span>
            <span className="text-[7px] text-cyan-400 bg-cyan-500/20 px-1 py-0.5 rounded">CAM</span>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg aspect-video relative overflow-hidden border border-gray-700/50">
          <img src="/images/pagsanjan.png" alt="Pagsanjan" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[7px] text-green-400 font-bold bg-green-500/20 px-1 py-0.5 rounded flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> LIVE
            </span>
          </div>
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
            <span className="text-[9px] text-white font-medium">PSBC Pagsanjan</span>
            <span className="text-[7px] text-purple-400 bg-purple-500/20 px-1 py-0.5 rounded">CAM</span>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center"><Mic size={10} className="text-amber-400" /></div>
          <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center"><Radio size={10} className="text-green-400" /></div>
          <div className="w-6 h-6 rounded bg-pink-500/20 flex items-center justify-center"><ScreenShare size={10} className="text-pink-400" /></div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center"><Bell size={10} className="text-red-400" /></div>
          <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center"><MessageSquare size={10} className="text-blue-400" /></div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function PortalModeMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Portal Mode — Active">
      <div className="p-3">
        <div className="flex items-center justify-center gap-2 mb-3 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
          <Radio size={12} className="text-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-semibold">PORTAL MODE ACTIVE — Both campuses connected</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800 rounded-lg aspect-video relative overflow-hidden border border-cyan-500/30">
            <img src="/images/paete.png" alt="Paete" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
            <div className="absolute bottom-1.5 left-1.5"><span className="text-[9px] text-white font-medium">Paete</span></div>
            <div className="absolute top-1.5 right-1.5"><span className="text-[7px] text-green-400 bg-green-500/20 px-1 py-0.5 rounded">PORTAL</span></div>
          </div>
          <div className="bg-gray-800 rounded-lg aspect-video relative overflow-hidden border border-purple-500/30">
            <img src="/images/pagsanjan.png" alt="Pagsanjan" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
            <div className="absolute bottom-1.5 left-1.5"><span className="text-[9px] text-white font-medium">Pagsanjan</span></div>
            <div className="absolute top-1.5 right-1.5"><span className="text-[7px] text-green-400 bg-green-500/20 px-1 py-0.5 rounded">PORTAL</span></div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <div className="w-8 h-px bg-gradient-to-r from-cyan-500 to-purple-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #06b6d4 0, #06b6d4 2px, transparent 2px, transparent 4px)' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function ScreenShareMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Screen Sharing — Presentation Mode">
      <div className="p-3">
        <div className="bg-gray-800 rounded-lg aspect-video relative overflow-hidden border border-pink-500/30 mb-2">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Monitor size={24} className="text-pink-400 mx-auto mb-2" />
              <p className="text-[10px] text-gray-400">Shared Screen — Presentation</p>
              <p className="text-[8px] text-gray-600 mt-1">Spreadsheet · Q3 Report · 2026</p>
            </div>
          </div>
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[7px] text-pink-400 font-bold bg-pink-500/20 px-1 py-0.5 rounded flex items-center gap-0.5">
              <ScreenShare size={8} /> SHARING
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-20 h-14 bg-gray-800 rounded-lg relative overflow-hidden border border-cyan-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <Video size={10} className="text-cyan-400" />
            </div>
            <span className="absolute bottom-0.5 left-1 text-[7px] text-cyan-400">You</span>
          </div>
          <div className="w-20 h-14 bg-gray-800 rounded-lg relative overflow-hidden border border-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <Video size={10} className="text-purple-400" />
            </div>
            <span className="absolute bottom-0.5 left-1 text-[7px] text-purple-400">Pagsanjan</span>
          </div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function ReactionsMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Emoji Reactions — Express Yourself">
      <div className="p-4 space-y-3">
        <div className="text-center mb-2">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Send Reactions in Real-Time</span>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Smile size={14} className="text-yellow-400" />
            <span className="text-[10px] text-white font-semibold">Reaction Picker</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {['👍', '❤️', '😂', '🎉', '👏', '😮', '😢', '🔥'].map((emoji) => (
              <div key={emoji} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700/60 hover:bg-gray-600 text-lg transition-colors cursor-pointer">
                {emoji}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-3">
          <div className="text-2xl animate-bounce">👍</div>
          <div>
            <p className="text-[10px] text-yellow-400 font-semibold">Floats on Video</p>
            <p className="text-[8px] text-gray-500">Reactions appear over the video feeds</p>
          </div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function RaiseHandMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Raise Hand — Request Attention">
      <div className="p-4 space-y-3">
        <div className="text-center mb-2">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Signal the Speaker</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 text-center">
            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center mx-auto mb-2">
              <Hand size={16} className="text-gray-400" />
            </div>
            <p className="text-[9px] text-gray-400 font-semibold">Hand Lowered</p>
            <p className="text-[8px] text-gray-600">Click to raise</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
              <Hand size={16} className="text-amber-400 fill-amber-400" />
            </div>
            <p className="text-[9px] text-amber-400 font-semibold">Hand Raised ✓</p>
            <p className="text-[8px] text-gray-500">Click to lower</p>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
          <Hand size={16} className="text-amber-400" />
          <div>
            <p className="text-[10px] text-amber-400 font-semibold">Visible to All Participants</p>
            <p className="text-[8px] text-gray-500">Everyone sees your hand status</p>
          </div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function RecordingsMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Record Meetings — Admin Only">
      <div className="p-4 space-y-3">
        <div className="text-center mb-2">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Capture Sessions for Later</span>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <Circle size={16} className="text-red-500 fill-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-white font-semibold">Recording Controls</p>
              <p className="text-[8px] text-gray-500">Start/Stop recording from the control bar</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-2.5 py-1.5 border border-gray-700/40">
            <Circle size={8} className="text-red-500 fill-red-500 animate-pulse" />
            <span className="text-[9px] text-red-400 font-mono font-medium">00:12:34</span>
            <span className="text-[8px] text-gray-600">· Recording in progress</span>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
          <Circle size={16} className="text-red-400" />
          <div>
            <p className="text-[10px] text-red-400 font-semibold">Admin Only Feature</p>
            <p className="text-[8px] text-gray-500">Recordings saved to Records page</p>
          </div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function AudioMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Audio Controls — Independent Channels">
      <div className="p-4 space-y-3">
        <div className="text-center mb-2">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Two Independent Channels</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
            <Mic size={16} className="text-cyan-400 mx-auto mb-1.5" />
            <p className="text-[9px] text-cyan-400 font-semibold">Talk</p>
            <p className="text-[8px] text-gray-500">→ Paete</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
            <Mic size={16} className="text-purple-400 mx-auto mb-1.5" />
            <p className="text-[9px] text-purple-400 font-semibold">Talk</p>
            <p className="text-[8px] text-gray-500">→ Pagsanjan</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
            <Volume2 size={16} className="text-amber-400 mx-auto mb-1.5" />
            <p className="text-[9px] text-amber-400 font-semibold">Talk</p>
            <p className="text-[8px] text-gray-500">→ Both</p>
          </div>
        </div>
        <div className="border-t border-gray-800/60 pt-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
            <Mic size={16} className="text-green-400" />
            <div>
              <p className="text-[10px] text-green-400 font-semibold">Local Mic</p>
              <p className="text-[8px] text-gray-500">Same-campus audio — independent from Talk buttons</p>
            </div>
          </div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function EmergencyMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Emergency Broadcast">
      <div className="p-3">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center animate-pulse">
          <AlertTriangle size={20} className="text-red-400 mx-auto mb-2" />
          <p className="text-[11px] text-red-400 font-bold mb-1">EMERGENCY BROADCAST</p>
          <p className="text-[9px] text-gray-400">All screens overridden</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg aspect-video flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle size={12} className="text-red-400 mx-auto mb-1" />
              <span className="text-[8px] text-red-400">Paete — ALERT</span>
            </div>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg aspect-video flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle size={12} className="text-red-400 mx-auto mb-1" />
              <span className="text-[8px] text-red-400">Pagsanjan — ALERT</span>
            </div>
          </div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function BulletinMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Bulletin Board">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 bg-primary-500/20 border border-primary-500/30 rounded-md px-2 py-1">
            <Bell size={8} className="text-primary-400" />
            <span className="text-[9px] text-primary-400 font-semibold">Notifications</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1">
            <Radio size={8} className="text-gray-400" />
            <span className="text-[9px] text-gray-400">Bulletins</span>
          </div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Megaphone size={8} className="text-emerald-400" />
            <span className="text-[9px] text-emerald-400 font-semibold">New Bulletin</span>
          </div>
          <p className="text-[10px] text-white font-medium">Schedule: Friday Assembly</p>
          <p className="text-[8px] text-gray-500 mt-0.5">Both campuses · Today at 2:00 PM</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Megaphone size={8} className="text-gray-400" />
            <span className="text-[9px] text-gray-400">Bulletin</span>
          </div>
          <p className="text-[10px] text-gray-300 font-medium">Midterm Grades Submission</p>
          <p className="text-[8px] text-gray-600 mt-0.5">Due: October 15, 2026</p>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function ChatMockup({ labels }: { labels: TourStep['labels'] }) {
  return (
    <MockupFrame title="Campus Chat">
      <div className="p-3">
        <div className="flex items-center gap-1 mb-3 border-b border-gray-800/60 pb-2">
          <div className="px-2 py-1 rounded text-[8px] bg-gray-800/60 text-gray-500">All</div>
          <div className="px-2 py-1 rounded text-[8px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Paete</div>
          <div className="px-2 py-1 rounded text-[8px] bg-gray-800/60 text-gray-500">Pagsanjan</div>
        </div>
        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] text-cyan-400 font-bold">T</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-cyan-400 font-semibold">Teacher Paete</span>
                <span className="text-[7px] text-gray-600">2:30 PM</span>
              </div>
              <p className="text-[9px] text-gray-300">Ready for the assembly</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] text-purple-400 font-bold">S</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-purple-400 font-semibold">Staff Pagsanjan</span>
                <span className="text-[7px] text-gray-600">2:31 PM</span>
              </div>
              <p className="text-[9px] text-gray-300">We're set on our end too!</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-2 py-1.5 border border-gray-700/50">
          <MessageSquare size={10} className="text-gray-500" />
          <span className="text-[9px] text-gray-600">Type a message...</span>
          <div className="ml-auto px-1.5 py-0.5 bg-primary-500/20 rounded text-[8px] text-primary-400">Send</div>
        </div>
      </div>
      {labels.map((l, i) => <MockupLabel key={i} {...l} />)}
    </MockupFrame>
  );
}

function FinalMockup() {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
        <Check size={28} className="text-green-400" />
      </div>
      <h3 className="font-orbitron text-lg font-bold text-white mb-2">Ready to Go!</h3>
      <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
        You've seen all the key features. Now it's time to connect your campuses.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Video size={12} className="text-cyan-400" /> Video
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Mic size={12} className="text-amber-400" /> Audio
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <ScreenShare size={12} className="text-pink-400" /> Screen
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Smile size={12} className="text-yellow-400" /> Reactions
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Hand size={12} className="text-amber-400" /> Hand
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Circle size={12} className="text-red-400" /> Record
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Bell size={12} className="text-red-400" /> Alert
        </div>
      </div>
    </div>
  );
}
