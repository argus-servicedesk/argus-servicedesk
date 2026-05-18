export const ASSIGNMENT_TEAM_ROSTER: Record<string, string[]> = {
  'Infra Team': ['Devendra Reddy', 'Edukondalu', 'Siva', 'Udhayakumar'],
  'DevOps Team': ['Rajkumar-Madhu', 'Hoysala Bisa'],
  'Software Team': ['Vediyappan M', 'Rajkumar-Ashokan'],
};

export const ASSIGNMENT_TEAM_ORDER = Object.keys(ASSIGNMENT_TEAM_ROSTER);

export type AssignmentRosterUser = {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  name?: string;
  displayName?: string;
  disabled?: boolean;
};

export type AssignmentRosterTeam = {
  id: string;
  name: string;
  members?: Array<{ user?: AssignmentRosterUser | null }>;
};

export function extractAssignmentList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown; results?: unknown };
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.results)) return obj.results;
  }
  return [];
}

export function assignmentPersonLabel(value: unknown): string {
  if (!value) return 'Unassigned';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as AssignmentRosterUser;
    if (obj.displayName) return obj.displayName;
    const firstName = obj.firstName || obj.first_name || '';
    const lastName = obj.lastName || obj.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || obj.name || obj.email || obj.username || 'Unassigned';
  }
  return 'Unassigned';
}

export function normalizeAssignmentName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function orderedAssignmentTeams(teams: AssignmentRosterTeam[]): AssignmentRosterTeam[] {
  return ASSIGNMENT_TEAM_ORDER
    .map((teamName) => teams.find((team) => team.name === teamName))
    .filter(Boolean) as AssignmentRosterTeam[];
}

export function assignableUsersForTeam(
  teams: AssignmentRosterTeam[],
  assignmentGroupId: string,
  _currentAssigned?: AssignmentRosterUser | null,
): AssignmentRosterUser[] {
  const selectedTeam = teams.find((team) => team.id === assignmentGroupId);
  const selectedRoster = selectedTeam ? ASSIGNMENT_TEAM_ROSTER[selectedTeam.name] || [] : [];
  const teamUsersByName = new Map(
    (selectedTeam?.members || [])
      .map((member) => member.user)
      .filter(Boolean)
      .map((user) => [normalizeAssignmentName(assignmentPersonLabel(user)), user as AssignmentRosterUser]),
  );
  const users = selectedRoster.map((displayName) => {
    const user = teamUsersByName.get(normalizeAssignmentName(displayName));
    return user
      ? { ...user, displayName }
      : { id: `missing:${displayName}`, displayName, disabled: true };
  });
  return users;
}
