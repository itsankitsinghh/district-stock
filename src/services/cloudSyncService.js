/**
 * District Stock — Cloud Sync Service
 * 
 * Synchronizes local device data with the live Render Cloud Backend:
 * https://district-stock-api.onrender.com
 * 
 * Features:
 * - Offline-First: App never blocks or lags on network calls
 * - Automatic background push on data modifications
 * - Initial bidirectional sync on app launch / login
 * - Safe JSON merging to prevent data loss
 */

import { API_CONFIG } from '../config/apiConfig';

export const cloudSyncService = {
  baseUrl: API_CONFIG.BASE_URL,

  /**
   * Check if backend server is reachable
   */
  async ping() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (_) {
      return false;
    }
  },

  /**
   * Build headers with JWT and session ID
   */
  getHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    try {
      const { authService } = require('./authService');
      const sess = authService.getCurrentSession();
      if (sess && (sess.accessToken || sess.token)) {
        headers['Authorization'] = `Bearer ${sess.accessToken || sess.token}`;
      }
      if (sess && sess.sessionId) {
        headers['X-Session-Id'] = sess.sessionId;
      }
    } catch (_) {}
    return headers;
  },

  /**
   * Pull collection from Render Cloud
   */
  async fetchCollection(collectionName) {
    if (!API_CONFIG.SYNC_ENABLED) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
      const res = await fetch(`${this.baseUrl}/api/sync/${collectionName}`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const json = await res.json();
      return json && json.success ? json.data : null;
    } catch (e) {
      console.warn(`[cloudSync] Fetch failed for ${collectionName}:`, e.message);
      return null;
    }
  },

  /**
   * Push collection to Render Cloud in background
   */
  async pushCollection(collectionName, data) {
    if (!API_CONFIG.SYNC_ENABLED || !data) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
      const res = await fetch(`${this.baseUrl}/api/sync/${collectionName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (e) {
      console.warn(`[cloudSync] Push failed for ${collectionName}:`, e.message);
      return false;
    }
  },

  /**
   * Map local filenames to collection names
   */
  getCollectionForFilename(filename) {
    const clean = filename.toLowerCase();
    if (clean.includes('user')) return 'users';
    if (clean.includes('inbound')) return 'inbounds';
    if (clean.includes('movement')) return 'movements';
    if (clean.includes('master')) return 'master';
    return null;
  },

  /**
   * Merge two lists by key with conflict prevention
   */
  mergeLists(listA, listB, keyExtractor) {
    const map = new Map();
    const getKey = typeof keyExtractor === 'function' ? keyExtractor : (item) => (item ? item[keyExtractor] : null);
    
    (listA || []).forEach((item) => {
      const k = getKey(item);
      if (k) map.set(k, item);
    });
    
    (listB || []).forEach((item) => {
      const k = getKey(item);
      if (k) {
        const existing = map.get(k);
        map.set(k, existing ? { ...existing, ...item } : item);
      }
    });
    
    return Array.from(map.values());
  },

  /**
   * Full bidirectional sync across all collections
   */
  async syncAll(storageHelper) {
    if (!API_CONFIG.SYNC_ENABLED || !storageHelper) return;
    try {
      const isOnline = await this.ping();
      if (!isOnline) {
        console.log('[cloudSync] Server unreachable or offline, skipping sync');
        return;
      }

      // 1. Sync Master Data (Warehouses, Products, Events, Requisitions)
      try {
        const localMaster = await storageHelper.readData('master_data.json', { warehouses: [], products: [], events: [], requisitions: [] });
        const cloudMaster = await this.fetchCollection('master');
        if (cloudMaster && typeof cloudMaster === 'object') {
          const mergedMaster = {
            warehouses: this.mergeLists(localMaster.warehouses || [], cloudMaster.warehouses || [], 'id'),
            products: this.mergeLists(localMaster.products || [], cloudMaster.products || [], 'id'),
            events: this.mergeLists(localMaster.events || [], cloudMaster.events || [], 'id'),
            requisitions: this.mergeLists(localMaster.requisitions || [], cloudMaster.requisitions || [], 'id'),
          };
          await storageHelper.syncToAllVaults('master_data.json', mergedMaster);
          await this.pushCollection('master', mergedMaster);
        } else if (localMaster && (localMaster.warehouses?.length || localMaster.products?.length || localMaster.events?.length)) {
          await this.pushCollection('master', localMaster);
        }
      } catch (err) {
        console.warn('[cloudSync] Master sync error:', err.message);
      }

      // 2. Sync Users
      try {
        const localUsers = await storageHelper.readData('users.json', []);
        const cloudUsers = await this.fetchCollection('users');
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          const mergedUsers = this.mergeLists(
            localUsers || [],
            cloudUsers,
            (u) => (u.id || u.userId || u.accessCode || u.email || '').toLowerCase().trim()
          );
          await storageHelper.syncToAllVaults('users.json', mergedUsers);
          await this.pushCollection('users', mergedUsers);
        } else if (Array.isArray(localUsers) && localUsers.length > 0) {
          await this.pushCollection('users', localUsers);
        }
      } catch (err) {
        console.warn('[cloudSync] Users sync error:', err.message);
      }

      // 3. Sync Inbounds
      try {
        const localInbounds = await storageHelper.readData('inbound_data.json', []);
        const cloudInbounds = await this.fetchCollection('inbounds');
        if (Array.isArray(cloudInbounds) && cloudInbounds.length > 0) {
          const mergedInbounds = this.mergeLists(
            localInbounds || [],
            cloudInbounds,
            (i) => i.consignmentNo || i.id
          );
          await storageHelper.syncToAllVaults('inbound_data.json', mergedInbounds);
          await this.pushCollection('inbounds', mergedInbounds);
        } else if (Array.isArray(localInbounds) && localInbounds.length > 0) {
          await this.pushCollection('inbounds', localInbounds);
        }
      } catch (err) {
        console.warn('[cloudSync] Inbounds sync error:', err.message);
      }

      // 4. Sync Movements
      try {
        const localMovements = await storageHelper.readData('movement_data.json', []);
        const cloudMovements = await this.fetchCollection('movements');
        if (Array.isArray(cloudMovements) && cloudMovements.length > 0) {
          const mergedMovements = this.mergeLists(
            localMovements || [],
            cloudMovements,
            (m) => m.referenceNo || m.id
          );
          await storageHelper.syncToAllVaults('movement_data.json', mergedMovements);
          await this.pushCollection('movements', mergedMovements);
        } else if (Array.isArray(localMovements) && localMovements.length > 0) {
          await this.pushCollection('movements', localMovements);
        }
      } catch (err) {
        console.warn('[cloudSync] Movements sync error:', err.message);
      }

      console.log('[cloudSync] Bidirectional sync completed with Render cloud backend');
    } catch (e) {
      console.warn('[cloudSync] syncAll failed:', e.message);
    }
  },
};
