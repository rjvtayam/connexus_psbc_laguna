import { RoomUser } from '../types/session';

const ROLE_RANK: Record<string, number> = {
  admin: 0,
  principal: 1,
  teacher: 2,
  staff: 3,
};

const CAMPUS_ORDER = ['paete', 'control_room', 'pagsanjan'] as const;

const CAMPUS_LABELS: Record<string, string> = {
  paete: 'PAETE',
  control_room: 'CONTROL ROOM',
  pagsanjan: 'PAGSANJAN',
};

const CAMPUS_BADGES: Record<string, string> = {
  paete: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  control_room: 'text-primary-300 bg-primary-500/10 border-primary-500/30',
  pagsanjan: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
};

export interface CampusColumn {
  campus: string;
  label: string;
  badge: string;
  users: RoomUser[];
}

export const SELF_CARD_KEY = '__self__';

function rankRole(role: string): number {
  return ROLE_RANK[role] ?? 9;
}

function compareUsers(a: RoomUser, b: RoomUser): number {
  const roleDelta = rankRole(a.role) - rankRole(b.role);
  if (roleDelta !== 0) return roleDelta;
  return (a.user || '').localeCompare(b.user || '');
}

function normalizeCampus(campus: string): string {
  return campus === 'paete' || campus === 'pagsanjan' ? campus : 'control_room';
}

/**
 * Pure realtime partition: Paete left → Control center → Pagsanjan right.
 * Empty campuses are omitted so their columns never render.
 */
export function partitionCampusColumns(users: RoomUser[]): CampusColumn[] {
  const buckets: Record<string, RoomUser[]> = {
    paete: [],
    control_room: [],
    pagsanjan: [],
  };

  for (const u of users) {
    buckets[normalizeCampus(u.campus)].push(u);
  }

  const columns: CampusColumn[] = [];
  for (const campus of CAMPUS_ORDER) {
    const list = buckets[campus];
    if (list.length === 0) continue;
    list.sort(compareUsers);
    columns.push({
      campus,
      label: CAMPUS_LABELS[campus],
      badge: CAMPUS_BADGES[campus],
      users: list,
    });
  }
  return columns;
}

export function buildSelfUser(params: {
  sid?: string;
  name: string;
  campus?: string;
  role?: string;
  stream: MediaStream | null;
}): RoomUser {
  return {
    sid: params.sid || 'self',
    user: params.name,
    campus: params.campus || 'control_room',
    role: params.role || 'admin',
    stream: params.stream || undefined,
  };
}

export function cardKey(u: RoomUser, isSelf: boolean): string {
  return isSelf ? SELF_CARD_KEY : u.sid;
}
