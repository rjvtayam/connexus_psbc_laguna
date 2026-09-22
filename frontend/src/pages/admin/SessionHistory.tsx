import { useState, useEffect, useMemo } from 'react';
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
    { label: 'Total Sessions', value: sessions.length, icon: History, iconCls: 'bg-violet-500/10 border-violet-500/25 text-violet-400', valCls: 'text-violet-400' },
    { label: 'Active Now', value: activeCount, icon: Radio, iconCls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', valCls: 'text-emerald-400' },
    { label: 'Completed', value: endedCount, icon: CheckCircle, iconCls: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400', valCls: 'text-cyan-400' },
    { label: 'In Progress', value: activeCount, icon: Zap, iconCls: 'bg-amber-500/10 border-amber-500/25 text-amber-400', valCls: 'text-amber-400' },
  ];

  const filterChips = [
    { value: 'all', label: 'All', count: sessions.length, icon: Filter },
    { value: 'active', label: 'Active', count: activeCount, icon: Radio },
    { value: 'ended', label: 'Ended', count: endedCount, icon: Square },
  ];

  return (
    <div className="h-full flex flex-col p-3 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/25 to-emerald-500/25 border border-cyan-500/25 flex items-center justify-center">
            <History size={16} className="text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide">Session History</h1>
            <p className="text-gray-500 text-[10px] sm:text-[11px]">Past and ongoing intercampus video sessions</p>
          </div>
        </div>
        <button
          onClick={() => loadSessions(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-950/80 border border-gray-800 hover:border-cyan-500/40 text-gray-300 text-[11px] rounded-lg transition-all disabled:opacity-50"
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
            className="group relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 p-3 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_18px_rgba(34,211,238,0.06)]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
            <div className="flex items-center justify-between mb-2">
              <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${stat.iconCls}`}>
                <stat.icon size={12} />
              </div>
              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium">{stat.label}</span>
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
            placeholder="Search title, ID, or initiator…"
            className="w-full bg-gray-900/60 border border-gray-800 rounded-lg pl-8 pr-8 py-2 text-white text-[11px] placeholder-gray-600 focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 focus:outline-none transition-all"
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
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setStatusFilter(chip.value); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
                statusFilter === chip.value
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-gray-900/60 border-gray-800 text-gray-500 hover:text-white hover:border-gray-700'
              }`}
            >
              <chip.icon size={10} />
              {chip.label}
              <span className="opacity-60 font-mono">{chip.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Session List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Loader2 size={24} className="animate-spin mb-2.5 text-cyan-400" />
          <p className="text-[11px]">Loading sessions…</p>
        </div>
      ) : pageSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-3">
            <Inbox size={20} className="text-gray-600" />
          </div>
          <p className="text-white text-[12px] font-medium mb-1">No sessions found</p>
          <p className="text-[11px]">{searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Sessions will appear here once video sessions begin.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pageSessions.map((session, i) => {
            const isActive = session.status === 'active';
            const isExpanded = expandedId === session.id;
            return (
              <div
                key={session.id}
                className="relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className={`w-7 h-7 shrink-0 rounded-md border flex items-center justify-center ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      : 'bg-gray-800/60 text-gray-500 border-gray-700/50'
                  }`}>
                    {isActive ? <Play size={12} /> : <Square size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-[12px] font-medium truncate">{session.title || 'Untitled Session'}</span>
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-gray-800/60 text-gray-500 border-gray-700/50'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={9} />
                        {formatDate(session.started_at)} {formatTime(session.started_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {formatDuration(session.started_at, session.ended_at)}
                      </span>
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
                      <DetailTile label="Session ID" value={session.id} mono />
                      <DetailTile label="Initiated By" value={session.initiated_by || '-'} mono />
                      <DetailTile label="Duration" value={formatDuration(session.started_at, session.ended_at)} />
                      <DetailTile label="Started" value={`${formatDate(session.started_at)} ${formatTime(session.started_at)}`} />
                      <div className="sm:col-span-2">
                        <DetailTile
                          label="Ended"
                          value={session.ended_at
                            ? `${formatDate(session.ended_at)} ${formatTime(session.ended_at)}`
                            : 'Still in progress'}
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
      {!loading && filteredSessions.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-gray-600 text-[10px] font-mono">
            {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filteredSessions.length)} / {filteredSessions.length}
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
      <p className={`text-gray-300 text-[11px] break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
