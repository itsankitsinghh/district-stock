/**
 * District Stock — Exact Role-Based Navigation Configuration
 * 
 * Strict Tab Order Requirements:
 * - Admin: Dashboard, Requests, Reports, Master, User Setup
 * - Operations Manager: Dashboard, Requests, Reports, Master, User Setup
 * - Ground User — Warehouse: Dashboard, Movement, Reports, Stock
 * - Ground User — Event: Dashboard, Movement, Reports, Stock
 * - Event Planner: Dashboard, Raise Requests, My Requisitions
 */

export const ROLE_TABS = {
  ADMIN: 'Admin',
  OPERATIONS_MANAGER: 'Operations Manager',
  GROUND_WAREHOUSE: 'Ground User — Warehouse',
  GROUND_EVENT: 'Ground User — Event',
  EVENT_PLANNER: 'Event Planner',
};

export const ROLE_TABS_CONFIG = {
  // Role 1: Admin
  // admin: dashboard, reports, master, user setup.
  'Admin': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'master', label: 'Master', icon: 'database-outline', activeIcon: 'database' },
    { key: 'user-setup', label: 'User Setup', icon: 'account-group-outline', activeIcon: 'account-group' },
  ],

  // Role 2: Operation Manager
  // operation manager: dashboard, reports, master, user setup.
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
  // warehouse user: dashboard, movement, reports, stock.
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
  // event user: dashboard, movement, reports, stock.
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
  // event planner: dashboard, raise requests, my requisitions.
  'Event Planner': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'raise-requests', label: 'Raise Requests', icon: 'plus-box-outline', activeIcon: 'plus-box' },
    { key: 'my-requisitions', label: 'My Requisitions', icon: 'format-list-checks', activeIcon: 'format-list-checks' },
  ],
};

/**
 * Get tabs for a given role, falling back to Admin if undefined
 * STRICTLY LOCKED CONFIGURATION:
 * 1. Admin: Dashboard, Reports, Master, User Setup
 * 2. Operation Manager: Dashboard, Reports, Master, User Setup
 * 3. Warehouse User: Dashboard, Movement, Reports, Stock
 * 4. Event User: Dashboard, Movement, Reports, Stock
 * 5. Event Planner: Dashboard, Raise Requests, My Requisitions
 */
export function getTabsForRole(role) {
  if (!role) return ROLE_TABS_CONFIG['Admin'];
  
  if (ROLE_TABS_CONFIG[role]) {
    return ROLE_TABS_CONFIG[role];
  }

  const normalized = role.toLowerCase().trim();

  // 1. Warehouse User / Ground User — Warehouse / Warehouse Ground
  if (normalized.includes('warehouse')) {
    return ROLE_TABS_CONFIG['Ground User — Warehouse'];
  }
  // 2. Event Planner
  if (normalized.includes('planner')) {
    return ROLE_TABS_CONFIG['Event Planner'];
  }
  // 3. Event User / Ground User — Event / Event Ground
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

  // Exact / partial match safety fallback
  const found = Object.keys(ROLE_TABS_CONFIG).find(
    (r) => r.toLowerCase() === normalized
  );
  if (found) {
    return ROLE_TABS_CONFIG[found];
  }
  return ROLE_TABS_CONFIG['Admin'];
}


