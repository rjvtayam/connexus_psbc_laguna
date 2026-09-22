import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { UserManagement } from './UserManagement';
import { SessionHistory } from './SessionHistory';
import { AuditLogs } from './AuditLogs';
import { SystemMonitoring } from './SystemMonitoring';
import { RecordsPage } from '../control-room/RecordsPage';
import { Users, Film, History, ClipboardList, Activity } from 'lucide-react';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'recordings', label: 'Recordings', icon: Film },
  { id: 'session-history', label: 'Session History', icon: History },
  { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { id: 'system', label: 'System', icon: Activity },
] as const;

type TabId = typeof TABS[number]['id'];

const TAB_COMPONENTS: Record<TabId, React.FC> = {
  users: UserManagement,
  recordings: RecordsPage,
  'session-history': SessionHistory,
  'audit-logs': AuditLogs,
  system: SystemMonitoring,
};

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('users');

  // Normalize tab from URL on mount and when search changes
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      // Default to users if no tab param
      setSearchParams({ tab: 'users' }, { replace: true });
      setActiveTab('users');
    }
  }, [searchParams, setSearchParams]);

  // Update URL when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Tab Bar */}
        <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 px-4 sm:px-6 pt-2">
          <div className="flex items-center gap-1 max-w-7xl mx-auto">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                to={`/admin?tab=${tab.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleTabChange(tab.id);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <main className="flex-1 overflow-auto">
          <div className="animate-fade-in-up">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}