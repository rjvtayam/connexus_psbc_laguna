import { useState, useEffect } from 'react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { User } from '../../types/user';
import { api } from '../../api/axios';
import { useAuthStore } from '../../stores/authStore';
import {
  Trash2, Users, UserPlus, Mail, Lock, Building2, Shield,
  Search, X, AlertCircle, RefreshCw, Eye, EyeOff, User as UserIcon,
  ChevronDown, Crown, GraduationCap, Briefcase, UserCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';

export function UserManagement() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  const isPrincipal = currentUser?.role === 'principal';

  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 8;
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: isAdmin ? 'teacher' : 'staff',
    campus: isPrincipal && currentUser?.campus ? currentUser.campus : 'paete',
  });

  const availableRoles = isAdmin
    ? [
        { value: 'principal', label: 'Principal', icon: Crown, color: 'text-amber-400' },
        { value: 'teacher', label: 'Teacher', icon: GraduationCap, color: 'text-cyan-400' },
      ]
    : [
        { value: 'staff', label: 'Staff', icon: Briefcase, color: 'text-gray-400' },
      ];

  const availableCampuses = isAdmin
    ? [
        { value: 'paete', label: 'PSBC Paete' },
        { value: 'pagsanjan', label: 'PSBC Pagsanjan' },
        { value: 'control_room', label: 'Control Room' },
      ]
    : [
        { value: currentUser?.campus || 'paete', label: currentUser?.campus === 'paete' ? 'PSBC Paete' : 'PSBC Pagsanjan' },
      ];

  const roleFilters = [
    { value: 'all', label: 'All', count: users.length },
    { value: 'admin', label: 'Admin', count: users.filter(u => u.role === 'admin').length },
    { value: 'principal', label: 'Principal', count: users.filter(u => u.role === 'principal').length },
    { value: 'teacher', label: 'Teacher', count: users.filter(u => u.role === 'teacher').length },
    { value: 'staff', label: 'Staff', count: users.filter(u => u.role === 'staff').length },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/auth/register', newUser);
      setIsAddingUser(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: isAdmin ? 'teacher' : 'staff',
        campus: isPrincipal && currentUser?.campus ? currentUser.campus : 'paete',
      });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserIdToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userIdToDelete) return;
    try {
      await api.delete(`/users/${userIdToDelete}`);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setShowDeleteConfirm(false);
      setUserIdToDelete(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.campus?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = activeRoleFilter === 'all' || u.role === activeRoleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safeCurrentPage - 1) * USERS_PER_PAGE, safeCurrentPage * USERS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeRoleFilter]);

  const roleConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    principal: {
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: <Crown size={12} />,
      label: 'Principal'
    },
    admin: {
      color: 'text-primary-400',
      bg: 'bg-primary-500/10 border-primary-500/20',
      icon: <Shield size={12} />,
      label: 'Admin'
    },
    teacher: {
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      icon: <GraduationCap size={12} />,
      label: 'Teacher'
    },
    staff: {
      color: 'text-gray-400',
      bg: 'bg-gray-500/10 border-gray-500/20',
      icon: <Briefcase size={12} />,
      label: 'Staff'
    },
  };

  const campusColors: Record<string, string> = {
    paete: 'text-cyan-400',
    pagsanjan: 'text-purple-400',
    control_room: 'text-primary-400',
  };

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/25' },
    { label: 'Active', value: users.filter(u => u.is_active).length, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
    { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
    { label: 'Teachers', value: users.filter(u => u.role === 'teacher').length, icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' },
  ];

  return (
    <>
      <div className="p-3 sm:p-5 max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500/25 to-cyan-500/25 border border-primary-500/25 flex items-center justify-center">
              <Users size={16} className="text-primary-400" />
            </div>
            <div>
              <h1 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide">User Management</h1>
              <p className="text-gray-500 text-[10px] sm:text-[11px]">
                {users.length} registered user(s)
                {isAdmin && <span className="ml-2 text-primary-400">(Admin)</span>}
                {isPrincipal && <span className="ml-2 text-amber-400">(Principal)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setIsAddingUser(true); setError(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 text-white text-[11px] font-medium rounded-lg shadow-lg shadow-primary-500/20 transition-all duration-300"
          >
            <UserPlus size={12} />
            <span>Add User</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 p-3 hover:border-primary-500/30 transition-all duration-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
              <div className="flex items-center justify-between mb-2">
                <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon size={12} />
                </div>
                <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium">{stat.label}</span>
              </div>
              <p className={`text-base sm:text-lg font-bold font-mono leading-none ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Permission Info */}
        <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${isAdmin ? 'bg-primary-500/5 border-primary-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <div className={`w-6 h-6 rounded-md ${isAdmin ? 'bg-primary-500/15' : 'bg-amber-500/15'} flex items-center justify-center`}>
            <Shield size={12} className={isAdmin ? 'text-primary-400' : 'text-amber-400'} />
          </div>
          <p className={`text-[11px] ${isAdmin ? 'text-primary-300' : 'text-amber-300'}`}>
            {isAdmin ? (
              <>You can create <strong>Principal</strong> and <strong>Teacher</strong> accounts.</>
            ) : (
              <>You can create <strong>Staff</strong> accounts for your campus only.</>
            )}
          </p>
        </div>

        {/* Add User Form - Compact Design */}
        {isAddingUser && (
          <div className="bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 overflow-hidden animate-fade-in-up">
            <div className="px-3.5 py-2.5 border-b border-gray-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[22px] h-[22px] rounded-md bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
                  <UserPlus size={12} className="text-primary-400" />
                </div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Create New User</span>
              </div>
              <button
                onClick={() => { setIsAddingUser(false); setError(''); }}
                className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-3.5">
              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[11px] mb-3">
                  <AlertCircle size={12} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      placeholder="Juan Dela Cruz"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg pl-9 pr-4 py-2 text-white text-[11px] placeholder-gray-600 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@psbc.edu.ph"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg pl-9 pr-4 py-2 text-white text-[11px] placeholder-gray-600 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {/* Password */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Min 8 chars, mixed case + number"
                      required
                      className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-9 pr-10 py-2 text-white text-[11px] placeholder-gray-600 focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Role</label>
                  <div className="relative">
                    <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg pl-9 pr-9 py-2 text-white text-[11px] focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      {availableRoles.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {/* Campus */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Campus</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                    <select
                      value={newUser.campus}
                      onChange={(e) => setNewUser({ ...newUser, campus: e.target.value as 'paete' | 'pagsanjan' | 'control_room' })}
                      disabled={!isAdmin}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg pl-9 pr-9 py-2 text-white text-[11px] focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {availableCampuses.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div></div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2.5 border-t border-gray-800/60">
                <button
                  type="button"
                  onClick={() => { setIsAddingUser(false); setError(''); }}
                  className="px-3 py-1.5 text-[11px] text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 text-white text-[11px] font-medium rounded-lg shadow-lg shadow-primary-500/20 transition-all duration-300 disabled:opacity-50"
                >
                  {creating ? <RefreshCw size={12} className="animate-spin" /> : <UserPlus size={12} />}
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-gray-950/70 border border-gray-800 rounded-lg pl-8 pr-8 py-2 text-white text-[11px] placeholder-gray-600 focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pb-0.5">
            {roleFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveRoleFilter(filter.value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all duration-200 ${
                  activeRoleFilter === filter.value
                    ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                    : 'bg-gray-900/60 text-gray-500 border-gray-800 hover:text-white hover:border-gray-700'
                }`}
              >
                {filter.label}
                <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                  activeRoleFilter === filter.value ? 'bg-primary-500/20' : 'bg-gray-800/60'
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-2">
          {/* List Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-gray-600" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Users</span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono">
              {filteredUsers.length} of {users.length}
            </span>
          </div>

          {/* User Cards Grid */}
          {paginatedUsers.length === 0 ? (
            <div className="bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 px-4 py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-2.5">
                <Users size={16} className="text-gray-600" />
              </div>
              <p className="text-gray-400 text-[12px] font-medium">No users found</p>
              <p className="text-gray-600 text-[11px] mt-1">{searchQuery ? 'Try a different search' : 'Create your first user'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedUsers.map((user, index) => {
                const role = roleConfig[user.role] || roleConfig.staff;
                const campusColor = campusColors[user.campus] || 'text-gray-400';
                const campusGlow: Record<string, string> = {
                  paete: 'rgba(34,211,238,0.08)',
                  pagsanjan: 'rgba(168,85,247,0.08)',
                  control_room: 'rgba(59,130,246,0.08)',
                };
                const neon: Record<string, string> = {
                  paete: '#22d3ee',
                  pagsanjan: '#a855f7',
                  control_room: '#3b82f6',
                };
                const c = neon[user.campus] || '#6b7280';
                return (
                  <div
                    key={user.id}
                    className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(160deg, rgba(20,27,45,0.97) 0%, rgba(10,15,25,0.99) 100%)`,
                      border: `1px solid ${c}20`,
                      boxShadow: `0 0 20px ${campusGlow[user.campus] || 'rgba(0,0,0,0.3)'}, 0 4px 20px rgba(0,0,0,0.4)`,
                      animation: `fadeInUp 0.4s ease ${index * 60}ms both`,
                    }}
                  >
                    {/* Top neon line */}
                    <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: `linear-gradient(90deg, transparent, ${c}50, transparent)` }} />

                    {/* Corner accent */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t border-r rounded-tr-xl pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity" style={{ borderColor: `${c}40` }} />

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="relative">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300"
                            style={{
                              background: `linear-gradient(135deg, ${c}20, ${c}08)`,
                              border: `1.5px solid ${c}30`,
                            }}
                          >
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold" style={{ color: c }}>{user.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                            )}
                          </div>
                          {/* Online dot */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${user.is_active ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        </div>

                        {/* Role badge */}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${role.bg} ${role.color}`}>
                          {role.icon}
                          {role.label}
                        </span>
                      </div>

                      {/* Name + Email */}
                      <h3 className="text-white text-[12px] font-semibold truncate mb-0.5">{user.full_name}</h3>
                      <p className="text-gray-500 text-[10px] truncate mb-2.5">{user.email}</p>

                      {/* Campus + Status row */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${campusColor}`}>
                          <Building2 size={10} />
                          {user.campus?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded ${
                          user.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 bg-gray-900'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                          {user.is_active ? 'Active' : 'Off'}
                        </span>
                      </div>

                      {/* Delete button - shows on hover */}
                      <div className="mt-2.5 pt-2.5 border-t border-gray-800/50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 size={10} />
                          Deactivate
                        </button>
                      </div>
                    </div>

                    {/* Bottom glow dot */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-medium transition-all duration-200 bg-gray-950/80 border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={13} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-medium transition-all duration-200 ${
                    page === safeCurrentPage
                      ? 'bg-primary-500/15 border border-primary-500/40 text-primary-400'
                      : 'bg-gray-950/80 border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-medium transition-all duration-200 bg-gray-950/80 border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Deactivate User?"
        message="This user will no longer be able to sign in. You can reactivate them later from the user management panel."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        variant="danger"
        icon="trash"
        onConfirm={confirmDeleteUser}
        onCancel={() => { setShowDeleteConfirm(false); setUserIdToDelete(null); }}
      />
    </>
  );
}
