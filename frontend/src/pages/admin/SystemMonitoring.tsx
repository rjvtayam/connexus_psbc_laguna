import { useEffect, useState, useRef, useCallback } from 'react';
import { getSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../stores/authStore';
import { pushNotification } from '../../components/ui/NotificationToast';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Activity, Server, Database, Zap, Wifi, Monitor, Cpu, MemoryStick, Shield, Trash2
} from 'lucide-react';

interface SystemMetrics {
  timestamp: string;
  system: {
    cpu_percent: number;
    memory_percent: number;
    memory_used_mb: number;
    memory_total_mb: number;
    disk_percent: number;
    disk_used_gb: number;
    disk_total_gb: number;
  };
  application: {
    active_sessions: number;
    total_users: number;
    online_users: number;
    recent_activity_5m: number;
    process_memory_mb: number;
    process_cpu_percent: number;
  };
  cache: {
    total_entries: number;
    caches: Record<string, number>;
  };
  control_room: {
    active: boolean;
    connected_participants: number;
  };
}

interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  activeSessions: number;
  onlineUsers: number;
  cacheEntries: number;
  processMemory: number;
}

const METRIC_COLORS = {
  cpu: '#f472b6',
  memory: '#22d3ee',
  activeSessions: '#34d399',
  onlineUsers: '#a78bfa',
  cacheEntries: '#fbbf24',
  processMemory: '#38bdf8',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(8, 12, 24, 0.95)',
  border: '1px solid rgba(34, 211, 238, 0.25)',
  borderRadius: '10px',
  fontSize: '11px',
  color: '#e2e8f0',
  boxShadow: '0 0 20px rgba(34, 211, 238, 0.08)',
};

