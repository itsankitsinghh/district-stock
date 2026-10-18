/**
 * District Stock — Centralized Outbound, Transfer, and Return Movement Service
 * 
 * Manages and persists all non-inbound logistics movements:
 * - Outbound Consignments
 * - Stock Transfer Consignments
 * - Return Consignments
 * 
 * Powered by storageHelper for permanent survival across APK updates.
 */

import { storageHelper } from './storageHelper';

const MOVEMENTS_STORAGE_FILE = 'district_stock_movements_v1.json';

class MovementService {
  constructor() {
    this.outbounds = [];
    this.transfers = [];
    this.returns = [];
    this.isInitialized = false;
    this.initPromise = null;
    this.subscribers = [];
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      return () => {
        this.subscribers = this.subscribers.filter((cb) => cb !== callback);
      };
    }
    return () => {};
  }

  notifySubscribers() {
    this.subscribers.forEach((cb) => {
      try {
        cb({
          outbounds: [...this.outbounds],
          transfers: [...this.transfers],
          returns: [...this.returns],
        });
      } catch (err) {
        console.warn('[MovementService] Subscriber error:', err);
      }
    });
  }

  async init() {
    if (this.isInitialized) {
      return {
        outbounds: this.outbounds,
        transfers: this.transfers,
        returns: this.returns,
      };
    }
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const saved = await storageHelper.readData(MOVEMENTS_STORAGE_FILE, null);
        if (saved) {
          if (Array.isArray(saved.outbounds)) this.outbounds = saved.outbounds;
          if (Array.isArray(saved.transfers)) this.transfers = saved.transfers;
          if (Array.isArray(saved.returns)) this.returns = saved.returns;
        }
      } catch (err) {
        console.warn('[MovementService] Init error:', err);
      } finally {
        this.isInitialized = true;
        this.initPromise = null;
      }
      return {
        outbounds: this.outbounds,
        transfers: this.transfers,
        returns: this.returns,
      };
    })();

    return this.initPromise;
  }

  async persist() {
    try {
      await storageHelper.writeData(MOVEMENTS_STORAGE_FILE, {
        outbounds: this.outbounds,
        transfers: this.transfers,
        returns: this.returns,
      });
    } catch (err) {
      console.warn('[MovementService] Persist error:', err);
    }
    this.notifySubscribers();
  }

  // --- Outbound ---
  getOutbounds() {
    return [...this.outbounds];
  }

  setOutbounds(newList) {
    this.outbounds = Array.isArray(newList) ? newList : [];
    this.persist();
  }

  addOutbound(item) {
    const existingIndex = this.outbounds.findIndex((o) => o.id === item.id);
    if (existingIndex >= 0) {
      this.outbounds[existingIndex] = { ...this.outbounds[existingIndex], ...item };
    } else {
      this.outbounds = [item, ...this.outbounds];
    }
    this.persist();
  }

  updateOutbound(id, updateData) {
    this.outbounds = this.outbounds.map((item) =>
      item.id === id ? { ...item, ...updateData } : item
    );
    this.persist();
  }

  deleteOutbound(id) {
    this.outbounds = this.outbounds.filter((item) => item.id !== id);
    this.persist();
  }

  // --- Transfer ---
  getTransfers() {
    return [...this.transfers];
  }

  setTransfers(newList) {
    this.transfers = Array.isArray(newList) ? newList : [];
    this.persist();
  }

  addTransfer(item) {
    const existingIndex = this.transfers.findIndex((t) => t.id === item.id);
    if (existingIndex >= 0) {
      this.transfers[existingIndex] = { ...this.transfers[existingIndex], ...item };
    } else {
      this.transfers = [item, ...this.transfers];
    }
    this.persist();
  }

  updateTransfer(id, updateData) {
    this.transfers = this.transfers.map((item) =>
      item.id === id ? { ...item, ...updateData } : item
    );
    this.persist();
  }

  deleteTransfer(id) {
    this.transfers = this.transfers.filter((item) => item.id !== id);
    this.persist();
  }

  // --- Return ---
  getReturns() {
    return [...this.returns];
  }

  setReturns(newList) {
    this.returns = Array.isArray(newList) ? newList : [];
    this.persist();
  }

  addReturn(item) {
    const existingIndex = this.returns.findIndex((r) => r.id === item.id);
    if (existingIndex >= 0) {
      this.returns[existingIndex] = { ...this.returns[existingIndex], ...item };
    } else {
      this.returns = [item, ...this.returns];
    }
    this.persist();
  }

  updateReturn(id, updateData) {
    this.returns = this.returns.map((item) =>
      item.id === id ? { ...item, ...updateData } : item
    );
    this.persist();
  }

  deleteReturn(id) {
    this.returns = this.returns.filter((item) => item.id !== id);
    this.persist();
  }
}

export const movementService = new MovementService();
export default movementService;
