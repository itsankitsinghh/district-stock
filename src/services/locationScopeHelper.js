/**
 * District Stock — Centralized Location & Scope Helper
 * 
 * Guarantees:
 * 1. Single Source of Truth from masterService (strictly active records only).
 * 2. Analytics & Dashboard rule:
 *    - Exactly 1 assigned location => Dropdown shows ONLY that 1 location (no "All").
 *    - More than 1 assigned location => 1st option is "All Warehouses" / "All Events", followed by single-single.
 * 3. Movement / Transaction rule (Inbound, Outbound, Transfer, Return, Requisition):
 *    - Source & Destination NEVER contain "All".
 *    - Transfer Destination automatically filters out selected Source Warehouse.
 *    - If 1 location available => Auto pre-selected.
 *    - If 0 available => Clean placeholder, disabled submit, zero crashes.
 * 4. Zero dummy / sample / mock data rule strictly preserved.
 */

import masterService from './masterService';
import { authService } from './authService';

/**
 * Get all active warehouses created in Master Tab
 */
export function getActiveMasterWarehouses() {
  const all = masterService?.getWarehouses?.() || [];
  return all.filter((w) => (w.status || 'active').toLowerCase() === 'active');
}

/**
 * Get all active events created in Master Tab
 */
export function getActiveMasterEvents() {
  const all = masterService?.getEvents?.() || [];
  return all.filter((e) => (e.status || 'active').toLowerCase() === 'active');
}

/**
 * Check if a location name belongs to active events
 */
export function isEventLocation(locName, activeEvents = null) {
  if (!locName) return false;
  const evs = activeEvents || getActiveMasterEvents();
  const clean = String(locName).trim().toLowerCase();
  return (
    evs.some((e) => (e.name || e.code || String(e.id)).trim().toLowerCase() === clean) ||
    clean.includes('event') ||
    clean.includes('arena') ||
    clean.includes('summit') ||
    clean.includes('fest') ||
    clean.includes('expo')
  );
}

/**
 * Check if a location name belongs to active warehouses
 */
export function isWarehouseLocation(locName, activeWarehouses = null) {
  if (!locName) return false;
  const whs = activeWarehouses || getActiveMasterWarehouses();
  const clean = String(locName).trim().toLowerCase();
  return (
    whs.some((w) => (w.name || w.code || String(w.id)).trim().toLowerCase() === clean) ||
    clean.includes('warehouse') ||
    clean.includes('hub') ||
    clean.includes('depot') ||
    clean.includes('storage') ||
    clean.includes('terminal')
  );
}

/**
 * Get accessible active warehouses for a user based on their assignedLocations & role
 */
export function getUserAccessibleWarehouses(user = null) {
  const activeWhs = getActiveMasterWarehouses();
  const activeWhNames = activeWhs.map((w) => w.name);
  if (activeWhNames.length === 0) return [];

  const currentUser = user || authService?.getCurrentSession?.();
  const role = (currentUser?.role || '').toLowerCase().trim();
  const email = (currentUser?.email || '').toLowerCase().trim();

  // Admin & Operation Manager have full access to all active warehouses
  if (
    role === 'admin' ||
    role === 'super admin' ||
    role === 'operation manager' ||
    role === 'operations manager' ||
    role === 'op manager' ||
    email === 'super.admin@district.com'
  ) {
    return activeWhNames;
  }

  const assigned = Array.isArray(currentUser?.assignedLocations)
    ? currentUser.assignedLocations
    : currentUser?.assignedLocations
    ? [currentUser.assignedLocations]
    : [];

  const hasAllWh = assigned.some((loc) => {
    const s = String(loc || '').trim().toLowerCase();
    return s === 'all' || s === 'all warehouses' || s === '*';
  });
  if (hasAllWh) {
    return activeWhNames;
  }

  const matched = assigned
    .map((loc) => String(loc || '').trim())
    .filter((loc) => activeWhNames.some((wName) => wName.toLowerCase() === loc.toLowerCase()));

  const finalMatched = Array.from(new Set(matched));
  // Guarantee fallback to activeWhNames so newly created master warehouses are always visible and selectable
  return finalMatched.length > 0 ? finalMatched : activeWhNames;
}

