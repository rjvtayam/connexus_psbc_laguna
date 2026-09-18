import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import {
  Film, HardDrive, Play, Trash2, Download, Search,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Calendar, User, RefreshCw, X, AlertTriangle,
  Grid3X3, List, RotateCcw, Trash, Archive
} from 'lucide-react';
import { recordingsApi, Recording } from '../../api/recordings.api';
import { useAuthStore } from '../../stores/authStore';
import { useRecordings } from '../../hooks/useQueryHooks';
import { getSocket } from '../../hooks/useSocket';
import { pushNotification } from '../../components/ui/NotificationToast';

type SortField = 'created_at' | 'duration_seconds' | 'file_size' | 'title';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type TabMode = 'recordings' | 'trash';

export function RecordsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabMode>('recordings');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'permanent' | 'restore' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isAdmin = user?.role === 'admin';

  const { data, isLoading: loading } = useRecordings(page, sortBy, sortOrder, search, activeTab === 'trash');

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = (payload: { recording: any; uploaded_by: string }) => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      pushNotification({
        title: 'Recording Uploaded',
        message: `${payload.uploaded_by} saved "${payload.recording.title}"`,
        type: 'info',
        created_by: payload.uploaded_by,
      });
    };
    s.on('recording_uploaded', handler);
    return () => { s.off('recording_uploaded', handler); };
  }, [queryClient]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleAction = async () => {
    if (!actionId || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === 'delete') {
        await recordingsApi.delete(actionId);
      } else if (actionType === 'restore') {
        await recordingsApi.restore(actionId);
      } else if (actionType === 'permanent') {
        await recordingsApi.permanentDelete(actionId);
      }
      setActionId(null);
      setActionType(null);
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const openAction = (id: string, type: 'delete' | 'permanent' | 'restore') => {
    setActionId(id);
    setActionType(type);
  };

  const handleDownload = (rec: Recording) => {
    const url = recordingsApi.getStreamUrl(rec.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = rec.original_filename || `${rec.title}.webm`;
    a.click();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-gray-600" />;
    return sortOrder === 'desc'
      ? <ArrowDown size={12} className="text-primary-400" />
      : <ArrowUp size={12} className="text-primary-400" />;
  };

  const getActionConfig = () => {
    if (actionType === 'delete') return {
      icon: <Trash2 size={18} className="text-amber-400" />,
      bg: 'bg-amber-500/15 border-amber-500/20',
      title: 'Move to Trash',
      message: 'This recording will be moved to trash. You can restore it later.',
      confirmLabel: 'Move to Trash',
      confirmVariant: 'danger' as const,
    };
    if (actionType === 'restore') return {
      icon: <RotateCcw size={18} className="text-green-400" />,
      bg: 'bg-green-500/15 border-green-500/20',
      title: 'Restore Recording',
      message: 'This recording will be restored to your recordings list.',
      confirmLabel: 'Restore',
      confirmVariant: 'success' as const,
    };
    if (actionType === 'permanent') return {
      icon: <AlertTriangle size={18} className="text-red-400" />,
      bg: 'bg-red-500/15 border-red-500/20',
      title: 'Permanently Delete',
      message: 'This action cannot be undone. The file will be permanently removed from the server.',
      confirmLabel: 'Delete Permanently',
      confirmVariant: 'danger' as const,
    };
    return null;
  };

  const actionConfig = getActionConfig();

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
          <AlertTriangle size={48} className="text-amber-400 mb-4" />
          <h2 className="text-white font-semibold text-lg mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm">Only administrators can access meeting recordings.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <Film size={20} className="text-red-400" />
            </div>
            <div>
              <h1 className="font-orbitron text-xl sm:text-2xl font-bold text-white">
                {activeTab === 'trash' ? 'Trash' : 'Meeting Recordings'}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm">
                {data ? `${data.total} item${data.total !== 1 ? 's' : ''}` : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-900/80 rounded-lg border border-gray-800/60 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-600/20 text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-600/20 text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs + Search + Sort */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('recordings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                activeTab === 'recordings'
                  ? 'bg-primary-600/15 text-primary-400 border-primary-500/30'
                  : 'bg-gray-900/80 text-gray-500 border-gray-800/60 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              <Archive size={13} /> Recordings
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                activeTab === 'trash'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-gray-900/80 text-gray-500 border-gray-800/60 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              <Trash size={13} /> Trash
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${activeTab === 'trash' ? 'trashed' : ''} recordings...`}
                className="w-full bg-gray-900/80 border border-gray-800/60 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 focus:outline-none transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {([
                { field: 'created_at' as SortField, label: 'Date' },
                { field: 'duration_seconds' as SortField, label: 'Duration' },
                { field: 'file_size' as SortField, label: 'Size' },
              ]).map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    sortBy === field
                      ? 'bg-primary-600/15 text-primary-400 border-primary-500/30'
                      : 'bg-gray-900/80 text-gray-500 border-gray-800/60 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {label}
                  <SortIcon field={field} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} className="text-gray-600 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : !data || data.recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-900/80 rounded-2xl border border-gray-800/60">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center mb-4">
              {activeTab === 'trash'
                ? <Trash size={28} className="text-gray-600" />
                : <Film size={28} className="text-gray-600" />
              }
            </div>
            <p className="text-gray-400 font-medium mb-1">
              {search
                ? 'No results found'
                : activeTab === 'trash' ? 'Trash is empty' : 'No recordings yet'
              }
            </p>
            <p className="text-gray-600 text-xs">
              {search
                ? 'Try a different search term'
                : activeTab === 'trash'
                ? 'Deleted recordings will appear here'
                : 'Start a recording from the control room to see it here'
              }
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recordings.map((rec) => (
              <div
                key={rec.id}
                className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden group hover:border-gray-700/80 transition-all"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video bg-gray-950 cursor-pointer"
                  onClick={() => activeTab !== 'trash' && setPlayingId(rec.id)}
                >
                  <video
                    src={recordingsApi.getStreamUrl(rec.id)}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                  {activeTab !== 'trash' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play size={20} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                  )}
                  {activeTab === 'trash' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Trash size={24} className="text-gray-500" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white font-medium">
                    {formatDuration(rec.duration_seconds)}
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-white text-sm font-medium truncate">{rec.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar size={9} />
                      {new Date(rec.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <HardDrive size={9} />
                      {formatSize(rec.file_size)}
                    </span>
                    {rec.creator_name && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <User size={9} />
                        {rec.creator_name}
                      </span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-800/60">
                    {activeTab === 'trash' ? (
                      <>
                        <button
                          onClick={() => openAction(rec.id, 'restore')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                        >
                          <RotateCcw size={11} /> Restore
                        </button>
                        <button
                          onClick={() => openAction(rec.id, 'permanent')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setPlayingId(rec.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                        >
                          <Play size={11} /> Play
                        </button>
                        <button
                          onClick={() => handleDownload(rec)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 bg-gray-800/50 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                          <Download size={11} /> Save
                        </button>
                        <button
                          onClick={() => openAction(rec.id, 'delete')}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/60">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Recording</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Duration</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Size</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {data.recordings.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="relative w-16 h-9 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 cursor-pointer"
                            onClick={() => activeTab !== 'trash' && setPlayingId(rec.id)}
                          >
                            <video src={recordingsApi.getStreamUrl(rec.id)} className="w-full h-full object-cover" preload="metadata" muted />
                            {activeTab === 'trash' ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <Trash size={12} className="text-gray-500" />
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play size={12} className="text-white ml-0.5" fill="white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate max-w-[200px] sm:max-w-none">{rec.title}</p>
                            {rec.creator_name && (
                              <p className="text-gray-500 text-[11px] mt-0.5 flex items-center gap-1">
                                <User size={9} /> {rec.creator_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-gray-400 text-xs">{new Date(rec.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 text-xs font-mono">{formatDuration(rec.duration_seconds)}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 text-xs">{formatSize(rec.file_size)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {activeTab === 'trash' ? (
                            <>
                              <button onClick={() => openAction(rec.id, 'restore')} className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors" title="Restore">
                                <RotateCcw size={14} />
                              </button>
                              <button onClick={() => openAction(rec.id, 'permanent')} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete Permanently">
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setPlayingId(rec.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Play">
                                <Play size={14} />
                              </button>
                              <button onClick={() => handleDownload(rec)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="Download">
                                <Download size={14} />
                              </button>
                              <button onClick={() => openAction(rec.id, 'delete')} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Move to Trash">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">
              Showing {((page - 1) * data.page_size) + 1}–{Math.min(page * data.page_size, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                let pageNum: number;
                if (data.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= data.total_pages - 2) {
                  pageNum = data.total_pages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      page === pageNum
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {playingId && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPlayingId(null)}>
          <div className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const rec = data?.recordings.find((r) => r.id === playingId);
              if (!rec) return null;
              return (
                <>
                  <div className="p-4 border-b border-gray-800/60 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-sm">{rec.title}</h3>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        {formatDuration(rec.duration_seconds)} · {formatSize(rec.file_size)} · {new Date(rec.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => setPlayingId(null)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="bg-black">
                    <video
                      ref={videoRef}
                      src={recordingsApi.getStreamUrl(playingId)}
                      controls
                      autoPlay
                      className="w-full max-h-[70vh]"
                    />
                  </div>
                  <div className="p-3 border-t border-gray-800/60 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => {
                      const rec = data?.recordings.find((r) => r.id === playingId);
                      if (rec) handleDownload(rec);
                    }}>
                      <Download size={12} className="mr-1.5" /> Download
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionId && actionType && actionConfig && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setActionId(null); setActionType(null); }}>
          <div className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${actionConfig.bg}`}>
                {actionConfig.icon}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{actionConfig.title}</h3>
                <p className="text-gray-500 text-xs">Please confirm</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-5">{actionConfig.message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setActionId(null); setActionType(null); }}>Cancel</Button>
              <Button variant={actionConfig.confirmVariant} size="sm" onClick={handleAction} disabled={actionLoading}>
                {actionLoading ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : null}
                {actionConfig.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
