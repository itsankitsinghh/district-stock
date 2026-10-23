/**
 * District Stock — Exact Role-Based Navigation Configuration (TypeScript)
 * 
 * STRICTLY LOCKED CONFIGURATION (MANDATORY RULE):
 * 1. Admin: Dashboard, Reports, Master, User Setup
 * 2. Operation Manager: Dashboard, Reports, Master, User Setup
 * 3. Warehouse User: Dashboard, Movement, Reports, Stock
 * 4. Event User: Dashboard, Movement, Reports, Stock
 * 5. Event Planner: Dashboard, Raise Requests, My Requisitions
 */

export interface NavTabItem {
  key: string;
  label: string;
  icon: string;
  activeIcon: string;
}

export const ROLE_TABS = {
  ADMIN: 'Admin',
  OPERATIONS_MANAGER: 'Operations Manager',
  GROUND_WAREHOUSE: 'Ground User — Warehouse',
  GROUND_EVENT: 'Ground User — Event',
  EVENT_PLANNER: 'Event Planner',
} as const;

export const ROLE_TABS_CONFIG: Record<string, NavTabItem[]> = {
  // Role 1: Admin
  'Admin': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'master', label: 'Master', icon: 'database-outline', activeIcon: 'database' },
    { key: 'user-setup', label: 'User Setup', icon: 'account-group-outline', activeIcon: 'account-group' },
  ],

  // Role 2: Operation Manager
  'Operations Manager': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'master', label: 'Master', icon: 'database-outline', activeIcon: 'database' },
    { key: 'user-setup', label: 'User Setup', icon: 'account-group-outline', activeIcon: 'account-group' },
  ],
  'Operation Manager': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'master', label: 'Master', icon: 'database-outline', activeIcon: 'database' },
    { key: 'user-setup', label: 'User Setup', icon: 'account-group-outline', activeIcon: 'account-group' },
  ],

  // Role 3: Warehouse User
  'Ground User — Warehouse': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'movement', label: 'Movement', icon: 'truck-fast-outline', activeIcon: 'truck-fast' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'stock', label: 'Stock', icon: 'cube-outline', activeIcon: 'cube' },
  ],
  'Warehouse User': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'movement', label: 'Movement', icon: 'truck-fast-outline', activeIcon: 'truck-fast' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'stock', label: 'Stock', icon: 'cube-outline', activeIcon: 'cube' },
  ],

  // Role 4: Event User
  'Ground User — Event': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'movement', label: 'Movement', icon: 'truck-fast-outline', activeIcon: 'truck-fast' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'stock', label: 'Stock', icon: 'cube-outline', activeIcon: 'cube' },
  ],
  'Event User': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'movement', label: 'Movement', icon: 'truck-fast-outline', activeIcon: 'truck-fast' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'stock', label: 'Stock', icon: 'cube-outline', activeIcon: 'cube' },
  ],

  // Role 5: Event Planner
  'Event Planner': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'raise-requests', label: 'Raise Requests', icon: 'plus-box-outline', activeIcon: 'plus-box' },
    { key: 'my-requisitions', label: 'My Requisitions', icon: 'format-list-checks', activeIcon: 'format-list-checks' },
  ],
};

export function getTabsForRole(role?: string): NavTabItem[] {
  if (!role) return ROLE_TABS_CONFIG['Admin'];
  
  if (ROLE_TABS_CONFIG[role]) {
    return ROLE_TABS_CONFIG[role];
  }

  const normalized = role.toLowerCase().trim();

  // 1. Warehouse User / Ground User — Warehouse
  if (normalized.includes('warehouse')) {
    return ROLE_TABS_CONFIG['Ground User — Warehouse'];
  }
  // 2. Event Planner
  if (normalized.includes('planner')) {
    return ROLE_TABS_CONFIG['Event Planner'];
  }
  // 3. Event User / Ground User — Event
  if (normalized.includes('event')) {
    return ROLE_TABS_CONFIG['Ground User — Event'];
  }
  // 4. Operation Manager / Operations Manager
  if (normalized.includes('operation')) {
    return ROLE_TABS_CONFIG['Operations Manager'];
  }
  // 5. Admin
  if (normalized.includes('admin')) {
    return ROLE_TABS_CONFIG['Admin'];
  }

  const found = Object.keys(ROLE_TABS_CONFIG).find(
    (r) => r.toLowerCase() === normalized
  );
  if (found) {
    return ROLE_TABS_CONFIG[found];
  }
  return ROLE_TABS_CONFIG['Admin'];
}
