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
  'Admin': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'requests', label: 'Requests', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'master', label: 'Master', icon: 'database-outline', activeIcon: 'database' },
    { key: 'user-setup', label: 'User Setup', icon: 'account-group-outline', activeIcon: 'account-group' },
  ],

  // Role 2: Operations Manager
  'Operations Manager': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'requests', label: 'Requests', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'master', label: 'Master', icon: 'database-outline', activeIcon: 'database' },
    { key: 'user-setup', label: 'User Setup', icon: 'account-group-outline', activeIcon: 'account-group' },
  ],

  // Role 3: Ground User — Warehouse
  'Ground User — Warehouse': [
    { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'movement', label: 'Movement', icon: 'truck-fast-outline', activeIcon: 'truck-fast' },
    { key: 'reports', label: 'Reports', icon: 'chart-box-outline', activeIcon: 'chart-box' },
    { key: 'stock', label: 'Stock', icon: 'cube-outline', activeIcon: 'cube' },
  ],

  // Role 4: Ground User — Event
  'Ground User — Event': [
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

/**
 * Get tabs for a given role, falling back to Admin if undefined
 */
export function getTabsForRole(role) {
  if (ROLE_TABS_CONFIG[role]) {
    return ROLE_TABS_CONFIG[role];
  }
  // Case-insensitive / partial match safety fallback
  const found = Object.keys(ROLE_TABS_CONFIG).find(
    (r) => r.toLowerCase() === (role || '').toLowerCase()
  );
  if (found) {
    return ROLE_TABS_CONFIG[found];
  }
  return ROLE_TABS_CONFIG['Admin'];
}