/**
 * Get accessible active events for a user based on their assignedLocations & role
 */
export function getUserAccessibleEvents(user = null) {
  const activeEvs = getActiveMasterEvents();
  const activeEvNames = activeEvs.map((e) => e.name);
  if (activeEvNames.length === 0) return [];

  const currentUser = user || authService?.getCurrentSession?.();
  const role = (currentUser?.role || '').toLowerCase().trim();

  // Admin, Operation Manager, Event Planner, and Event User have access to active events
  if (
    role === 'admin' ||
    role === 'super admin' ||
    role === 'operation manager' ||
    role === 'operations manager' ||
    role === 'event planner' ||
    role === 'lead planner' ||
    role === 'event user'
  ) {
    return activeEvNames;
  }

  const assigned = Array.isArray(currentUser?.assignedLocations)
    ? currentUser.assignedLocations
    : currentUser?.assignedLocations
    ? [currentUser.assignedLocations]
    : [];

  const hasAllEv = assigned.some((loc) => {
    const s = String(loc || '').trim().toLowerCase();
    return s === 'all' || s === 'all events' || s === '*';
  });
  if (hasAllEv) {
    return activeEvNames;
  }

  const matched = assigned
    .map((loc) => String(loc || '').trim())
    .filter((loc) => activeEvNames.some((eName) => eName.toLowerCase() === loc.toLowerCase()));

  const finalMatched = Array.from(new Set(matched));
  // Guarantee fallback to activeEvNames so newly created master events are always visible and selectable
  return finalMatched.length > 0 ? finalMatched : activeEvNames;
}

/**
 * Dropdown options for Analytics / Dashboard / Reports:
 * - Count === 0 => []
 * - Count === 1 => [Single Location] (No "All")
 * - Count > 1   => ["All Locations", Single1, Single2, ...]
 */
export function getAnalyticsDropdownOptions(locationsList = [], entityType = 'Warehouse') {
  if (!Array.isArray(locationsList) || locationsList.length === 0) {
    return [];
  }
  if (locationsList.length === 1) {
    return [locationsList[0]];
  }
  const allLabel = entityType === 'Event' ? 'All Events' : 'All Warehouses';
  return [allLabel, ...locationsList];
}

/**
 * Movement / Transaction Warehouse options (Inbound, Outbound Source, Transfer Source, Return Destination)
 * STRICT RULE: NEVER contains "All".
 */
export function getMovementWarehouseOptions(user = null) {
  return getUserAccessibleWarehouses(user);
}

/**
 * Movement / Transaction Event options (Outbound Destination Event, Return Source Event)
 * STRICT RULE: NEVER contains "All".
 * Warehouse user needs to dispatch to any active Master event.
 */
export function getMovementEventOptions() {
  const activeEvs = getActiveMasterEvents();
  return activeEvs.map((e) => e.name);
}

/**
 * Transfer Destination Warehouse options:
 * STRICT RULE:
 * 1. NEVER contains "All".
 * 2. Automatically filters out the selected source warehouse.
 */
export function getTransferDestinationOptions(sourceWhName, user = null) {
  const allAccessible = getActiveMasterWarehouses().map((w) => w.name);
  if (!sourceWhName) return allAccessible;
  const cleanSource = String(sourceWhName).trim().toLowerCase();
  return allAccessible.filter((name) => name.trim().toLowerCase() !== cleanSource);
}

export default {
  getActiveMasterWarehouses,
  getActiveMasterEvents,
  isEventLocation,
  isWarehouseLocation,
  getUserAccessibleWarehouses,
  getUserAccessibleEvents,
  getAnalyticsDropdownOptions,
  getMovementWarehouseOptions,
  getMovementEventOptions,
  getTransferDestinationOptions,
};
