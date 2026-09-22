import { useState, useEffect, useMemo } from 'react';
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
  login: { label: 'User Login', icon: <LogIn size={12} />, chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
  logout: { label: 'User Logout', icon: <LogOut size={12} />, chip: 'bg-gray-800/60 text-gray-400 border-gray-700/50' },
  session_start: { label: 'Session Started', icon: <Play size={12} />, chip: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' },
  session_end: { label: 'Session Ended', icon: <Square size={12} />, chip: 'bg-sky-500/10 text-sky-400 border-sky-500/25' },
  emergency_trigger: { label: 'Emergency Triggered', icon: <AlertTriangle size={12} />, chip: 'bg-rose-500/10 text-rose-400 border-rose-500/25' },
  user_create: { label: 'User Created', icon: <UserPlus size={12} />, chip: 'bg-violet-500/10 text-violet-400 border-violet-500/25' },
  user_delete: { label: 'User Deactivated', icon: <Trash2 size={12} />, chip: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  user_update: { label: 'User Updated', icon: <Shield size={12} />, chip: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' },
  cache_clear: { label: 'Cache Cleared', icon: <Database size={12} />, chip: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/25' },
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
    ACTION_META[action] || { label: action, icon: <Activity size={12} />, chip: 'bg-gray-800/60 text-gray-400 border-gray-700/50' };

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
    { label: 'Total Events', value: logs.length, icon: ClipboardList, iconCls: 'bg-violet-500/10 border-violet-500/25 text-violet-400', valCls: 'text-violet-400' },
    { label: 'Logins', value: actionCounts['login'] || 0, icon: LogIn, iconCls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', valCls: 'text-emerald-400' },
    { label: 'Sessions', value: (actionCounts['session_start'] || 0) + (actionCounts['session_end'] || 0), icon: Play, iconCls: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400', valCls: 'text-cyan-400' },
    { label: 'Emergencies', value: actionCounts['emergency_trigger'] || 0, icon: AlertTriangle, iconCls: 'bg-rose-500/10 border-rose-500/25 text-rose-400', valCls: 'text-rose-400' },
  ];

  const filterChips = [
    { value: 'all', label: 'All', count: logs.length },
    ...Object.keys(actionCounts)
      .sort((a, b) => actionCounts[b] - actionCounts[a])
      .map((action) => ({ value: action, label: actionMeta(action).label, count: actionCounts[action] })),
  ];

  return (
    <div className="h-full flex flex-col p-3 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-violet-500/25 flex items-center justify-center">
            <ClipboardList size={16} className="text-violet-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide">Audit Logs</h1>
            <p className="text-gray-500 text-[10px] sm:text-[11px]">Security and system events across the portal</p>
          </div>
        </div>
        <button
          onClick={() => loadLogs(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-950/80 border border-gray-800 hover:border-violet-500/40 text-gray-300 text-[11px] rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="group relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 p-2.5 transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_0_18px_rgba(167,139,250,0.06)]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-6 h-6 shrink-0 rounded-md border flex items-center justify-center ${stat.iconCls}`}>
                <stat.icon size={12} />
              </div>
              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium truncate">{stat.label}</span>
            </div>
            <p className={`text-base sm:text-lg font-bold font-mono leading-none ${stat.valCls}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 p-3 pb-4 space-y-3 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search action, user ID, IP, or details…"
            className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-8 py-2 text-white text-[11px] placeholder-gray-600 focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pb-0.5">
          <Filter size={11} className="text-gray-600" />
          {filterChips.slice(0, 8).map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setActionFilter(chip.value); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
                actionFilter === chip.value
                  ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                  : 'bg-gray-900/60 border-gray-800 text-gray-500 hover:text-white hover:border-gray-700'
              }`}
            >
              {chip.label}
              <span className="ml-1 opacity-60 font-mono">{chip.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Loader2 size={24} className="animate-spin mb-2.5 text-violet-400" />
          <p className="text-[11px]">Loading audit logs…</p>
        </div>
      ) : pageLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
          <div className="w-11 h-11 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center mb-2.5">
            <Inbox size={18} className="text-gray-600" />
          </div>
          <p className="text-white text-[12px] font-medium mb-1">No audit logs found</p>
          <p className="text-[11px] text-center px-4">{searchQuery || actionFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Events will appear here as users interact with the system.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pageLogs.map((log, i) => {
            const meta = actionMeta(log.action);
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 hover:border-violet-500/30 transition-all duration-300 overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className={`w-7 h-7 shrink-0 rounded-md border flex items-center justify-center ${meta.chip}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-[12px] font-medium">{meta.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${meta.chip}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {formatDate(log.timestamp)} {formatTime(log.timestamp)}
                      </span>
                      <span className="font-mono hidden sm:inline">{log.user_id?.slice(0, 8)}…</span>
                      {log.ip_address && <span className="hidden md:inline font-mono">{log.ip_address}</span>}
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-gray-600 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-gray-800/60 animate-fade-in-up">
                    <div className="pt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <DetailTile label="User ID" value={log.user_id || '-'} mono />
                      <DetailTile label="IP Address" value={log.ip_address || '-'} mono />
                      <DetailTile label="Timestamp" value={`${formatDate(log.timestamp)} ${formatTime(log.timestamp)}`} />
                      <div className="sm:col-span-3">
                        <DetailTile
                          label="Details"
                          value={log.details ? JSON.stringify(log.details, null, 2) : 'No additional details'}
                          mono
                        />
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
          <p className="text-gray-600 text-[10px] font-mono">
            {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filteredLogs.length)} / {filteredLogs.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-md bg-gray-950/80 border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-gray-500 text-[11px] px-1.5 font-mono">
              {safePage}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-md bg-gray-950/80 border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-2.5 bg-gray-900/50 rounded-lg border border-gray-800/50">
      <p className="text-gray-600 text-[9px] uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-gray-300 text-[11px] break-all whitespace-pre-wrap ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
