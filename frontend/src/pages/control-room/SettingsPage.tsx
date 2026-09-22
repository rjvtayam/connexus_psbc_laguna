import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore, type SettingsState } from '../../stores/settingsStore';
import { profileApi } from '../../api/profile.api';
import { User as UserType, ActivityLog } from '../../types/user';
import { Save, Shield, Bell, User, Building2, Monitor, AudioLines,
  Wifi, Globe, Volume2, VolumeX, RefreshCw, Camera, CameraOff, Aperture,
  Clock, Mic, MicOff, Speaker, Phone, Mail, Lock, History, CheckCircle2,
  AlertCircle, LogIn, Key, Edit3, Eye, EyeOff, X
} from 'lucide-react';
import { pushSettingsToast, SettingsToast } from '../../components/ui/SettingsToast';

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-all duration-300 flex-shrink-0 ${enabled ? 'bg-primary-600 shadow-lg shadow-primary-500/20' : 'bg-gray-700'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-md ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SettingRow({ icon, iconBg, label, description, children }: {
  icon: React.ReactNode; iconBg: string; label: string; description: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-white font-medium text-[12px]">{label}</p>
          <p className="text-gray-500 text-[10px]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

type Tab = 'profile' | 'video' | 'audio' | 'connection' | 'notifications';
type ProfileSubTab = 'personal' | 'security' | 'activity';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: 'Profile', icon: <User size={11} /> },
  { key: 'video', label: 'Video', icon: <Monitor size={11} /> },
  { key: 'audio', label: 'Audio', icon: <AudioLines size={11} /> },
  { key: 'connection', label: 'Connection', icon: <Wifi size={11} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={11} /> },
];

const PROFILE_SUB_TABS: { key: ProfileSubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Personal Info', icon: <User size={10} /> },
  { key: 'security', label: 'Security', icon: <Lock size={10} /> },
  { key: 'activity', label: 'Activity Log', icon: <History size={10} /> },
];

export function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('personal');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settings.loadSettings();
  }, []);

  const handleSave = () => {
    settings.saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const showSaveButtons = activeTab !== 'profile' || profileSubTab === 'personal';

  return (
    <DashboardLayout>
      <SettingsToast />
      <div className="p-3 sm:p-5 max-w-4xl mx-auto space-y-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
<div className="w-7 h-7 rounded-lg bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
              <Shield size={12} className="text-primary-400" />
            </div>
            <div>
              <h1 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide">Settings</h1>
              <p className="text-gray-500 text-[10px] sm:text-[11px]">Manage your account and preferences</p>
            </div>
          </div>
          <Badge variant="info">{user?.role?.toUpperCase()}</Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                  : 'text-gray-500 hover:text-white hover:bg-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && <ProfileSection user={user} updateUser={updateUser} activeSubTab={profileSubTab} onSubTabChange={setProfileSubTab} />}
        {activeTab === 'video' && <VideoTab settings={settings} />}
        {activeTab === 'audio' && <AudioTab settings={settings} />}
        {activeTab === 'connection' && <ConnectionTab settings={settings} />}
        {activeTab === 'notifications' && <NotificationsTab settings={settings} />}

        {/* Save */}
        {showSaveButtons && (
          <div className="flex justify-end gap-2">
            <Button onClick={() => {
              if (window.confirm('Reset all settings to factory defaults? This cannot be undone.')) {
                settings.resetSettings();
              }
            }} variant="secondary" size="sm" className="inline-flex items-center whitespace-nowrap">
              <RefreshCw size={12} className="mr-1.5" />
              Reset
            </Button>
            {activeTab === 'profile' && profileSubTab === 'personal' ? (
              <Button onClick={handleSave} size="sm" className="inline-flex items-center whitespace-nowrap bg-gradient-to-r from-primary-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 shadow-lg shadow-primary-500/20">
                <Save size={12} className="mr-1.5" />
                {saved ? 'Saved!' : 'Save Profile'}
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Applied in real-time
              </span>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ─── PROFILE SECTION (with sub-tabs) ─── */
function ProfileSection({ user, updateUser, activeSubTab, onSubTabChange }: {
  user: UserType | null; updateUser: (u: UserType) => void;
  activeSubTab: ProfileSubTab; onSubTabChange: (tab: ProfileSubTab) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { avatar_url } = await profileApi.uploadAvatar(file);
      updateUser({ ...user!, avatar_url });
    } catch (err: any) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    try {
      await profileApi.deleteAvatar();
      updateUser({ ...user!, avatar_url: undefined });
    } catch (err) {
      console.error('Remove failed:', err);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Profile Header Card */}
      <div className="relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="relative group">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/30 to-cyan-500/30 border border-gray-700/50 flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <User size={22} className="text-primary-400" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <RefreshCw size={12} className="text-white animate-spin" />
                </div>
              )}
            </div>
            <div
              className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={13} className="text-white" />
              <span className="text-[10px] text-white font-medium">Change</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold text-[13px]">{user?.full_name}</h2>
            <p className="text-gray-400 text-[11px]">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={user?.role === 'principal' ? 'success' : user?.role === 'admin' ? 'info' : 'default'}>
                {user?.role?.toUpperCase()}
              </Badge>
              <span className="text-gray-700 text-[10px]">|</span>
              <span className="text-gray-500 text-[10px] flex items-center gap-1">
                <Building2 size={10} />
                {user?.campus?.replace('_', ' ').toUpperCase()}
              </span>
              {user?.two_factor_enabled && (
                <>
                  <span className="text-gray-700 text-[10px]">|</span>
                  <span className="text-emerald-400 text-[9px] flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <Shield size={8} /> 2FA
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="sm:text-right text-[10px] text-gray-600">
            <p>Member since</p>
            <p className="text-gray-400">{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
            {user?.avatar_url && (
              <button onClick={handleAvatarRemove} className="text-rose-400 hover:text-rose-300 mt-1.5 text-[9px]">
                Remove photo
              </button>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="px-3.5 pb-2.5 flex gap-1 overflow-x-auto border-t border-gray-800/50 pt-2">
          {PROFILE_SUB_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSubTabChange(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                activeSubTab === tab.key
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                  : 'text-gray-500 hover:text-white hover:bg-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'personal' && <PersonalInfoTab user={user} updateUser={updateUser} />}
      {activeSubTab === 'security' && <SecurityTab user={user} updateUser={updateUser} />}
      {activeSubTab === 'activity' && <ActivityTab />}
    </div>
  );
}

/* ─── PERSONAL INFO TAB ─── */
function PersonalInfoTab({ user, updateUser }: { user: UserType | null; updateUser: (u: UserType) => void }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await profileApi.updateProfile({ full_name: fullName, email, phone });
      updateUser(updated);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = fullName !== user?.full_name || email !== user?.email || phone !== (user?.phone || '');

  return (
    <div className="bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 overflow-hidden animate-fade-in-up">
      <div className="px-3.5 py-2.5 border-b border-gray-800/60 flex items-center gap-2">
        <Edit3 size={13} className="text-primary-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Personal Information</span>
      </div>
      <div className="p-3.5 space-y-3">
        {success && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-[11px]">
            <CheckCircle2 size={12} />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-[11px]">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Full Name</label>
            <div className="relative">
              <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white text-[11px] focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Email Address</label>
            <div className="relative">
              <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white text-[11px] focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Phone Number</label>
            <div className="relative">
              <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 XXX XXX XXXX"
                className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-4 py-2 text-white text-[11px] placeholder-gray-600 focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Campus</label>
            <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2">
              <Building2 size={12} className="text-gray-600" />
              <span className="text-gray-300 text-[11px]">{user?.campus?.replace('_', ' ').toUpperCase()}</span>
              <span className="ml-auto text-[9px] text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded">READ ONLY</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Role</label>
            <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2">
              <Shield size={12} className="text-gray-600" />
              <span className="text-gray-300 text-[11px]">{user?.role?.toUpperCase()}</span>
              <span className="ml-auto text-[9px] text-gray-600 bg-gray-900 px-1.5 py-0.5 rounded">READ ONLY</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Last Login</label>
            <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2">
              <LogIn size={12} className="text-gray-600" />
              <span className="text-gray-300 text-[11px]">
                {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="flex justify-end pt-1.5">
            <Button onClick={handleSave} size="sm" disabled={saving} className="inline-flex items-center whitespace-nowrap bg-gradient-to-r from-primary-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500">
              {saving ? <RefreshCw size={11} className="mr-1.5 animate-spin" /> : <Save size={11} className="mr-1.5" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── SECURITY TAB ─── */
function SecurityTab({ user, updateUser }: { user: UserType | null; updateUser: (u: UserType) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // 2FA states
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFASuccess, setTwoFASuccess] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await profileApi.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      const data = await profileApi.setup2FA();
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setShow2FASetup(true);
    } catch (err: any) {
      setTwoFAError(err.response?.data?.detail || 'Failed to setup 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFACode.length !== 6) {
      setTwoFAError('Please enter a 6-digit code');
      return;
    }
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await profileApi.verify2FA(twoFACode);
      setTwoFASuccess('2FA enabled successfully');
      setShow2FASetup(false);
      setQrCode('');
      setSecret('');
      setTwoFACode('');
      updateUser({ ...user!, two_factor_enabled: true });
      setTimeout(() => setTwoFASuccess(''), 3000);
    } catch (err: any) {
      setTwoFAError(err.response?.data?.detail || 'Invalid code');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setTwoFAError('Please enter your password');
      return;
    }
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await profileApi.disable2FA(disablePassword);
      setTwoFASuccess('2FA disabled successfully');
      setShow2FADisable(false);
      setDisablePassword('');
      updateUser({ ...user!, two_factor_enabled: false });
      setTimeout(() => setTwoFASuccess(''), 3000);
    } catch (err: any) {
      setTwoFAError(err.response?.data?.detail || 'Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Change Password */}
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <Lock size={12} className="text-amber-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Change Password</span>
        </div>
        <div className="p-4 space-y-3">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Current Password</label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-white text-[11px] focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40 focus:outline-none transition-all"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-white text-[11px] focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40 focus:outline-none transition-all"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-4 py-1.5 text-white text-[11px] focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleChangePassword} size="sm" disabled={saving || !currentPassword || !newPassword} className="inline-flex items-center whitespace-nowrap">
              {saving ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Lock size={12} className="mr-1.5" />}
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <Shield size={12} className="text-green-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Two-Factor Authentication</span>
          {user?.two_factor_enabled ? (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> ENABLED
            </span>
          ) : (
            <span className="ml-auto text-[11px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md">DISABLED</span>
          )}
        </div>
        <div className="p-4 space-y-3">
          {twoFASuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
              <CheckCircle2 size={16} />
              {twoFASuccess}
            </div>
          )}
          {twoFAError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} />
              {twoFAError}
            </div>
          )}

          {!user?.two_factor_enabled && !show2FASetup && (
            <div className="text-center py-4">
              <Shield size={28} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-[12px] mb-1">Add an extra layer of security to your account</p>
              <p className="text-gray-600 text-[10px] mb-3">Use an authenticator app like Google Authenticator or Authy</p>
              <Button onClick={handleSetup2FA} size="sm" disabled={twoFALoading} className="inline-flex items-center whitespace-nowrap">
                {twoFALoading ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Shield size={12} className="mr-1.5" />}
                {twoFALoading ? 'Setting up...' : 'Enable 2FA'}
              </Button>
            </div>
          )}

          {show2FASetup && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-400 text-[12px] mb-2">Scan this QR code with your authenticator app</p>
                <div className="inline-block p-2 bg-white rounded-lg">
                  <img src={qrCode} alt="2FA QR Code" className="w-36 h-36" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-[10px] mb-1.5">Or enter this code manually:</p>
                <code className="bg-gray-800 px-2 py-1 rounded-md text-cyan-400 text-[12px] font-mono select-all">{secret}</code>
              </div>
              <div className="max-w-xs mx-auto">
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5 text-center">Enter 6-digit code</label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-center text-sm font-mono tracking-[0.3em] focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 focus:outline-none transition-all"
                  maxLength={6}
                />
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="secondary" onClick={() => { setShow2FASetup(false); setQrCode(''); setSecret(''); setTwoFACode(''); setTwoFAError(''); }} size="sm" className="inline-flex items-center whitespace-nowrap">
                  <X size={12} className="mr-1.5" />Cancel
                </Button>
                <Button onClick={handleVerify2FA} size="sm" disabled={twoFALoading || twoFACode.length !== 6} className="inline-flex items-center whitespace-nowrap">
                  {twoFALoading ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <CheckCircle2 size={12} className="mr-1.5" />}
                  {twoFALoading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </div>
          )}

          {user?.two_factor_enabled && !show2FADisable && (
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-gray-300 text-sm font-medium">2FA is active</p>
                <p className="text-gray-500 text-xs">Your account is protected with two-factor authentication</p>
              </div>
              <Button variant="danger" onClick={() => setShow2FADisable(true)} size="sm" className="inline-flex items-center whitespace-nowrap">
                Disable
              </Button>
            </div>
          )}

          {show2FADisable && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">Enter your password to disable 2FA:</p>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 focus:outline-none transition-all"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { setShow2FADisable(false); setDisablePassword(''); setTwoFAError(''); }} size="sm" className="inline-flex items-center whitespace-nowrap">
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDisable2FA} size="sm" disabled={twoFALoading || !disablePassword} className="inline-flex items-center whitespace-nowrap">
                  {twoFALoading ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Shield size={12} className="mr-1.5" />}
                  {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Security Info */}
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <Shield size={12} className="text-cyan-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Security Info</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-gray-400 text-sm">Password</span>
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Set
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-800/60">
            <span className="text-gray-400 text-sm">Two-Factor Auth</span>
            <span className={`flex items-center gap-1.5 text-sm ${user?.two_factor_enabled ? 'text-green-400' : 'text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user?.two_factor_enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
              {user?.two_factor_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-800/60">
            <span className="text-gray-400 text-sm">Account Status</span>
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ACTIVITY TAB ─── */
function ActivityTab() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    setLoading(true);
    try {
      const logs = await profileApi.getActivity(20);
      setActivities(logs);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'profile_updated': return <Edit3 size={12} className="text-blue-400" />;
      case 'password_changed': return <Key size={12} className="text-amber-400" />;
      case 'login': return <LogIn size={12} className="text-green-400" />;
      default: return <Clock size={12} className="text-gray-400" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'profile_updated': return 'Profile Updated';
      case 'password_changed': return 'Password Changed';
      case 'login': return 'Logged In';
      default: return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
      <div className="p-4 border-b border-gray-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={12} className="text-cyan-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Activity Log</span>
        </div>
        <button onClick={loadActivity} className="text-gray-500 hover:text-gray-300 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center">
          <RefreshCw size={24} className="text-gray-600 animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Loading activity...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="p-10 flex flex-col items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center mb-2">
            <History size={16} className="text-gray-600" />
          </div>
          <p className="text-gray-500 text-[12px] font-medium">No activity yet</p>
          <p className="text-gray-600 text-[10px] mt-0.5">Your actions will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800/60">
          {activities.map((log) => (
            <div key={log.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-800/20 transition-colors">
              <div className="w-6 h-6 rounded-md bg-gray-800/80 border border-gray-700/50 flex items-center justify-center flex-shrink-0">
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{getActionLabel(log.action)}</p>
                {log.details && (
                  <p className="text-gray-500 text-xs mt-0.5">
                    {Object.entries(log.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-gray-500 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleDateString() : ''}</p>
                <p className="text-gray-600 text-[10px]">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── VIDEO TAB ─── */
function VideoTab({ settings }: { settings: SettingsState }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadDevices();
    return () => { previewStream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    if (videoRef.current && previewStream) videoRef.current.srcObject = previewStream;
  }, [previewStream]);

  const loadDevices = async () => {
    setIsRefreshing(true);
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((s) => s.getTracks().forEach((t) => t.stop()));
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) setSelectedDevice(videoDevices[0].deviceId);
    } catch (err) { console.error('Failed to enumerate devices:', err); }
    finally { setTimeout(() => setIsRefreshing(false), 600); }
  };

  const startPreview = async () => {
    setIsTesting(true);
    try {
      previewStream?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true, audio: false,
      });
      setPreviewStream(stream);
    } catch (err) { console.error('Preview failed:', err); }
    finally { setIsTesting(false); }
  };

  const stopPreview = () => { previewStream?.getTracks().forEach((t) => t.stop()); setPreviewStream(null); };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <Monitor size={12} className="text-cyan-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Video Quality</span>
        </div>
        <div className="p-4 divide-y divide-gray-800/60">
          <SettingRow icon={<Monitor size={12} className="text-cyan-400" />} iconBg="bg-cyan-500/10 border border-cyan-500/20" label="HD Video" description="Use high-definition video quality (720p)">
            <Toggle enabled={settings.hdVideo} onChange={() => { const next = !settings.hdVideo; settings.setHdVideo(next); pushSettingsToast('HD Video', next); }} />
          </SettingRow>
          <SettingRow icon={<Monitor size={12} className="text-blue-400" />} iconBg="bg-blue-500/10 border border-blue-500/20" label="Mirror Video" description="Mirror your local camera preview">
            <Toggle enabled={settings.mirrorVideo} onChange={() => { const next = !settings.mirrorVideo; settings.setMirrorVideo(next); pushSettingsToast('Mirror Video', next); }} />
          </SettingRow>
        </div>
      </div>

      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <Camera size={12} className="text-cyan-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Camera Device</span>
          {previewStream && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> ACTIVE
            </span>
          )}
        </div>
        <div className="p-4 space-y-4">
          <div className="relative bg-gray-950 rounded-xl overflow-hidden aspect-video border border-gray-800/40">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!previewStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80">
                <div className="w-12 h-12 rounded-xl bg-gray-800/80 border border-gray-700/50 flex items-center justify-center mb-2">
                  <Aperture size={22} className="text-gray-600" />
                </div>
                <p className="text-gray-500 text-[12px] font-medium">No preview active</p>
                <p className="text-gray-600 text-[10px] mt-0.5">Click "Test Camera" to start</p>
              </div>
            )}
          </div>
          <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-[11px] focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 focus:outline-none transition-all">
            {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${devices.indexOf(d) + 1}`}</option>))}
            {devices.length === 0 && <option value="">No cameras detected</option>}
          </select>
          <div className="flex items-center gap-2">
            <Button onClick={startPreview} disabled={isTesting} size="sm" className="inline-flex items-center whitespace-nowrap">
              <Camera size={12} className="mr-1.5" />{isTesting ? 'Starting...' : 'Test Camera'}
            </Button>
            <Button variant="secondary" onClick={stopPreview} disabled={!previewStream} size="sm" className="inline-flex items-center whitespace-nowrap">
              <CameraOff size={12} className="mr-1.5" />Stop
            </Button>
            <Button variant="ghost" onClick={loadDevices} size="sm" className="inline-flex items-center whitespace-nowrap">
              <RefreshCw size={12} className={`mr-1.5 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── AUDIO TAB ─── */
function AudioTab({ settings }: { settings: SettingsState }) {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { loadDevices(); return () => { stopMicTest(); }; }, []);

  useEffect(() => {
    if (settings.selectedMicId) setSelectedInput(settings.selectedMicId);
    if (settings.selectedSpeakerId) setSelectedOutput(settings.selectedSpeakerId);
  }, []);

  const loadDevices = async () => {
    setIsRefreshing(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((s) => s.getTracks().forEach((t) => t.stop()));
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(allDevices.filter((d) => d.kind === 'audioinput'));
      setOutputDevices(allDevices.filter((d) => d.kind === 'audiooutput'));
    } catch (err) { console.error('Failed to enumerate audio devices:', err); }
    finally { setTimeout(() => setIsRefreshing(false), 600); }
  };

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedInput ? { deviceId: { exact: selectedInput } } : true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      setIsTestingMic(true);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) { console.error('Mic test failed:', err); }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsTestingMic(false); setMicLevel(0);
  };

  const toggleMute = () => {
    if (streamRef.current) streamRef.current.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <AudioLines size={12} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Audio Quality</span>
        </div>
        <div className="p-4 divide-y divide-gray-800/60">
          <SettingRow icon={<AudioLines size={12} className="text-purple-400" />} iconBg="bg-purple-500/10 border border-purple-500/20" label="HD Audio" description="Use high-quality audio encoding (48kHz)">
            <Toggle enabled={settings.hdAudio} onChange={() => { const next = !settings.hdAudio; settings.setHdAudio(next); pushSettingsToast('HD Audio', next); }} />
          </SettingRow>
          <SettingRow icon={<Volume2 size={12} className="text-pink-400" />} iconBg="bg-pink-500/10 border border-pink-500/20" label="Echo Cancellation" description="Reduce echo during speaker playback">
            <Toggle enabled={settings.echoCancellation} onChange={() => { const next = !settings.echoCancellation; settings.setEchoCancellation(next); pushSettingsToast('Echo Cancellation', next); }} />
          </SettingRow>
          <SettingRow icon={<AudioLines size={12} className="text-emerald-400" />} iconBg="bg-emerald-500/10 border border-emerald-500/20" label="Noise Suppression" description="Filter background noise from microphone">
            <Toggle enabled={settings.noiseSuppression} onChange={() => { const next = !settings.noiseSuppression; settings.setNoiseSuppression(next); pushSettingsToast('Noise Suppression', next); }} />
          </SettingRow>
          <SettingRow icon={<Volume2 size={12} className="text-amber-400" />} iconBg="bg-amber-500/10 border border-amber-500/20" label="Auto Gain Control" description="Automatically adjust microphone sensitivity">
            <Toggle enabled={settings.autoGainControl} onChange={() => { const next = !settings.autoGainControl; settings.setAutoGainControl(next); pushSettingsToast('Auto Gain Control', next); }} />
          </SettingRow>
        </div>
      </div>

      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <Mic size={12} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Microphone</span>
          {isTestingMic && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> TESTING
            </span>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Input Device</label>
            <select value={selectedInput} onChange={(e) => { setSelectedInput(e.target.value); settings.setSelectedMicId(e.target.value); pushSettingsToast('Microphone', !!e.target.value); }} className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-[11px] focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/40 focus:outline-none transition-all">
              {inputDevices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>))}
              {inputDevices.length === 0 && <option value="">No microphones detected</option>}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Input Level</label>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
              <div className="h-full rounded-full transition-all duration-75" style={{
                width: `${micLevel * 100}%`,
                background: micLevel > 0.8 ? 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' : micLevel > 0.5 ? 'linear-gradient(90deg, #22c55e, #eab308)' : 'linear-gradient(90deg, #22c55e, #22d3ee)',
                boxShadow: micLevel > 0 ? `0 0 10px ${micLevel > 0.8 ? 'rgba(239,68,68,0.4)' : micLevel > 0.5 ? 'rgba(234,179,8,0.4)' : 'rgba(34,197,94,0.4)'}` : 'none',
              }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">{isTestingMic ? `Level: ${Math.round(micLevel * 100)}%` : 'Click "Test Microphone" to start'}</p>
          </div>
          <div className="flex gap-2">
            {!isTestingMic ? (
              <Button onClick={startMicTest} size="sm" className="inline-flex items-center whitespace-nowrap"><Mic size={12} className="mr-1.5" />Test Mic</Button>
            ) : (
              <Button variant="danger" onClick={stopMicTest} size="sm" className="inline-flex items-center whitespace-nowrap"><MicOff size={12} className="mr-1.5" />Stop Test</Button>
            )}
            <Button variant="secondary" onClick={toggleMute} disabled={!isTestingMic} size="sm" className="inline-flex items-center whitespace-nowrap">
              {isMuted ? <VolumeX size={12} className="mr-1.5" /> : <Volume2 size={12} className="mr-1.5" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
          <Speaker size={12} className="text-cyan-400" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Speaker / Output</span>
        </div>
        <div className="p-5">
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Output Device</label>
          <select value={selectedOutput} onChange={(e) => { setSelectedOutput(e.target.value); settings.setSelectedSpeakerId(e.target.value); pushSettingsToast('Speaker', !!e.target.value); }} className="w-full bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-[11px] focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 focus:outline-none transition-all">
            {outputDevices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || 'Speaker'}</option>))}
            {outputDevices.length === 0 && <option value="">No speakers detected</option>}
          </select>
        </div>
      </div>

      <Button variant="ghost" onClick={loadDevices} size="sm" className="inline-flex items-center whitespace-nowrap">
        <RefreshCw size={12} className={`mr-1.5 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh Devices
      </Button>
    </div>
  );
}

/* ─── CONNECTION TAB ─── */
function ConnectionTab({ settings }: { settings: SettingsState }) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
      <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
        <Wifi size={12} className="text-green-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Connection</span>
      </div>
      <div className="p-4 divide-y divide-gray-800/60">
        <SettingRow icon={<Wifi size={12} className="text-green-400" />} iconBg="bg-green-500/10 border border-green-500/20" label="Auto Reconnect" description="Automatically reconnect if connection drops">
          <Toggle enabled={settings.autoReconnect} onChange={() => { const next = !settings.autoReconnect; settings.setAutoReconnect(next); pushSettingsToast('Auto Reconnect', next); }} />
        </SettingRow>
        <SettingRow icon={<Globe size={12} className="text-cyan-400" />} iconBg="bg-cyan-500/10 border border-cyan-500/20" label="Low Latency Mode" description="Prioritize low latency over video quality">
          <Toggle enabled={settings.lowLatency} onChange={() => { const next = !settings.lowLatency; settings.setLowLatency(next); pushSettingsToast('Low Latency Mode', next); }} />
        </SettingRow>
      </div>
    </div>
  );
}

/* ─── NOTIFICATIONS TAB ─── */
function NotificationsTab({ settings }: { settings: SettingsState }) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
      <div className="p-3 border-b border-gray-800/60 flex items-center gap-1.5">
        <Bell size={12} className="text-amber-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Notifications</span>
      </div>
      <div className="p-5">
        <SettingRow icon={<Bell size={12} className="text-amber-400" />} iconBg="bg-amber-500/10 border border-amber-500/20" label="Enable Notifications" description="Receive alerts for announcements and emergencies">
          <Toggle enabled={settings.notifications} onChange={() => { const next = !settings.notifications; settings.setNotifications(next); pushSettingsToast('Notifications', next); }} />
        </SettingRow>
      </div>
    </div>
  );
}
