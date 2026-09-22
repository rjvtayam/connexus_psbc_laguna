import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Session } from '../../types/session';
import { sessionsApi } from '../../api/sessions.api';
import { formatDate, formatTime } from '../../lib/utils';
import {
  History, Search, RefreshCw, Filter, ChevronDown, ChevronLeft,
  ChevronRight, Play, Square, Clock, Calendar, Radio, X, Inbox,
  Loader2, Zap, CheckCircle
} from 'lucide-react';

const PAGE_SIZE = 12;

function formatDuration(started: string, ended: string | null): string {
  if (!ended) return 'In progress';
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  if (isNaN(ms) || ms < 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await sessionsApi.getAll();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const endedCount = sessions.filter((s) => s.status === 'ended').length;

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.id?.toLowerCase().includes(q) ||
          s.initiated_by?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sessions, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageSessions = filteredSessions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = [
    { label: 'Total Sessions', value: sessions.length, icon: History, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Active Now', value: activeCount, icon: Radio, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Completed', value: endedCount, icon: CheckCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'In Progress', value: activeCount, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const filterChips = [
    { value: 'all', label: 'All', count: sessions.length, icon: Filter },
    { value: 'active', label: 'Active', count: activeCount, icon: Radio },
    { value: 'ended', label: 'Ended', count: endedCount, icon: Square },
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-green-500/20 border border-cyan-500/20 flex items-center justify-center">
              <History size={20} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="font-orbitron text-xl sm:text-2xl font-bold text-white">Session History</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Review all past and ongoing intercampus video sessions</p>
            </div>
          </div>
          <button
            onClick={() => loadSessions(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 border border-gray-700/50 hover:border-cyan-500/40 text-gray-300 text-sm rounded-xl transition-all disabled:opacity-50"
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
              placeholder="Search by title, ID, or initiator..."
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-9 pr-9 py-2.5 text-white text-sm placeholder-gray-600 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 focus:outline-none transition-all"
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
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => { setStatusFilter(chip.value); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === chip.value
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-gray-800/60 border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <chip.icon size={12} />
                {chip.label}
                <span className="opacity-60">{chip.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Session List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 size={32} className="animate-spin mb-3 text-cyan-400" />
            <p className="text-sm">Loading sessions...</p>
          </div>
        ) : pageSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center mb-4">
              <Inbox size={28} className="text-gray-600" />
            </div>
            <p className="text-white font-medium mb-1">No sessions found</p>
            <p className="text-sm">{searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Sessions will appear here once video sessions begin.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pageSessions.map((session, i) => {
              const isActive = session.status === 'active';
              const isExpanded = expandedId === session.id;
              return (
                <div
                  key={session.id}
                  className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 hover:border-gray-700/60 transition-all duration-300 overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className="w-full flex items-center gap-3 sm:gap-4 p-4 text-left"
                  >
                    <div className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${
                      isActive
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {isActive ? <Play size={14} /> : <Square size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium truncate">{session.title || 'Untitled Session'}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          isActive
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                          {session.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(session.started_at)} {formatTime(session.started_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDuration(session.started_at, session.ended_at)}
                        </span>
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
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Session ID</p>
                          <p className="text-gray-300 text-xs font-mono break-all">{session.id}</p>
                        </div>
                        <div className="p-3 bg-gray-800/40 rounded-xl">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Initiated By</p>
                          <p className="text-gray-300 text-xs font-mono break-all">{session.initiated_by || '-'}</p>
                        </div>
                        <div className="p-3 bg-gray-800/40 rounded-xl">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Duration</p>
                          <p className="text-gray-300 text-xs">{formatDuration(session.started_at, session.ended_at)}</p>
                        </div>
                        <div className="p-3 bg-gray-800/40 rounded-xl">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Started</p>
                          <p className="text-gray-300 text-xs">{formatDate(session.started_at)} {formatTime(session.started_at)}</p>
                        </div>
                        <div className="p-3 bg-gray-800/40 rounded-xl sm:col-span-2">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Ended</p>
                          <p className="text-gray-300 text-xs">
                            {session.ended_at
                              ? `${formatDate(session.ended_at)} ${formatTime(session.ended_at)}`
                              : 'Still in progress'}
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
        {!loading && filteredSessions.length > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">
              Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filteredSessions.length)} of {filteredSessions.length}
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
