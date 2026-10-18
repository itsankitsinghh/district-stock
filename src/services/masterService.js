import { authService } from './authService';
import { storageHelper } from './storageHelper';

const MASTER_STORAGE_FILENAME = 'district_stock_master_v1.json';

class MasterService {
  constructor() {
    this.categories = [
      { id: 'CAT-001', name: 'Electronic', status: 'active' },
      { id: 'CAT-002', name: 'Books', status: 'active' },
      { id: 'CAT-003', name: 'Test', status: 'active' },
      { id: 'CAT-004', name: 'Furniture', status: 'active' },
      { id: 'CAT-005', name: 'Lighting', status: 'active' },
    ];
    this.productTypes = [
      { id: 'PT-001', name: 'Countable Asset', description: 'Countable item', status: 'active' },
      { id: 'PT-002', name: 'Serialized Asset', description: 'Barcode tracked item', status: 'active' },
    ];
    this.products = [];
    this.stockActionLogs = [];
    this.warehouses = [];
    this.events = [];
    this.requisitions = [];
    this.reportsHistory = [];
    this.scheduledReports = [];
    this.subscribers = [];
    this.isInitialized = false;
    this.initPromise = null;
    this.init();
  }

  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  notifySubscribers(data) {
    this.subscribers.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn('[MasterService] subscriber error:', err);
      }
    });
  }

  async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const parsed = await storageHelper.readData(MASTER_STORAGE_FILENAME, null);
        if (parsed) {
          if (Array.isArray(parsed.products)) {
            this.products = parsed.products;
          }
          if (Array.isArray(parsed.warehouses)) {
            // Strictly retain all user warehouses - never filter or wipe them!
            this.warehouses = parsed.warehouses;
          }
          if (Array.isArray(parsed.events)) this.events = parsed.events;
          if (Array.isArray(parsed.categories)) this.categories = parsed.categories;
          if (Array.isArray(parsed.productTypes)) this.productTypes = parsed.productTypes;
          if (Array.isArray(parsed.requisitions)) this.requisitions = parsed.requisitions;
          if (Array.isArray(parsed.stockActionLogs)) this.stockActionLogs = parsed.stockActionLogs;
          if (Array.isArray(parsed.reportsHistory)) this.reportsHistory = parsed.reportsHistory;
          if (Array.isArray(parsed.scheduledReports)) this.scheduledReports = parsed.scheduledReports;
        }

        // Sync all active warehouses with Admin and active events with Event Planner
        const activeWhs = this.warehouses.filter((w) => (w.status || 'active').toLowerCase() === 'active');
        const activeEvs = this.events.filter((e) => (e.status || 'active').toLowerCase() === 'active');
        if (authService) {
          try {
            if (authService.init) await authService.init();
            if (authService.syncMasterAssignments) await authService.syncMasterAssignments(activeWhs, activeEvs);
          } catch (_) {}
        }
      } catch (e) {
        console.warn('[MasterService] init storage error:', e);
      } finally {
        this.isInitialized = true;
        this.initPromise = null;
        this.notifySubscribers({
          type: 'MASTER_INITIALIZED',
          warehouses: this.warehouses,
          products: this.products,
          events: this.events,
        });
      }
    })();

    return this.initPromise;
  }

  async writeToDisk() {
    try {
      await storageHelper.writeData(MASTER_STORAGE_FILENAME, {
        products: this.products,
        warehouses: this.warehouses,
        events: this.events,
        categories: this.categories,
        productTypes: this.productTypes,
        requisitions: this.requisitions,
        stockActionLogs: this.stockActionLogs,
        reportsHistory: this.reportsHistory,
        scheduledReports: this.scheduledReports,
      });
    } catch (err) {
      console.warn('[MasterService] writeToDisk error:', err);
    }
  }

  async persist() {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      await this.writeToDisk();
    } catch (e) {
      console.warn('[MasterService] persist error:', e);
    }
  }

  // --- Products ---
  getProducts() {
    return [...this.products];
  }

  addProduct(data) {
    let finalSku = data.sku ? data.sku.trim().toUpperCase() : '';
    if (!finalSku) {
      const prefix = (data.name || 'PRD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PRD';
      finalSku = `DST-${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      while (this.products.some((p) => p.sku.trim().toLowerCase() === finalSku.toLowerCase())) {
        finalSku = `DST-${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      }
    } else {
      // Unique SKU validation
      const skuExists = this.products.some(
        (p) => p.sku.trim().toLowerCase() === finalSku.toLowerCase()
      );
      if (skuExists) {
        return { success: false, message: 'SKU code already exists. Please choose a unique SKU.' };
      }
    }

    const newId = `PRD-${String(this.products.length + 1).padStart(3, '0')}`;
    const newProduct = {
      id: newId,
      name: data.name.trim(),
      sku: finalSku,
      trackingType: data.trackingType || 'Countable',
      warehouse: data.warehouse ? data.warehouse.trim() : '',
      category: data.category || 'General',
      uom: data.uom || 'Pieces (Pcs)',
      lowStockAlert: Number(data.lowStockAlert) || 10,
      unitPrice: Number(data.unitPrice) || 0,
      returnability: data.returnability || 'Returnable',
      notes: data.notes ? data.notes.trim() : '',
      status: data.status || 'active',
    };
    this.products.unshift(newProduct);
    this.persist();
    this.notifySubscribers({ type: 'PRODUCTS_UPDATED', products: this.products });
    return { success: true, product: newProduct };
  }

  updateProduct(id, data) {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false, message: 'Product not found' };

    // Check SKU duplicate if changed
    if (data.sku && data.sku.trim().toUpperCase() !== this.products[idx].sku) {
      const skuExists = this.products.some(
        (p) => p.id !== id && p.sku.trim().toLowerCase() === data.sku.trim().toLowerCase()
      );
      if (skuExists) {
        return { success: false, message: 'SKU code already in use by another product.' };
      }
    }

    this.products[idx] = {
      ...this.products[idx],
      ...data,
      warehouse: data.warehouse !== undefined ? data.warehouse.trim() : this.products[idx].warehouse,
      sku: data.sku ? data.sku.trim().toUpperCase() : this.products[idx].sku,
    };
    this.persist();
    this.notifySubscribers({ type: 'PRODUCTS_UPDATED', products: this.products });
    return { success: true, product: this.products[idx] };
  }

  toggleProductStatus(id) {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false };
    const current = this.products[idx].status;
    this.products[idx].status = current === 'active' ? 'inactive' : 'active';
    this.persist();
    this.notifySubscribers({ type: 'PRODUCTS_UPDATED', products: this.products });
    return { success: true, status: this.products[idx].status };
  }

  deleteProduct(id) {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false };
    this.products.splice(idx, 1);
    this.persist();
    this.notifySubscribers({ type: 'PRODUCTS_UPDATED', products: this.products });
    return { success: true };
  }

  // --- Warehouses ---
  getWarehouses(userScope = null) {
    if (!userScope || userScope.length === 0) {
      return [...this.warehouses];
    }
    // Filter authorized locations for Operations Manager or scoped users if provided
    const filtered = this.warehouses.filter(
      (w) => userScope.includes(w.name) || userScope.includes(w.code)
    );
    return filtered.length > 0 ? filtered : [...this.warehouses];
  }

  addWarehouse(data) {
    let finalCode = data.code ? data.code.trim().toUpperCase() : '';
    if (!finalCode) {
      const nextNum = String(this.warehouses.length + 1).padStart(3, '0');
      finalCode = `WH-${nextNum}`;
      while (this.warehouses.some((w) => w.code.trim().toLowerCase() === finalCode.toLowerCase())) {
        finalCode = `WH-${Math.floor(100 + Math.random() * 900)}`;
      }
    } else {
      const codeExists = this.warehouses.some(
        (w) => w.code.trim().toLowerCase() === finalCode.toLowerCase()
      );
      if (codeExists) {
        return { success: false, message: 'Warehouse code already exists.' };
      }
    }

    const newWarehouse = {
      id: finalCode,
      code: finalCode,
      name: data.name.trim(),
      address: data.address ? data.address.trim() : '',
      zipCode: data.zipCode ? data.zipCode.trim() : '',
      city: data.city ? data.city.trim() : '',
      state: data.state ? data.state.trim() : '',
      country: data.country ? data.country.trim() : 'India',
      pocName: data.pocName ? data.pocName.trim() : '',
      contactNo: data.contactNo ? data.contactNo.trim() : '',
      status: data.status || 'active',
    };
    this.warehouses.unshift(newWarehouse);
    this.persist();

    // Auto-link to Admin user's location assignment if active
    if ((newWarehouse.status || 'active').toLowerCase() === 'active') {
      if (authService && authService.linkWarehouseToAdmin) {
        authService.linkWarehouseToAdmin(newWarehouse.name);
      }
    }

    this.notifySubscribers({ type: 'WAREHOUSES_UPDATED', warehouses: this.warehouses });
    return { success: true, warehouse: newWarehouse };
  }

  updateWarehouse(id, data) {
    const idx = this.warehouses.findIndex((w) => w.id === id);
    if (idx === -1) return { success: false, message: 'Warehouse not found' };
    const oldName = this.warehouses[idx].name;
    this.warehouses[idx] = {
      ...this.warehouses[idx],
      name: data.name !== undefined ? data.name.trim() : this.warehouses[idx].name,
      code: data.code !== undefined ? data.code.trim().toUpperCase() : this.warehouses[idx].code,
      address: data.address !== undefined ? data.address.trim() : this.warehouses[idx].address,
      zipCode: data.zipCode !== undefined ? data.zipCode.trim() : this.warehouses[idx].zipCode,
      city: data.city !== undefined ? data.city.trim() : this.warehouses[idx].city,
      state: data.state !== undefined ? data.state.trim() : this.warehouses[idx].state,
      country: data.country !== undefined ? data.country.trim() : this.warehouses[idx].country,
      pocName: data.pocName !== undefined ? data.pocName.trim() : this.warehouses[idx].pocName,
      contactNo: data.contactNo !== undefined ? data.contactNo.trim() : this.warehouses[idx].contactNo,
      status: data.status !== undefined ? data.status : this.warehouses[idx].status,
    };
    this.persist();

    const updated = this.warehouses[idx];
    if (authService) {
      if (oldName !== updated.name) {
        authService.unlinkWarehouseFromAdmin?.(oldName);
      }
      if ((updated.status || '').toLowerCase() === 'active') {
        authService.linkWarehouseToAdmin?.(updated.name);
      } else {
        authService.unlinkWarehouseFromAdmin?.(updated.name);
      }
    }

    this.notifySubscribers({ type: 'WAREHOUSES_UPDATED', warehouses: this.warehouses });
    return { success: true, warehouse: this.warehouses[idx] };
  }

  toggleWarehouseStatus(id) {
    const idx = this.warehouses.findIndex((w) => w.id === id);
    if (idx === -1) return { success: false };
    const current = this.warehouses[idx].status;
    this.warehouses[idx].status = current === 'active' ? 'inactive' : 'active';
    this.persist();
    const wh = this.warehouses[idx];
    if (authService) {
      if (wh.status === 'active') {
        authService.linkWarehouseToAdmin?.(wh.name);
      } else {
        authService.unlinkWarehouseFromAdmin?.(wh.name);
      }
    }
    this.notifySubscribers({ type: 'WAREHOUSES_UPDATED', warehouses: this.warehouses });
    return { success: true, status: this.warehouses[idx].status };
  }

  deleteWarehouse(id) {
    const idx = this.warehouses.findIndex((w) => w.id === id);
    if (idx === -1) return { success: false };
    const whName = this.warehouses[idx].name;
    this.warehouses.splice(idx, 1);
    this.persist();
    if (authService && authService.unlinkWarehouseFromAdmin) {
      authService.unlinkWarehouseFromAdmin(whName);
    }
    this.notifySubscribers({ type: 'WAREHOUSES_UPDATED', warehouses: this.warehouses });
    return { success: true };
  }

  // --- Events ---
  getEvents() {
    return [...this.events];
  }

  addEvent(data) {
    let finalCode = data.code ? data.code.trim().toUpperCase() : '';
    if (!finalCode) {
      const nextNum = String(this.events.length + 1).padStart(3, '0');
      finalCode = `EV-${nextNum}`;
      while (this.events.some((e) => e.code.trim().toLowerCase() === finalCode.toLowerCase())) {
        finalCode = `EV-${Math.floor(100 + Math.random() * 900)}`;
      }
    } else {
      const codeExists = this.events.some(
        (e) => e.code.trim().toLowerCase() === finalCode.toLowerCase()
      );
      if (codeExists) {
        return { success: false, message: 'Event code already exists. Please choose a unique code.' };
      }
    }

    const newEvent = {
      id: finalCode,
      code: finalCode,
      name: data.name && data.name.trim() ? data.name.trim() : finalCode,
      address: data.address ? data.address.trim() : (data.venue || ''),
      venue: data.address ? data.address.trim() : (data.venue || ''),
      zipCode: data.zipCode ? data.zipCode.trim() : '',
      city: data.city ? data.city.trim() : '',
      state: data.state ? data.state.trim() : '',
      country: data.country ? data.country.trim() : 'India',
      pocName: data.pocName ? data.pocName.trim() : '',
      contactNo: data.contactNo ? data.contactNo.trim() : '',
      dates: data.dates ? data.dates.trim() : 'Scheduled',
      planner: data.planner || data.pocName || 'Lead Planner',
      status: data.status || 'active',
    };
    this.events.unshift(newEvent);
    this.persist();

    // Auto-link to Event Planner user's location assignment if active
    if ((newEvent.status || 'active').toLowerCase() === 'active') {
      if (authService && authService.linkEventToEventPlanner) {
        authService.linkEventToEventPlanner(newEvent.name);
      }
    }

    return { success: true, event: newEvent };
  }

  updateEvent(id, data) {
    const idx = this.events.findIndex((e) => e.id === id || e.code === id);
    if (idx === -1) return { success: false, message: 'Event not found' };

    // Unique code check if changed
    if (data.code && data.code.trim().toUpperCase() !== this.events[idx].code) {
      const codeExists = this.events.some(
        (e) => (e.id !== id && e.code !== id) && e.code.trim().toLowerCase() === data.code.trim().toLowerCase()
      );
      if (codeExists) {
        return { success: false, message: 'Event code already in use by another event.' };
      }
    }

    const oldName = this.events[idx].name;
    const updatedCode = data.code !== undefined ? data.code.trim().toUpperCase() : this.events[idx].code;
    this.events[idx] = {
      ...this.events[idx],
      code: updatedCode,
      name: data.name !== undefined ? (data.name.trim() || updatedCode) : this.events[idx].name,
      address: data.address !== undefined ? data.address.trim() : this.events[idx].address,
      venue: data.address !== undefined ? data.address.trim() : this.events[idx].venue,
      zipCode: data.zipCode !== undefined ? data.zipCode.trim() : this.events[idx].zipCode,
      city: data.city !== undefined ? data.city.trim() : this.events[idx].city,
      state: data.state !== undefined ? data.state.trim() : this.events[idx].state,
      country: data.country !== undefined ? data.country.trim() : this.events[idx].country,
      pocName: data.pocName !== undefined ? data.pocName.trim() : this.events[idx].pocName,
      contactNo: data.contactNo !== undefined ? data.contactNo.trim() : this.events[idx].contactNo,
      status: data.status !== undefined ? data.status : this.events[idx].status,
    };
    this.persist();

    const updated = this.events[idx];
    if (authService) {
      if (oldName !== updated.name) {
        authService.unlinkEventFromEventPlanner?.(oldName);
      }
      if ((updated.status || '').toLowerCase() === 'active') {
        authService.linkEventToEventPlanner?.(updated.name);
      } else {
        authService.unlinkEventFromEventPlanner?.(updated.name);
      }
    }

    return { success: true, event: this.events[idx] };
  }

  toggleEventStatus(id) {
    const idx = this.events.findIndex((e) => e.id === id || e.code === id);
    if (idx === -1) return { success: false };
    const current = (this.events[idx].status || '').toLowerCase();
    this.events[idx].status = current === 'active' ? 'inactive' : 'active';
    this.persist();
    const ev = this.events[idx];
    if (authService) {
      if (ev.status === 'active') {
        authService.linkEventToEventPlanner?.(ev.name);
      } else {
        authService.unlinkEventFromEventPlanner?.(ev.name);
      }
    }
    return { success: true, status: this.events[idx].status };
  }

  deleteEvent(id) {
    const idx = this.events.findIndex((e) => e.id === id || e.code === id);
    if (idx === -1) return { success: false };
    const evName = this.events[idx].name;
    this.events.splice(idx, 1);
    this.persist();
    if (authService && authService.unlinkEventFromEventPlanner) {
      authService.unlinkEventFromEventPlanner(evName);
    }
    return { success: true };
  }

  // --- Requisitions (Event Planner) ---
  getRequisitions() {
    if (!this.requisitions) {
      this.requisitions = [];
    }
    return [...this.requisitions];
  }

  addRequisition(data) {
    if (!this.requisitions) {
      this.requisitions = [];
    }
    const nextSeq = this.requisitions.length + 1;
    const newId = `REQ-${String(nextSeq).padStart(4, '0')}`;
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const newReq = {
      id: newId,
      eventCode: data.eventCode || 'EV-001',
      eventName: data.eventName || 'Event',
      eventDate: data.eventDate || '',
      items: data.items || [],
      requestedDate: todayStr,
      neededDate: data.requiredDate || '15 Oct',
      requiredDate: data.requiredDate || '',
      deliveryLocation: data.deliveryLocation || '',
      pocName: data.pocName || '',
      pocNo: data.pocNo || '',
      status: 'In Review',
      progress: 0.20,
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      planner: data.planner || 'Sneha Patil',
    };
    this.requisitions.unshift(newReq);
    return newReq;
  }

  updateRequisitionStatus(id, newStatus) {
    if (!this.requisitions) return null;
    const req = this.requisitions.find((r) => r.id === id);
    if (req) {
      req.status = newStatus;
      return req;
    }
    return null;
  }

  // --- Categories ---
  getCategories() {
    return [...this.categories];
  }

  addCategory(name) {
    const exists = this.categories.some(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) return { success: false, message: 'Category already exists.' };
    const newCat = {
      id: `CAT-${String(this.categories.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      status: 'active',
    };
    this.categories.push(newCat);
    return { success: true, category: newCat };
  }

  toggleCategoryStatus(id) {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) return { success: false };
    const current = this.categories[idx].status;
    this.categories[idx].status = current === 'active' ? 'inactive' : 'active';
    return { success: true, status: this.categories[idx].status };
  }

  deleteCategory(id) {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) return { success: false };
    this.categories.splice(idx, 1);
    return { success: true };
  }

  // --- Product Types ---
  getProductTypes() {
    return [...this.productTypes];
  }

  addProductType(name, description = '') {
    const exists = this.productTypes.some(
      (pt) => pt.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) return { success: false, message: 'Product type already exists.' };
    const newPt = {
      id: `PT-${String(this.productTypes.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      description: description.trim() || 'Custom product tracking type',
      status: 'active',
    };
    this.productTypes.push(newPt);
    return { success: true, productType: newPt };
  }

  toggleProductTypeStatus(id) {
    const idx = this.productTypes.findIndex((pt) => pt.id === id);
    if (idx === -1) return { success: false };
    const current = this.productTypes[idx].status;
    this.productTypes[idx].status = current === 'active' ? 'inactive' : 'active';
    return { success: true, status: this.productTypes[idx].status };
  }

  // --- Stock Actions: Available / Damage ---
  markItemAsDamaged(productId, qty = 1, reason = 'Crushed', photos = [], note = '') {
    const idx = this.products.findIndex((p) => p.id === productId || p.sku === productId);
    if (idx === -1) return { success: false, message: 'Product not found' };
    const p = this.products[idx];
    const deductQty = Math.min(qty, p.availableQty || 0);
    p.availableQty = Math.max(0, (p.availableQty || 0) - deductQty);
    p.damagedQty = (p.damagedQty || 0) + deductQty;

    const log = {
      id: `DMG-${Date.now()}`,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      type: 'DAMAGED',
      quantity: deductQty,
      reason,
      photos,
      note,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', 10 Oct 2026',
      user: 'Ground User',
    };
    if (!this.stockActionLogs) this.stockActionLogs = [];
    this.stockActionLogs.unshift(log);

    return { success: true, product: p, log };
  }

  markItemAsAvailable(productId, qty = 1, note = '') {
    const idx = this.products.findIndex((p) => p.id === productId || p.sku === productId);
    if (idx === -1) return { success: false, message: 'Product not found' };
    const p = this.products[idx];
    const restoreQty = Math.min(qty, p.damagedQty || 0);
    p.damagedQty = Math.max(0, (p.damagedQty || 0) - restoreQty);
    p.availableQty = (p.availableQty || 0) + restoreQty;

    const log = {
      id: `AVL-${Date.now()}`,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      type: 'AVAILABLE',
      quantity: restoreQty,
      reason: 'Repaired & Verified',
      note,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', 10 Oct 2026',
      user: 'Ground User',
    };
    if (!this.stockActionLogs) this.stockActionLogs = [];
    this.stockActionLogs.unshift(log);

    return { success: true, product: p, log };
  }

  addInboundStock(productLines, inboundNo = '') {
    if (!Array.isArray(productLines)) return;
    productLines.forEach((line) => {
      const idx = this.products.findIndex(
        (p) =>
          (line.productId && p.id === line.productId) ||
          (line.sku && p.sku && p.sku.trim().toLowerCase() === line.sku.trim().toLowerCase()) ||
          (line.productName && p.name && p.name.trim().toLowerCase() === line.productName.trim().toLowerCase())
      );
      const qtyToAdd = parseInt(line.putawayQty || line.receivedQty, 10) || 0;
      if (idx !== -1 && qtyToAdd > 0) {
        this.products[idx].availableQty = (this.products[idx].availableQty || 0) + qtyToAdd;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const log = {
          id: `INB-STK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          productId: this.products[idx].id,
          productName: this.products[idx].name,
          sku: this.products[idx].sku,
          type: 'AVAILABLE',
          quantity: qtyToAdd,
          reason: `Inbound Putaway Completed (${inboundNo || 'Consignment'})`,
          note: `Received into inventory via Inbound ${inboundNo || ''}`,
          timestamp: `${timeStr}, ${dateStr}`,
          user: 'Warehouse User',
        };
        if (!this.stockActionLogs) this.stockActionLogs = [];
        this.stockActionLogs.unshift(log);
      }
    });
    this.persist();
    this.notifySubscribers({ type: 'PRODUCTS_UPDATED', products: this.products });
  }

  getStockActionLogs() {
    return this.stockActionLogs || [];
  }

  // --- Reports Module (INCIFLO WMS Flow) ---
  initReportsData() {
    if (!this.reportsHistory) {
      this.reportsHistory = [];
    }
    if (!this.scheduledReports) {
      this.scheduledReports = [];
    }
  }

  getReportsHistory() {
    this.initReportsData();
    return [...this.reportsHistory];
  }

  generateReport(reportName, warehouse, fromDate, toDate, user = 'Demo1', format = 'XLSX') {
    this.initReportsData();
    const newReport = {
      id: `RPT-${Date.now().toString().slice(-4)}`,
      reportName,
      warehouse: warehouse || 'Sagar Complex Warehouse',
      fromDate: fromDate || 'Jul 1, 2026',
      toDate: toDate || 'Oct 11, 2026',
      downloadedBy: user,
      generatedTime: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'COMPLETED',
      format,
      recordsCount: Math.floor(Math.random() * 150) + 25,
      fileSize: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
    };
    this.reportsHistory.unshift(newReport);
    return newReport;
  }

  deleteReport(id) {
    this.initReportsData();
    const idx = this.reportsHistory.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.reportsHistory.splice(idx, 1);
      return true;
    }
    return false;
  }

  getScheduledReports() {
    this.initReportsData();
    return [...this.scheduledReports];
  }

  addScheduledReport(reportName, warehouse, frequency, time, recipients) {
    this.initReportsData();
    const newSchedule = {
      id: `SCH-${Date.now().toString().slice(-3)}`,
      reportName,
      warehouse: warehouse || 'All Warehouses',
      frequency: frequency || 'Daily',
      time: time || '09:00 AM',
      recipients: recipients || 'ops@districtstock.com',
      status: 'Active',
      lastRun: 'Scheduled',
    };
    this.scheduledReports.unshift(newSchedule);
    return newSchedule;
  }

  toggleScheduledReportStatus(id) {
    this.initReportsData();
    const item = this.scheduledReports.find((s) => s.id === id);
    if (item) {
      item.status = item.status === 'Active' ? 'Paused' : 'Active';
      return item.status;
    }
    return null;
  }
}

export const masterService = new MasterService();
export default masterService;
