import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { api } from '../../api/axios';
import { formatDate, formatTime } from '../../lib/utils';
import {
  ClipboardList, Search, RefreshCw, Filter, ChevronDown, ChevronLeft,
  ChevronRight, LogIn, LogOut, Play, Square, AlertTriangle, UserPlus,
  Trash2, Shield, Activity, X, Inbox, Clock, Loader2, Database
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  ip_address: string;
  timestamp: string;
}

interface ActionMeta {
  label: string;
  icon: React.ReactNode;
  chip: string;
}

const ACTION_META: Record<string, ActionMeta> = {
  login: { label: 'User Login', icon: <LogIn size={14} />, chip: 'bg-green-500/10 text-green-400 border-green-500/20' },
  logout: { label: 'User Logout', icon: <LogOut size={14} />, chip: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  session_start: { label: 'Session Started', icon: <Play size={14} />, chip: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  session_end: { label: 'Session Ended', icon: <Square size={14} />, chip: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  emergency_trigger: { label: 'Emergency Triggered', icon: <AlertTriangle size={14} />, chip: 'bg-red-500/10 text-red-400 border-red-500/20' },
  user_create: { label: 'User Created', icon: <UserPlus size={14} />, chip: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  user_delete: { label: 'User Deactivated', icon: <Trash2 size={14} />, chip: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  user_update: { label: 'User Updated', icon: <Shield size={14} />, chip: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  cache_clear: { label: 'Cache Cleared', icon: <Database size={14} />, chip: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
};

const PAGE_SIZE = 12;

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await api.get('/dashboard/audit-logs', { params: { limit: 500 } });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const actionMeta = (action: string): ActionMeta =>
    ACTION_META[action] || { label: action, icon: <Activity size={14} />, chip: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((l) => { counts[l.action] = (counts[l.action] || 0) + 1; });
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (actionFilter !== 'all') {
      result = result.filter((l) => l.action === actionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          actionMeta(l.action).label.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.user_id?.toLowerCase().includes(q) ||
          l.ip_address?.toLowerCase().includes(q) ||
          JSON.stringify(l.details || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, actionFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageLogs = filteredLogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = [
    { label: 'Total Events', value: logs.length, icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Logins', value: actionCounts['login'] || 0, icon: LogIn, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Sessions', value: (actionCounts['session_start'] || 0) + (actionCounts['session_end'] || 0), icon: Play, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Emergencies', value: actionCounts['emergency_trigger'] || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  const filterChips = [
    { value: 'all', label: 'All', count: logs.length },
    ...Object.keys(actionCounts)
      .sort((a, b) => actionCounts[b] - actionCounts[a])
      .map((action) => ({ value: action, label: actionMeta(action).label, count: actionCounts[action] })),
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
              <ClipboardList size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="font-orbitron text-xl sm:text-2xl font-bold text-white">Audit Logs</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Track every security and system event across the portal</p>
            </div>
          </div>
          <button
            onClick={() => loadLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 border border-gray-700/50 hover:border-purple-500/40 text-gray-300 text-sm rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 p-4 hover:border-gray-700/60 transition-all duration-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 p-4 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by action, user ID, IP, or details..."
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-9 py-2.5 text-white text-sm placeholder-gray-600 focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-gray-500" />
            {filterChips.slice(0, 8).map((chip) => (
              <button
                key={chip.value}
                onClick={() => { setActionFilter(chip.value); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  actionFilter === chip.value
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-gray-800/60 border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                {chip.label}
                <span className="ml-1.5 opacity-60">{chip.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Log List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 size={32} className="animate-spin mb-3 text-purple-400" />
            <p className="text-sm">Loading audit logs...</p>
          </div>
        ) : pageLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center mb-4">
              <Inbox size={28} className="text-gray-600" />
            </div>
            <p className="text-white font-medium mb-1">No audit logs found</p>
            <p className="text-sm">{searchQuery || actionFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Events will appear here as users interact with the system.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pageLogs.map((log, i) => {
              const meta = actionMeta(log.action);
              const isExpanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 hover:border-gray-700/60 transition-all duration-300 overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full flex items-center gap-3 sm:gap-4 p-4 text-left"
                  >
                    <div className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${meta.chip}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{meta.label}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${meta.chip}`}>
                          {log.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(log.timestamp)} {formatTime(log.timestamp)}
                        </span>
                        <span className="font-mono hidden sm:inline">{log.user_id?.slice(0, 8)}...</span>
                        {log.ip_address && <span className="hidden md:inline font-mono">{log.ip_address}</span>}
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-800/60 animate-fade-in-up">
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-800/40 rounded-xl">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">User ID</p>
                          <p className="text-gray-300 text-xs font-mono break-all">{log.user_id || '-'}</p>
                        </div>
                        <div className="p-3 bg-gray-800/40 rounded-xl">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">IP Address</p>
                          <p className="text-gray-300 text-xs font-mono">{log.ip_address || '-'}</p>
                        </div>
                        <div className="p-3 bg-gray-800/40 rounded-xl">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Timestamp</p>
                          <p className="text-gray-300 text-xs">{formatDate(log.timestamp)} {formatTime(log.timestamp)}</p>
                        </div>
                        <div className="p-3 bg-gray-800/40 rounded-xl sm:col-span-3">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Details</p>
                          <p className="text-gray-300 text-xs font-mono break-all whitespace-pre-wrap">
                            {log.details ? JSON.stringify(log.details, null, 2) : 'No additional details'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredLogs.length > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">
              Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-2 rounded-lg bg-gray-900/80 border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-gray-400 text-sm px-2">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-2 rounded-lg bg-gray-900/80 border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
