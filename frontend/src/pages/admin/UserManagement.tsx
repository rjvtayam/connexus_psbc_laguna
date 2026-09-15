import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
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
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { label: 'Active', value: users.filter(u => u.is_active).length, icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Teachers', value: users.filter(u => u.role === 'teacher').length, icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-cyan-500/20 border border-primary-500/20 flex items-center justify-center">
              <Users size={20} className="text-primary-400 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="font-orbitron text-xl sm:text-2xl font-bold text-white">User Management</h1>
              <p className="text-gray-500 text-xs sm:text-sm">
                {users.length} registered user(s)
                {isAdmin && <span className="ml-2 text-primary-400">(Admin)</span>}
                {isPrincipal && <span className="ml-2 text-amber-400">(Principal)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setIsAddingUser(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all duration-300 hover:scale-105"
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 p-4 hover:border-gray-700/60 transition-all duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Permission Info */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isAdmin ? 'bg-primary-500/5 border-primary-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <div className={`w-8 h-8 rounded-xl ${isAdmin ? 'bg-primary-500/15' : 'bg-amber-500/15'} flex items-center justify-center`}>
            <Shield size={16} className={isAdmin ? 'text-primary-400' : 'text-amber-400'} />
          </div>
          <p className={`text-sm ${isAdmin ? 'text-primary-300' : 'text-amber-300'}`}>
            {isAdmin ? (
              <>You can create <strong>Principal</strong> and <strong>Teacher</strong> accounts.</>
            ) : (
              <>You can create <strong>Staff</strong> accounts for your campus only.</>
            )}
          </p>
        </div>

        {/* Add User Form - Compact Design */}
        {isAddingUser && (
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden animate-fade-in-up">
            <div className="p-4 border-b border-gray-800/60 flex items-center justify-between bg-gradient-to-r from-primary-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/20 flex items-center justify-center">
                  <UserPlus size={14} className="text-primary-400" />
                </div>
                <span className="text-sm font-semibold text-white">Create New User</span>
              </div>
              <button
                onClick={() => { setIsAddingUser(false); setError(''); }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      placeholder="Juan Dela Cruz"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@psbc.edu.ph"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Password */}
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Min 8 chars, mixed case + number"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-10 py-2.5 text-white text-sm placeholder-gray-600 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
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
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
                  <div className="relative">
                    <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-9 py-2.5 text-white text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      {availableRoles.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Campus */}
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Campus</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                    <select
                      value={newUser.campus}
                      onChange={(e) => setNewUser({ ...newUser, campus: e.target.value as 'paete' | 'pagsanjan' | 'control_room' })}
                      disabled={!isAdmin}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-9 py-2.5 text-white text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800/60">
                <button
                  type="button"
                  onClick={() => { setIsAddingUser(false); setError(''); }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 hover:from-primary-500 hover:to-cyan-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all duration-300 disabled:opacity-50"
                >
                  {creating ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-gray-900/80 backdrop-blur-xl border border-gray-800/60 rounded-xl pl-9 pr-10 py-2.5 text-white text-sm placeholder-gray-600 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {roleFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveRoleFilter(filter.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  activeRoleFilter === filter.value
                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                    : 'bg-gray-800/60 text-gray-500 border border-gray-800/60 hover:bg-gray-800 hover:text-gray-300'
                }`}
              >
                {filter.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  activeRoleFilter === filter.value ? 'bg-primary-500/20' : 'bg-gray-700/50'
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {/* List Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</span>
            </div>
            <span className="text-[11px] text-gray-600">
              {filteredUsers.length} of {users.length}
            </span>
          </div>

          {/* User Cards Grid */}
          {paginatedUsers.length === 0 ? (
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 px-5 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm font-medium">No users found</p>
              <p className="text-gray-600 text-xs mt-1">{searchQuery ? 'Try a different search' : 'Create your first user'}</p>
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
                    className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
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
                    <div className="absolute top-0 right-0 w-8 h-8 border-t border-r rounded-tr-2xl pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity" style={{ borderColor: `${c}40` }} />

                    <div className="p-4">
                      {/* Top: Avatar + Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="relative">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300"
                            style={{
                              background: `linear-gradient(135deg, ${c}20, ${c}08)`,
                              border: `1.5px solid ${c}30`,
                            }}
                          >
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold" style={{ color: c }}>{user.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                            )}
                          </div>
                          {/* Online dot */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${user.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                        </div>

                        {/* Role badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${role.bg} ${role.color}`}>
                          {role.icon}
                          {role.label}
                        </span>
                      </div>

                      {/* Name + Email */}
                      <h3 className="text-white text-sm font-semibold truncate mb-0.5">{user.full_name}</h3>
                      <p className="text-gray-500 text-[11px] truncate mb-3">{user.email}</p>

                      {/* Campus + Status row */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${campusColor}`}>
                          <Building2 size={10} />
                          {user.campus?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          user.is_active ? 'text-green-400 bg-green-500/10' : 'text-gray-500 bg-gray-800'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                          {user.is_active ? 'Active' : 'Off'}
                        </span>
                      </div>

                      {/* Delete button - shows on hover */}
                      <div className="mt-3 pt-3 border-t border-gray-800/50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:bg-gray-700/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${
                    page === safeCurrentPage
                      ? 'bg-primary-500/20 border border-primary-500/40 text-primary-400 shadow-lg shadow-primary-500/10'
                      : 'bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:bg-gray-700/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
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
    </DashboardLayout>
  );
}
