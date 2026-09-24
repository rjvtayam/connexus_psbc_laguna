import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, Wifi, Monitor, Shield, ArrowRight, Zap, Building2, KeyRound, ChevronDown } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [campus, setCampus] = useState<'paete' | 'pagsanjan' | 'control_room'>('paete');
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState({ email: false, password: false });

  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await login(email, password);

      if (result.requires_2fa && result.temp_token) {
        setRequires2FA(true);
        setTempToken(result.temp_token);
        setIsLoading(false);
        return;
      }

      const user = result.user;
      if (user?.campus !== campus) {
        setError(`This account is registered to ${user?.campus === 'control_room' ? 'Control Room' : user?.campus === 'paete' ? 'PSBC Paete' : 'PSBC Pagsanjan'}. Please select the correct campus.`);
        setIsLoading(false);
        return;
      }

      localStorage.setItem('pending_live_demo', JSON.stringify({ userId: user?.id, name: user?.full_name, campus: user?.campus, role: user?.role }));

      if (user?.role === 'principal' || user?.role === 'admin') {
        navigate('/control-room');
      } else {
        navigate(`/campus/${user?.campus}`);
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (twoFACode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      const user = await verify2FA(tempToken, twoFACode);

      if (user.campus !== campus) {
        setError(`This account is registered to ${user.campus === 'control_room' ? 'Control Room' : user.campus === 'paete' ? 'PSBC Paete' : 'PSBC Pagsanjan'}. Please select the correct campus.`);
        setIsLoading(false);
        return;
      }

      localStorage.setItem('pending_live_demo', JSON.stringify({ userId: user.id, name: user.full_name, campus: user.campus, role: user.role }));

      if (user.role === 'principal' || user.role === 'admin') {
        navigate('/control-room');
      } else {
        navigate(`/campus/${user.campus}`);
      }
    } catch {
      setError('Invalid 2FA code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden py-16 px-4">
      {/* === BACKGROUND === */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary-600/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-400/4 blur-[150px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <div className="absolute top-0 left-[15%] w-px h-full bg-gradient-to-b from-primary-500/10 via-transparent to-primary-500/10" />
        <div className="absolute top-0 right-[15%] w-px h-full bg-gradient-to-b from-cyan-500/10 via-transparent to-cyan-500/10" />
        <div className="absolute top-[20%] left-[10%] w-1 h-1 bg-primary-400 rounded-full animate-pulse opacity-40" />
        <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse opacity-30" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[25%] w-1 h-1 bg-primary-300 rounded-full animate-pulse opacity-20" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[70%] right-[15%] w-1 h-1 bg-cyan-300 rounded-full animate-pulse opacity-35" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[45%] left-[8%] w-0.5 h-0.5 bg-white rounded-full animate-pulse opacity-50" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[85%] left-[45%] w-0.5 h-0.5 bg-primary-300 rounded-full animate-pulse opacity-40" style={{ animationDelay: '3s' }} />
      </div>

      {/* === CONTENT === */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-primary-500/25 relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12 L10 7 L10 17 Z" fill="currentColor" />
                <path d="M19 12 L14 7 L14 17 Z" fill="currentColor" opacity="0.4" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <h1 className="font-orbitron text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              CONN<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-400">EXUS</span>
            </h1>
          </div>
          <p className="text-gray-400 text-sm tracking-wide">Live Video Portal for Intercampus Communication</p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <StatusChip icon={<Wifi size={10} />} label="Paete" color="green" />
            <StatusChip icon={<Wifi size={10} />} label="Pagsanjan" color="green" />
            <StatusChip icon={<Monitor size={10} />} label="Control Room" color="primary" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary-500/20 via-cyan-500/10 to-transparent blur-sm" />
          <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800/60 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
                {requires2FA ? <KeyRound size={16} className="text-primary-400" /> : <Shield size={16} className="text-primary-400" />}
              </div>
              <h2 className="font-orbitron text-lg font-bold text-white">
                {requires2FA ? '2FA Verification' : 'Sign In'}
              </h2>
            </div>

            {!requires2FA ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Campus</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCampusDropdown(!showCampusDropdown)}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all duration-300 cursor-pointer flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2.5">
                        {campus === 'paete' && <Building2 size={14} className="text-blue-400" />}
                        {campus === 'pagsanjan' && <Building2 size={14} className="text-purple-400" />}
                        {campus === 'control_room' && <Monitor size={14} className="text-green-400" />}
                        {campus === 'paete' ? 'PSBC Paete' : campus === 'pagsanjan' ? 'PSBC Pagsanjan' : 'Control Room (Admin)'}
                      </span>
                      <ChevronDown size={14} className={`text-gray-500 transition-transform ${showCampusDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCampusDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowCampusDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-gray-800 border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => { setCampus('paete'); setShowCampusDropdown(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${campus === 'paete' ? 'bg-blue-500/15 text-blue-400' : 'text-gray-300 hover:bg-gray-700/60'}`}
                          >
                            <Building2 size={16} className="text-blue-400" />
                            <span className="font-medium">PSBC Paete</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCampus('pagsanjan'); setShowCampusDropdown(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${campus === 'pagsanjan' ? 'bg-purple-500/15 text-purple-400' : 'text-gray-300 hover:bg-gray-700/60'}`}
                          >
                            <Building2 size={16} className="text-purple-400" />
                            <span className="font-medium">PSBC Pagsanjan</span>
                          </button>
                          <div className="h-px bg-gray-700/50" />
                          <button
                            type="button"
                            onClick={() => { setCampus('control_room'); setShowCampusDropdown(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${campus === 'control_room' ? 'bg-green-500/15 text-green-400' : 'text-gray-300 hover:bg-gray-700/60'}`}
                          >
                            <Monitor size={16} className="text-green-400" />
                            <span className="font-medium">Control Room (Admin)</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Email</label>
                  <div className={`relative rounded-xl transition-all duration-300 ${isFocused.email ? 'ring-2 ring-primary-500/40' : ''}`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className={`w-4 h-4 transition-colors ${isFocused.email ? 'text-primary-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setIsFocused({ ...isFocused, email: true })}
                      onBlur={() => setIsFocused({ ...isFocused, email: false })}
                      placeholder="you@psbc.edu.ph"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Password</label>
                  <div className={`relative rounded-xl transition-all duration-300 ${isFocused.password ? 'ring-2 ring-primary-500/40' : ''}`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className={`w-4 h-4 transition-colors ${isFocused.password ? 'text-primary-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsFocused({ ...isFocused, password: true })}
                      onBlur={() => setIsFocused({ ...isFocused, password: false })}
                      placeholder="Enter your password"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-gray-500 focus:outline-none transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
                    <Zap size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all duration-300 disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-cyan-600 group-hover:from-primary-500 group-hover:to-cyan-500 transition-all duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2 text-sm">
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            ) : (
              <form onSubmit={handle2FASubmit} className="space-y-5">
                <p className="text-gray-400 text-sm text-center">
                  Enter the 6-digit code from your authenticator app
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Authentication Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <KeyRound size={16} className="text-gray-500" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-10 pr-4 py-3 text-white text-sm text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all duration-300"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
                    <Zap size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || twoFACode.length !== 6}
                  className="w-full relative group overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all duration-300 disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-cyan-600 group-hover:from-primary-500 group-hover:to-cyan-500 transition-all duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2 text-sm">
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Code
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTempToken('');
                    setTwoFACode('');
                    setError('');
                  }}
                  className="w-full text-center text-gray-500 text-xs hover:text-gray-300 transition-colors"
                >
                  Back to login
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-gray-800/50">
              <div className="flex items-center justify-center gap-1.5">
                <Shield size={10} className="text-green-500/60" />
                <p className="text-[11px] text-gray-600">End-to-end encrypted connection</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-600 text-[11px] mt-8 tracking-wide">
          &copy; 2026 PSBC Paete &amp; PSBC Pagsanjan. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function StatusChip({ icon, label, color }: { icon: React.ReactNode; label: string; color: 'green' | 'primary' }) {
  const colors = {
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    primary: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${colors[color]}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
