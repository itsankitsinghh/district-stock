/**
 * District Stock — Centralized Carrier & Transporter Management Service
 * 
 * Provides:
 * - Dynamic addition and removal of user-defined Carriers and Transporters
 * - Multi-vault persistent storage via storageHelper
 * - Zero dummy / auto-populated records (100% user-created)
 */

import { storageHelper } from './storageHelper';

const CARRIERS_STORAGE_FILE = 'district_stock_logistics_carriers_v1.json';

class CarrierService {
  constructor() {
    this.carriers = [];
    this.transporters = [];
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
          carriers: [...this.carriers],
          transporters: [...this.transporters],
        });
      } catch (err) {
        console.warn('[CarrierService] Subscriber error:', err);
      }
    });
  }

  async init() {
    if (this.isInitialized) {
      return {
        carriers: this.carriers,
        transporters: this.transporters,
      };
    }
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const loaded = await storageHelper.readData(CARRIERS_STORAGE_FILE, {
          carriers: [],
          transporters: [],
        });
        if (loaded && typeof loaded === 'object') {
          this.carriers = Array.isArray(loaded.carriers) ? loaded.carriers : [];
          this.transporters = Array.isArray(loaded.transporters) ? loaded.transporters : [];
        }
      } catch (err) {
        console.warn('[CarrierService] Failed to load data:', err);
        this.carriers = [];
        this.transporters = [];
      } finally {
        this.isInitialized = true;
      }
      return {
        carriers: this.carriers,
        transporters: this.transporters,
      };
    })();

    return this.initPromise;
  }

  async persist() {
    try {
      await storageHelper.writeData(CARRIERS_STORAGE_FILE, {
        carriers: this.carriers,
        transporters: this.transporters,
      });
    } catch (err) {
      console.warn('[CarrierService] Failed to persist data:', err);
    }
  }

  getCarriers() {
    return [...this.carriers];
  }

  getTransporters() {
    return [...this.transporters];
  }

  async addCarrier(name) {
    await this.init();
    const clean = (name || '').trim();
    if (!clean) return { success: false, message: 'Name cannot be empty' };
    if (!this.carriers.includes(clean)) {
      this.carriers.push(clean);
      await this.persist();
      this.notifySubscribers();
    }
    return { success: true, item: clean };
  }

  async deleteCarrier(name) {
    await this.init();
    const clean = (name || '').trim();
    this.carriers = this.carriers.filter((c) => c !== clean);
    await this.persist();
    this.notifySubscribers();
    return { success: true };
  }

  async addTransporter(name) {
    await this.init();
    const clean = (name || '').trim();
    if (!clean) return { success: false, message: 'Name cannot be empty' };
    if (!this.transporters.includes(clean)) {
      this.transporters.push(clean);
      await this.persist();
      this.notifySubscribers();
    }
    return { success: true, item: clean };
  }

  async deleteTransporter(name) {
    await this.init();
    const clean = (name || '').trim();
    this.transporters = this.transporters.filter((t) => t !== clean);
    await this.persist();
    this.notifySubscribers();
    return { success: true };
  }
}

export const carrierService = new CarrierService();
export default carrierService;
