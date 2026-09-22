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
  cpu: '#f44336',
  memory: '#2196f3',
  activeSessions: '#4caf50',
  onlineUsers: '#ff9800',
  cacheEntries: '#9c27b0',
  processMemory: '#00bcd4',
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

  // Format timestamp for display
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

  // Convert history to chart data
  const chartData = history.slice(-getTimeRangePoints(timeRange)).map((point, index) => ({
    ...point,
    index,
    timeLabel: formatTime(point.time),
  }));

  // Handle incoming system metrics
  const handleMetrics = useCallback((data: SystemMetrics) => {
    if (!mountedRef.current) return;
    
    metricsRef.current = data;
    setMetrics(data);
    
    // Convert to chart point
    const point: MetricPoint = {
      time: data.timestamp,
      cpu: data.system.cpu_percent,
      memory: data.system.memory_percent,
      activeSessions: data.application.active_sessions,
      onlineUsers: data.application.online_users,
      cacheEntries: data.cache.total_entries,
      processMemory: data.application.process_memory_mb,
    };
    
    // Update history
    historyRef.current = [...historyRef.current, point].slice(-120);
    setHistory([...historyRef.current]);
    
    if (loading) setLoading(false);
  }, [loading]);

  // Handle metrics history response
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
    setLoading(false);
  }, []);

  // Handle cache cleared
  const handleCacheCleared = useCallback((data: { cleared_by: string; timestamp: string }) => {
    pushNotification({
      title: 'Cache Cleared',
      message: `All caches cleared by ${data.cleared_by}`,
      type: 'info',
      created_by: data.cleared_by,
    });
    setClearingCache(false);
  }, []);

  // Request metrics from server
  const requestMetrics = useCallback(() => {
    getSocket()?.emit('request_system_metrics', {});
  }, []);

  // Clear cache
  const handleClearCache = useCallback(() => {
    if (!confirm('Clear all system caches? This may temporarily slow down the system while caches rebuild.')) return;
    setClearingCache(true);
    getSocket()?.emit('clear_cache', {});
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    s.on('system_metrics', handleMetrics);
    s.on('system_metrics_response', handleMetricsResponse);
    s.on('cache_cleared', handleCacheCleared);

    // Request initial metrics
    requestMetrics();

    return () => {
      s.off('system_metrics', handleMetrics);
      s.off('system_metrics_response', handleMetricsResponse);
      s.off('cache_cleared', handleCacheCleared);
    };
  }, [handleMetrics, handleMetricsResponse, handleCacheCleared, requestMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-white font-semibold text-lg mb-2">Admin Access Required</h2>
        <p className="text-gray-400 text-sm">System monitoring is only available to administrators.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
            <Activity size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="font-orbitron text-xl sm:text-2xl font-bold text-white">System Monitor</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Real-time system health, performance metrics & cache management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="bg-gray-900/80 border border-gray-700/50 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 focus:outline-none transition-all"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="30m">Last 30 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="2h">Last 2 hours</option>
          </select>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            <Trash2 size={16} />
            <span>{clearingCache ? 'Clearing...' : 'Clear Cache'}</span>
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatusCard
          icon={<Cpu size={20} />}
          iconBg="bg-red-500/10 border-red-500/20"
          label="CPU Usage"
          value={metrics?.system.cpu_percent !== undefined ? `${metrics.system.cpu_percent.toFixed(1)}%` : '—'}
          trend={metrics?.system.cpu_percent !== undefined ? (metrics.system.cpu_percent > 80 ? 'high' : metrics.system.cpu_percent > 50 ? 'medium' : 'low') : null}
        />
        <StatusCard
          icon={<MemoryStick size={20} />}
          iconBg="bg-blue-500/10 border-blue-500/20"
          label="Memory Usage"
          value={metrics?.system.memory_percent !== undefined ? `${metrics.system.memory_percent.toFixed(1)}%` : '—'}
          subValue={metrics?.system.memory_used_mb !== undefined ? `${metrics.system.memory_used_mb.toFixed(0)} / ${metrics.system.memory_total_mb.toFixed(0)} MB` : null}
          trend={metrics?.system.memory_percent !== undefined ? (metrics.system.memory_percent > 85 ? 'high' : metrics.system.memory_percent > 60 ? 'medium' : 'low') : null}
        />
        <StatusCard
          icon={<Activity size={20} />}
          iconBg="bg-green-500/10 border-green-500/20"
          label="Active Sessions"
          value={metrics?.application.active_sessions !== undefined ? metrics.application.active_sessions.toString() : '—'}
        />
        <StatusCard
          icon={<Wifi size={20} />}
          iconBg="bg-cyan-500/10 border-cyan-500/20"
          label="Online Users"
          value={metrics?.application.online_users !== undefined ? metrics.application.online_users.toString() : '—'}
        />
        <StatusCard
          icon={<Database size={20} />}
          iconBg="bg-purple-500/10 border-purple-500/20"
          label="Cache Entries"
          value={metrics?.cache.total_entries !== undefined ? metrics.cache.total_entries.toLocaleString() : '—'}
          subValue={metrics?.cache.caches ? Object.entries(metrics.cache.caches).map(([k, v]) => `${k}: ${v}`).join(', ') : null}
        />
        <StatusCard
          icon={<Zap size={20} />}
          iconBg="bg-amber-500/10 border-amber-500/20"
          label="Process Memory"
          value={metrics?.application.process_memory_mb !== undefined ? `${metrics.application.process_memory_mb.toFixed(0)} MB` : '—'}
          subValue={metrics?.application.process_cpu_percent !== undefined ? `CPU: ${metrics.application.process_cpu_percent.toFixed(1)}%` : null}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU & Memory Chart */}
        <ChartCard title="System Resources" icon={<Activity size={16} className="text-purple-400" />}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={METRIC_COLORS.cpu} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={METRIC_COLORS.cpu} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="memoryGradient" x1="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={METRIC_COLORS.memory} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={METRIC_COLORS.memory} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="timeLabel" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" tickCount={8} />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 10 }} 
                domain={[0, 100]} 
                tickCount={5}
                label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10, dy: -30 }}
              />
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? `${value.toFixed(1)}%` : String(value ?? ''),
                  typeof name === 'string' ? name : String(name ?? ''),
                ]}
                labelFormatter={(time) => String(time ?? '')}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="cpu" name="CPU %" stroke={METRIC_COLORS.cpu} fillOpacity={1} fill="url(#cpuGradient)" />
              <Area type="monotone" dataKey="memory" name="Memory %" stroke={METRIC_COLORS.memory} fillOpacity={1} fill="url(#memoryGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Application Metrics Chart */}
        <ChartCard title="Application Metrics" icon={<Activity size={16} className="text-green-400" />}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <XAxis dataKey="timeLabel" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" tickCount={8} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickCount={5} />
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : String(value ?? ''),
                  typeof name === 'string' ? name : String(name ?? ''),
                ]}
                labelFormatter={(time) => String(time ?? '')}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="activeSessions" name="Active Sessions" stroke={METRIC_COLORS.activeSessions} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="onlineUsers" name="Online Users" stroke={METRIC_COLORS.onlineUsers} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cacheEntries" name="Cache Entries" stroke={METRIC_COLORS.cacheEntries} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="processMemory" name="Process Memory (MB)" stroke={METRIC_COLORS.processMemory} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System Resources */}
        <MetricDetailCard
          title="System Resources"
          icon={<Server size={18} className="text-purple-400" />}
          iconBg="bg-purple-500/10 border-purple-500/20"
          metrics={[
            { label: 'CPU Usage', value: metrics?.system.cpu_percent !== undefined ? `${metrics.system.cpu_percent.toFixed(1)}%` : '—', color: metrics?.system.cpu_percent ? (metrics.system.cpu_percent > 80 ? 'text-red-400' : metrics.system.cpu_percent > 50 ? 'text-amber-400' : 'text-green-400') : 'text-gray-500' },
            { label: 'Memory Usage', value: metrics?.system.memory_percent !== undefined ? `${metrics.system.memory_percent.toFixed(1)}%` : '—', color: metrics?.system.memory_percent ? (metrics.system.memory_percent > 85 ? 'text-red-400' : metrics.system.memory_percent > 60 ? 'text-amber-400' : 'text-green-400') : 'text-gray-500' },
            { label: 'Memory Used', value: metrics?.system.memory_used_mb !== undefined ? `${metrics.system.memory_used_mb.toFixed(0)} / ${metrics.system.memory_total_mb.toFixed(0)} MB` : '—' },
            { label: 'Disk Usage', value: metrics?.system.disk_percent !== undefined ? `${metrics.system.disk_percent.toFixed(1)}%` : '—', color: metrics?.system.disk_percent ? (metrics.system.disk_percent > 85 ? 'text-red-400' : metrics.system.disk_percent > 70 ? 'text-amber-400' : 'text-green-400') : 'text-gray-500' },
            { label: 'Disk Space', value: metrics?.system.disk_used_gb !== undefined ? `${metrics.system.disk_used_gb.toFixed(1)} / ${metrics.system.disk_total_gb.toFixed(1)} GB` : '—' },
          ]}
        />

        {/* Application Metrics */}
        <MetricDetailCard
          title="Application Health"
          icon={<Monitor size={18} className="text-green-400" />}
          iconBg="bg-green-500/10 border-green-500/20"
          metrics={[
            { label: 'Active Sessions', value: metrics?.application.active_sessions !== undefined ? metrics.application.active_sessions.toString() : '—' },
            { label: 'Total Users', value: metrics?.application.total_users !== undefined ? metrics.application.total_users.toLocaleString() : '—' },
            { label: 'Online Users', value: metrics?.application.online_users !== undefined ? metrics.application.online_users.toString() : '—' },
            { label: 'Recent Activity (5m)', value: metrics?.application.recent_activity_5m !== undefined ? metrics.application.recent_activity_5m.toString() : '—' },
            { label: 'Process Memory', value: metrics?.application.process_memory_mb !== undefined ? `${metrics.application.process_memory_mb.toFixed(0)} MB` : '—' },
            { label: 'Process CPU', value: metrics?.application.process_cpu_percent !== undefined ? `${metrics.application.process_cpu_percent.toFixed(1)}%` : '—' },
          ]}
        />

        {/* Cache Status */}
        <MetricDetailCard
          title="Cache Status"
          icon={<Database size={18} className="text-purple-400" />}
          iconBg="bg-purple-500/10 border-purple-500/20"
          metrics={[
            { label: 'Total Entries', value: metrics?.cache.total_entries !== undefined ? metrics.cache.total_entries.toLocaleString() : '—' },
            ...(metrics?.cache.caches ? Object.entries(metrics.cache.caches).map(([name, count]) => ({
              label: `${name.charAt(0).toUpperCase() + name.slice(1)} Cache`,
              value: count.toLocaleString(),
            })) : []),
          ]}
          action={
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>{clearingCache ? 'Clearing...' : 'Clear All Caches'}</span>
            </button>
          }
        />
      </div>

      {/* Control Room Status */}
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-cyan-400" />
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Control Room Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${metrics?.control_room.active ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={`text-sm font-medium ${metrics?.control_room.active ? 'text-green-400' : 'text-red-400'}`}>
              {metrics?.control_room.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-gray-800/50 rounded-xl">
            <p className="text-2xl font-bold text-cyan-400">{metrics?.control_room.connected_participants || 0}</p>
            <p className="text-gray-500 text-xs">Connected</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-xl">
            <p className="text-2xl font-bold text-green-400">{metrics?.application.active_sessions || 0}</p>
            <p className="text-gray-500 text-xs">Active Sessions</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-xl">
            <p className="text-2xl font-bold text-purple-400">{metrics?.cache.total_entries || 0}</p>
            <p className="text-gray-500 text-xs">Cache Entries</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-xl">
            <p className="text-2xl font-bold text-amber-400">{metrics?.application.recent_activity_5m || 0}</p>
            <p className="text-gray-500 text-xs">Activity (5m)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ───

interface StatusCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subValue?: string | null;
  trend?: 'low' | 'medium' | 'high' | null;
}

function StatusCard({ icon, iconBg, label, value, subValue, trend }: StatusCardProps) {
  const trendColors = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 p-4 hover:border-gray-700/60 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">{label}</span>
        </div>
        {trend && (
          <span className={`w-2 h-2 rounded-full ${trendColors[trend]}`} />
        )}
      </div>
      <div className="mt-3">
        <p className="text-white text-xl sm:text-2xl font-bold">{value}</p>
        {subValue && <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}

interface MetricDetailCardProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  metrics: Array<{ label: string; value: string; color?: string }>;
  action?: React.ReactNode;
}

function MetricDetailCard({ title, icon, iconBg, metrics, action }: MetricDetailCardProps) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
      <div className="p-4 border-b border-gray-800/60 flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4 space-y-3">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/30 last:border-0">
            <span className="text-gray-400 text-sm">{m.label}</span>
            <span className={`text-white text-sm font-mono ${m.color || ''}`}>{m.value}</span>
          </div>
        ))}
        {action && (
          <div className="pt-3 border-t border-gray-800/60">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function ChartCard({ title, icon, children }: ChartCardProps) {
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
      <div className="p-4 border-b border-gray-800/60 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default SystemMonitoring;