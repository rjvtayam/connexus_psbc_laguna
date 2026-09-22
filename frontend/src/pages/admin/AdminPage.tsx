import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { UserManagement } from './UserManagement';
import { SessionHistory } from './SessionHistory';
import { AuditLogs } from './AuditLogs';
import { SystemMonitoring } from './SystemMonitoring';
import { RecordsPage } from '../control-room/RecordsPage';

const TAB_IDS = ['users', 'recordings', 'session-history', 'audit-logs', 'system'] as const;

type TabId = typeof TAB_IDS[number];

const TAB_COMPONENTS: Record<TabId, React.FC> = {
  users: UserManagement,
  recordings: RecordsPage,
  'session-history': SessionHistory,
  'audit-logs': AuditLogs,
  system: SystemMonitoring,
};

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : 'users';

  useEffect(() => {
    if (!tabParam || !TAB_IDS.includes(tabParam)) {
      setSearchParams({ tab: 'users' }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <DashboardLayout>
      <div className="animate-fade-in-up h-full">
        <ActiveComponent />
      </div>
    </DashboardLayout>
  );
}
