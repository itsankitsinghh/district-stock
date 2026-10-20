/**
 * District Stock — Cloud Sync Service
 * 
 * Synchronizes local device vaults with the live Render Cloud Backend & Supabase DB:
 * https://district-stock-api.onrender.com
 * 
 * Features:
 * - Offline-First: App never blocks or lags on network calls
 * - Automatic background push on data modifications
 * - Initial bidirectional sync on app launch / login
 * - Safe JSON merging to prevent data loss across APK updates & reinstalls
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
    if (clean.includes('carrier') || clean.includes('logistic')) return 'logistics';
    return null;
  },

  /**
   * Merge two lists by key with conflict prevention
   */
  mergeLists(listA = [], listB = [], keyExtractors = ['id']) {
    const map = new Map();
    const extractKey = (item) => {
      if (!item || typeof item !== 'object') return null;
      for (const k of keyExtractors) {
        if (item[k]) return String(item[k]).toLowerCase().trim();
      }
      return null;
    };

    (listA || []).forEach((item) => {
      const k = extractKey(item);
      if (k) map.set(k, item);
    });

    (listB || []).forEach((item) => {
      const k = extractKey(item);
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
        const localMaster =
          (await storageHelper.readData('district_stock_master_v1.json', null)) ||
          (await storageHelper.readData('master_data.json', { warehouses: [], products: [], events: [], requisitions: [] }));

        const cloudMaster = await this.fetchCollection('master');
        if (cloudMaster && typeof cloudMaster === 'object') {
          const mergedMaster = {
            ...(localMaster || {}),
            warehouses: this.mergeLists(localMaster.warehouses || [], cloudMaster.warehouses || [], ['id', 'code', 'name']),
            products: this.mergeLists(localMaster.products || [], cloudMaster.products || [], ['id', 'code', 'sku', 'name']),
            events: this.mergeLists(localMaster.events || [], cloudMaster.events || [], ['id', 'code', 'name']),
            requisitions: this.mergeLists(localMaster.requisitions || [], cloudMaster.requisitions || [], ['id', 'requisitionNo']),
            categories: localMaster.categories || cloudMaster.categories || [],
            productTypes: localMaster.productTypes || cloudMaster.productTypes || [],
          };
          await storageHelper.syncToAllVaults('district_stock_master_v1.json', mergedMaster);
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
        const localUsers =
          (await storageHelper.readData('district_stock_users_v1.json', null)) ||
          (await storageHelper.readData('users.json', []));

        const cloudUsers = await this.fetchCollection('users');
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          const mergedUsers = this.mergeLists(
            localUsers || [],
            cloudUsers,
            ['id', 'userId', 'accessCode', 'email']
          );
          await storageHelper.syncToAllVaults('district_stock_users_v1.json', mergedUsers);
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
        const localInbounds =
          (await storageHelper.readData('district_stock_inbound_v1.json', null)) ||
          (await storageHelper.readData('inbound_data.json', []));

        const cloudInbounds = await this.fetchCollection('inbounds');
        if (Array.isArray(cloudInbounds) && cloudInbounds.length > 0) {
          const mergedInbounds = this.mergeLists(
            localInbounds || [],
            cloudInbounds,
            ['consignmentNo', 'id']
          );
          await storageHelper.syncToAllVaults('district_stock_inbound_v1.json', mergedInbounds);
          await storageHelper.syncToAllVaults('inbound_data.json', mergedInbounds);
          await this.pushCollection('inbounds', mergedInbounds);
        } else if (Array.isArray(localInbounds) && localInbounds.length > 0) {
          await this.pushCollection('inbounds', localInbounds);
        }
      } catch (err) {
        console.warn('[cloudSync] Inbounds sync error:', err.message);
      }

      // 4. Sync Movements (Outbounds, Transfers, Returns)
      try {
        const localMovements =
          (await storageHelper.readData('district_stock_movements_v1.json', null)) ||
          (await storageHelper.readData('movement_data.json', { outbounds: [], transfers: [], returns: [] }));

        const cloudMovements = await this.fetchCollection('movements');
        if (cloudMovements && typeof cloudMovements === 'object') {
          const localOut = Array.isArray(localMovements) ? localMovements : (localMovements.outbounds || []);
          const localTr = Array.isArray(localMovements) ? [] : (localMovements.transfers || []);
          const localRet = Array.isArray(localMovements) ? [] : (localMovements.returns || []);

          const cloudOut = Array.isArray(cloudMovements) ? cloudMovements : (cloudMovements.outbounds || []);
          const cloudTr = Array.isArray(cloudMovements) ? [] : (cloudMovements.transfers || []);
          const cloudRet = Array.isArray(cloudMovements) ? [] : (cloudMovements.returns || []);

          const mergedMovements = {
            outbounds: this.mergeLists(localOut, cloudOut, ['no', 'id', 'movementId', 'refNo']),
            transfers: this.mergeLists(localTr, cloudTr, ['no', 'id', 'movementId', 'refNo']),
            returns: this.mergeLists(localRet, cloudRet, ['no', 'id', 'movementId', 'refNo', 'outboundNo']),
          };

          await storageHelper.syncToAllVaults('district_stock_movements_v1.json', mergedMovements);
          await storageHelper.syncToAllVaults('movement_data.json', mergedMovements);
          await this.pushCollection('movements', mergedMovements);
        } else if (localMovements && (localMovements.outbounds?.length || localMovements.transfers?.length || localMovements.returns?.length || (Array.isArray(localMovements) && localMovements.length > 0))) {
          await this.pushCollection('movements', localMovements);
        }
      } catch (err) {
        console.warn('[cloudSync] Movements sync error:', err.message);
      }

      // 5. Sync Logistics (Carriers & Transporters)
      try {
        const localLogistics = await storageHelper.readData('district_stock_logistics_carriers_v1.json', { carriers: [], transporters: [] });
        const cloudLogistics = await this.fetchCollection('logistics');
        if (cloudLogistics && typeof cloudLogistics === 'object') {
          const mergedLogistics = {
            carriers: Array.from(new Set([...(localLogistics.carriers || []), ...(cloudLogistics.carriers || [])])),
            transporters: Array.from(new Set([...(localLogistics.transporters || []), ...(cloudLogistics.transporters || [])])),
          };
          await storageHelper.syncToAllVaults('district_stock_logistics_carriers_v1.json', mergedLogistics);
          await this.pushCollection('logistics', mergedLogistics);
        } else if (localLogistics && (localLogistics.carriers?.length || localLogistics.transporters?.length)) {
          await this.pushCollection('logistics', localLogistics);
        }
      } catch (err) {
        console.warn('[cloudSync] Logistics sync error:', err.message);
      }

      console.log('[cloudSync] Bidirectional sync completed with Render cloud backend');
    } catch (e) {
      console.warn('[cloudSync] syncAll failed:', e.message);
    }
  },
};