export function SystemMonitoring() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [timeRange, setTimeRange] = useState<'5m' | '30m' | '1h' | '2h'>('30m');

  const historyRef = useRef<MetricPoint[]>([]);
  const metricsRef = useRef<SystemMetrics | null>(null);
  const mountedRef = useRef(true);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getTimeRangePoints = (range: typeof timeRange) => {
    switch (range) {
      case '5m': return 10;
      case '30m': return 60;
      case '1h': return 120;
      case '2h': return 120;
      default: return 60;
    }
  };

  const chartData = history.slice(-getTimeRangePoints(timeRange)).map((point, index) => ({
    ...point,
    index,
    timeLabel: formatTime(point.time),
  }));

  const handleMetrics = useCallback((data: SystemMetrics) => {
    if (!mountedRef.current) return;

    metricsRef.current = data;
    setMetrics(data);

    const point: MetricPoint = {
      time: data.timestamp,
      cpu: data.system.cpu_percent,
      memory: data.system.memory_percent,
      activeSessions: data.application.active_sessions,
      onlineUsers: data.application.online_users,
      cacheEntries: data.cache.total_entries,
      processMemory: data.application.process_memory_mb,
    };

    historyRef.current = [...historyRef.current, point].slice(-120);
    setHistory([...historyRef.current]);

    if (loading) setLoading(false);
  }, [loading]);

  const handleMetricsResponse = useCallback((data: SystemMetrics & { history?: SystemMetrics[] }) => {
    if (!mountedRef.current) return;

    if (data.history) {
      const points: MetricPoint[] = data.history.map(m => ({
        time: m.timestamp,
        cpu: m.system.cpu_percent,
        memory: m.system.memory_percent,
        activeSessions: m.application.active_sessions,
        onlineUsers: m.application.online_users,
        cacheEntries: m.cache.total_entries,
        processMemory: m.application.process_memory_mb,
      }));
      historyRef.current = points;
      setHistory(points);
    }
    setMetrics(data);
    setLoading(false);
  }, []);

  const handleCacheCleared = useCallback((data: { cleared_by: string; timestamp: string }) => {
    pushNotification({
      title: 'Cache Cleared',
      message: `All caches cleared by ${data.cleared_by}`,
      type: 'info',
      created_by: data.cleared_by,
    });
    setClearingCache(false);
  }, []);

  const requestMetrics = useCallback(() => {
    getSocket()?.emit('request_system_metrics', {});
  }, []);

  const handleClearCache = useCallback(() => {
    if (!confirm('Clear all system caches? This may temporarily slow down the system while caches rebuild.')) return;
    setClearingCache(true);
    getSocket()?.emit('clear_cache', {});
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    s.on('system_metrics', handleMetrics);
    s.on('system_metrics_response', handleMetricsResponse);
    s.on('cache_cleared', handleCacheCleared);

    requestMetrics();

    return () => {
      s.off('system_metrics', handleMetrics);
      s.off('system_metrics_response', handleMetricsResponse);
      s.off('cache_cleared', handleCacheCleared);
    };
  }, [handleMetrics, handleMetricsResponse, handleCacheCleared, requestMetrics]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-12 h-12 text-gray-600 mb-3" />
        <h2 className="text-white font-semibold text-sm mb-1">Admin Access Required</h2>
        <p className="text-gray-500 text-xs">System monitoring is only available to administrators.</p>
      </div>
    );
  }

  const cpu = metrics?.system.cpu_percent;
  const mem = metrics?.system.memory_percent;
  const disk = metrics?.system.disk_percent;

  return (
    <div className="h-full flex flex-col p-3 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/25 to-violet-500/25 border border-cyan-500/25 flex items-center justify-center">
            <Activity size={16} className="text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-orbitron text-sm sm:text-base font-bold text-white tracking-wide">System Monitor</h1>
            <p className="text-gray-500 text-[10px] sm:text-[11px]">Real-time telemetry · performance · cache control</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="bg-gray-950/80 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 focus:outline-none transition-all"
          >
            <option value="5m">Last 5 min</option>
            <option value="30m">Last 30 min</option>
            <option value="1h">Last 1 hour</option>
            <option value="2h">Last 2 hours</option>
          </select>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium rounded-lg transition-all disabled:opacity-50"
          >
            <Trash2 size={12} />
            <span>{clearingCache ? 'Clearing…' : 'Clear Cache'}</span>
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatusCard
          icon={<Cpu size={14} />}
          accent="cyan"
          label="CPU"
          value={cpu !== undefined ? `${cpu.toFixed(1)}%` : '—'}
          progress={cpu}
          status={cpu !== undefined ? (cpu > 80 ? 'high' : cpu > 50 ? 'medium' : 'low') : null}
        />
        <StatusCard
          icon={<MemoryStick size={14} />}
          accent="violet"
          label="Memory"
          value={mem !== undefined ? `${mem.toFixed(1)}%` : '—'}
          subValue={metrics?.system.memory_used_mb !== undefined ? `${metrics.system.memory_used_mb.toFixed(0)} / ${metrics.system.memory_total_mb.toFixed(0)} MB` : null}
          progress={mem}
          status={mem !== undefined ? (mem > 85 ? 'high' : mem > 60 ? 'medium' : 'low') : null}
        />
        <StatusCard
          icon={<Activity size={14} />}
          accent="emerald"
          label="Sessions"
          value={metrics?.application.active_sessions !== undefined ? metrics.application.active_sessions.toString() : '—'}
        />
        <StatusCard
          icon={<Wifi size={14} />}
          accent="sky"
          label="Online"
          value={metrics?.application.online_users !== undefined ? metrics.application.online_users.toString() : '—'}
        />
        <StatusCard
          icon={<Database size={14} />}
          accent="amber"
          label="Cache"
          value={metrics?.cache.total_entries !== undefined ? metrics.cache.total_entries.toLocaleString() : '—'}
          subValue={metrics?.cache.caches ? `${Object.keys(metrics.cache.caches).length} stores` : null}
        />
        <StatusCard
          icon={<Zap size={14} />}
          accent="rose"
          label="Proc. Mem"
          value={metrics?.application.process_memory_mb !== undefined ? `${metrics.application.process_memory_mb.toFixed(0)} MB` : '—'}
          subValue={metrics?.application.process_cpu_percent !== undefined ? `CPU ${metrics.application.process_cpu_percent.toFixed(1)}%` : null}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="System Resources" accent="violet">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={METRIC_COLORS.cpu} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={METRIC_COLORS.cpu} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="memoryGradient" x1="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={METRIC_COLORS.memory} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={METRIC_COLORS.memory} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="timeLabel" tick={{ fill: '#64748b', fontSize: 9 }} interval="preserveStartEnd" tickCount={6} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 9 }}
                domain={[0, 100]}
                tickCount={5}
                axisLine={false}
                tickLine={false}
              />
              <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" vertical={false} />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === 'number' ? `${value.toFixed(1)}%` : String(value ?? ''),
                  typeof name === 'string' ? name : String(name ?? ''),
                ]}
                labelFormatter={(time) => String(time ?? '')}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: 4 }} iconSize={8} />
              <Area type="monotone" dataKey="cpu" name="CPU %" stroke={METRIC_COLORS.cpu} strokeWidth={1.5} fillOpacity={1} fill="url(#cpuGradient)" dot={false} />
              <Area type="monotone" dataKey="memory" name="Memory %" stroke={METRIC_COLORS.memory} strokeWidth={1.5} fillOpacity={1} fill="url(#memoryGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Application Metrics" accent="emerald">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="timeLabel" tick={{ fill: '#64748b', fontSize: 9 }} interval="preserveStartEnd" tickCount={6} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickCount={5} axisLine={false} tickLine={false} />
              <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" vertical={false} />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : String(value ?? ''),
                  typeof name === 'string' ? name : String(name ?? ''),
                ]}
                labelFormatter={(time) => String(time ?? '')}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: 4 }} iconSize={8} />
              <Line type="monotone" dataKey="activeSessions" name="Sessions" stroke={METRIC_COLORS.activeSessions} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="onlineUsers" name="Online" stroke={METRIC_COLORS.onlineUsers} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="cacheEntries" name="Cache" stroke={METRIC_COLORS.cacheEntries} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="processMemory" name="Proc Mem (MB)" stroke={METRIC_COLORS.processMemory} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricDetailCard
          title="System Resources"
          icon={<Server size={13} />}
          accent="violet"
          metrics={[
            { label: 'CPU', value: cpu !== undefined ? `${cpu.toFixed(1)}%` : '—', color: cpu ? (cpu > 80 ? 'text-rose-400' : cpu > 50 ? 'text-amber-400' : 'text-emerald-400') : 'text-gray-500' },
            { label: 'Memory', value: mem !== undefined ? `${mem.toFixed(1)}%` : '—', color: mem ? (mem > 85 ? 'text-rose-400' : mem > 60 ? 'text-amber-400' : 'text-emerald-400') : 'text-gray-500' },
            { label: 'Memory Used', value: metrics?.system.memory_used_mb !== undefined ? `${metrics.system.memory_used_mb.toFixed(0)} / ${metrics.system.memory_total_mb.toFixed(0)} MB` : '—' },
            { label: 'Disk', value: disk !== undefined ? `${disk.toFixed(1)}%` : '—', color: disk ? (disk > 85 ? 'text-rose-400' : disk > 70 ? 'text-amber-400' : 'text-emerald-400') : 'text-gray-500' },
            { label: 'Disk Space', value: metrics?.system.disk_used_gb !== undefined ? `${metrics.system.disk_used_gb.toFixed(1)} / ${metrics.system.disk_total_gb.toFixed(1)} GB` : '—' },
          ]}
        />

        <MetricDetailCard
          title="Application Health"
          icon={<Monitor size={13} />}
          accent="cyan"
          metrics={[
            { label: 'Active Sessions', value: metrics?.application.active_sessions !== undefined ? metrics.application.active_sessions.toString() : '—' },
            { label: 'Total Users', value: metrics?.application.total_users !== undefined ? metrics.application.total_users.toLocaleString() : '—' },
            { label: 'Online Users', value: metrics?.application.online_users !== undefined ? metrics.application.online_users.toString() : '—' },
            { label: 'Activity (5m)', value: metrics?.application.recent_activity_5m !== undefined ? metrics.application.recent_activity_5m.toString() : '—' },
            { label: 'Process Memory', value: metrics?.application.process_memory_mb !== undefined ? `${metrics.application.process_memory_mb.toFixed(0)} MB` : '—' },
            { label: 'Process CPU', value: metrics?.application.process_cpu_percent !== undefined ? `${metrics.application.process_cpu_percent.toFixed(1)}%` : '—' },
          ]}
        />

        <MetricDetailCard
          title="Cache Matrix"
          icon={<Database size={13} />}
          accent="amber"
          metrics={[
            { label: 'Total Entries', value: metrics?.cache.total_entries !== undefined ? metrics.cache.total_entries.toLocaleString() : '—' },
            ...(metrics?.cache.caches ? Object.entries(metrics.cache.caches).map(([name, count]) => ({
              label: `${name.charAt(0).toUpperCase() + name.slice(1)}`,
              value: count.toLocaleString(),
            })) : []),
          ]}
          action={
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium rounded-lg transition-all disabled:opacity-50"
            >
              <Trash2 size={11} />
              <span>{clearingCache ? 'Clearing…' : 'Flush All Caches'}</span>
            </button>
          }
        />
      </div>

      {/* Control Room Status */}
      <div className="relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/60">
          <div className="flex items-center gap-2">
            <Monitor size={13} className="text-cyan-400" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Control Room</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${metrics?.control_room.active ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className={`text-[10px] font-semibold tracking-wider ${metrics?.control_room.active ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics?.control_room.active ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-800/50">
          <HudStat label="Connected" value={metrics?.control_room.connected_participants || 0} accent="text-cyan-400" />
          <HudStat label="Sessions" value={metrics?.application.active_sessions || 0} accent="text-emerald-400" />
          <HudStat label="Cache Entries" value={metrics?.cache.total_entries || 0} accent="text-violet-400" />
          <HudStat label="Activity 5m" value={metrics?.application.recent_activity_5m || 0} accent="text-amber-400" />
        </div>
      </div>

      {loading && (
        <p className="text-center text-[10px] text-gray-600 pb-2">Establishing telemetry link…</p>
      )}
    </div>
  );
}

// ─── Helper Components ───

type Accent = 'cyan' | 'violet' | 'emerald' | 'sky' | 'amber' | 'rose';

const ACCENT_STYLES: Record<Accent, { icon: string; bar: string; glow: string }> = {
  cyan:   { icon: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400',   bar: 'bg-cyan-400',   glow: 'hover:border-cyan-500/40 hover:shadow-[0_0_18px_rgba(34,211,238,0.08)]' },
  violet: { icon: 'bg-violet-500/10 border-violet-500/25 text-violet-400', bar: 'bg-violet-400', glow: 'hover:border-violet-500/40 hover:shadow-[0_0_18px_rgba(167,139,250,0.08)]' },
  emerald:{ icon: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', bar: 'bg-emerald-400', glow: 'hover:border-emerald-500/40 hover:shadow-[0_0_18px_rgba(52,211,153,0.08)]' },
  sky:    { icon: 'bg-sky-500/10 border-sky-500/25 text-sky-400',     bar: 'bg-sky-400',     glow: 'hover:border-sky-500/40 hover:shadow-[0_0_18px_rgba(56,189,248,0.08)]' },
  amber:  { icon: 'bg-amber-500/10 border-amber-500/25 text-amber-400', bar: 'bg-amber-400',  glow: 'hover:border-amber-500/40 hover:shadow-[0_0_18px_rgba(251,191,36,0.08)]' },
  rose:   { icon: 'bg-rose-500/10 border-rose-500/25 text-rose-400',   bar: 'bg-rose-400',   glow: 'hover:border-rose-500/40 hover:shadow-[0_0_18px_rgba(251,113,133,0.08)]' },
};

const STATUS_DOT: Record<string, string> = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-rose-500',
};

interface StatusCardProps {
  icon: React.ReactNode;
  accent: Accent;
  label: string;
  value: string;
  subValue?: string | null;
  progress?: number | null;
  status?: 'low' | 'medium' | 'high' | null;
}

function StatusCard({ icon, accent, label, value, subValue, progress, status }: StatusCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <div className={`group relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 p-3 transition-all duration-300 ${s.glow}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${s.icon}`}>
          {icon}
        </div>
        <div className="flex items-center gap-1.5">
          {status && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />}
          <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-medium">{label}</span>
        </div>
      </div>
      <p className="text-white text-base sm:text-lg font-bold font-mono leading-none">{value}</p>
      {subValue && <p className="text-gray-600 text-[9px] mt-1 truncate">{subValue}</p>}
      {progress !== undefined && progress !== null && (
        <div className="mt-2 h-1 rounded-full bg-gray-800/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${s.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface MetricDetailCardProps {
  title: string;
  icon: React.ReactNode;
  accent: Accent;
  metrics: Array<{ label: string; value: string; color?: string }>;
  action?: React.ReactNode;
}

function MetricDetailCard({ title, icon, accent, metrics, action }: MetricDetailCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <div className="relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
      <div className="px-3.5 py-2.5 border-b border-gray-800/60 flex items-center gap-2">
        <div className={`w-[22px] h-[22px] rounded-md border flex items-center justify-center ${s.icon}`}>
          {icon}
        </div>
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="px-3.5 py-2.5 space-y-0">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800/40 last:border-0">
            <span className="text-gray-500 text-[11px]">{m.label}</span>
            <span className={`text-gray-200 text-[11px] font-mono font-medium ${m.color || ''}`}>{m.value}</span>
          </div>
        ))}
        {action && (
          <div className="pt-2.5 mt-1 border-t border-gray-800/60">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  accent: Accent;
  children: React.ReactNode;
}

function ChartCard({ title, accent, children }: ChartCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <div className="relative bg-gray-950/70 backdrop-blur-xl rounded-xl border border-gray-800/80 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
      <div className="px-3.5 py-2.5 border-b border-gray-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-[22px] h-[22px] rounded-md border flex items-center justify-center ${s.icon}`}>
            <Activity size={11} />
          </div>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{title}</span>
        </div>
        <span className="text-[9px] text-gray-600 font-mono uppercase">realtime</span>
      </div>
      <div className="p-3 pt-4">{children}</div>
    </div>
  );
}

interface HudStatProps {
  label: string;
  value: number;
  accent: string;
}

function HudStat({ label, value, accent }: HudStatProps) {
  return (
    <div className="px-4 py-3 text-center">
      <p className={`text-lg font-bold font-mono leading-none ${accent}`}>{value}</p>
      <p className="text-gray-600 text-[9px] uppercase tracking-widest mt-1.5">{label}</p>
    </div>
  );
}

export default SystemMonitoring;
