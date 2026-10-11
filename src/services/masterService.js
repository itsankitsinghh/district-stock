// Master Data Service for District Stock
// Manages Products, Warehouses, Events, Categories, and Product Types

class MasterService {
  constructor() {
    this.categories = [
      { id: 'CAT-001', name: 'Electronics', status: 'active' },
      { id: 'CAT-002', name: 'Event Branding', status: 'active' },
      { id: 'CAT-003', name: 'Furniture', status: 'active' },
      { id: 'CAT-004', name: 'Sound & Audio', status: 'active' },
      { id: 'CAT-005', name: 'Lighting & Truss', status: 'active' },
    ];

    this.productTypes = [
      { id: 'PT-001', name: 'Countable', description: 'Tracked by quantity count', status: 'active' },
      { id: 'PT-002', name: 'Consumable', description: 'Single-use event items', status: 'active' },
      { id: 'PT-003', name: 'Serial Track', description: 'Individual barcode/serial identifier', status: 'active' },
    ];

    this.products = [
      {
        id: 'PRD-001',
        name: 'Item 22',
        sku: 'TEST',
        lotNumber: 'LOT-AN-101',
        trackingType: 'Countable',
        category: 'Electronics',
        uom: 'Pieces (Pcs)',
        lowStockAlert: 10,
        unitPrice: 1500,
        availableQty: 45,
        damagedQty: 2,
        reservedQty: 8,
        totalQty: 55,
        returnability: 'Returnable',
        notes: 'Standard staging accessory',
        status: 'active',
      },
      {
        id: 'PRD-002',
        name: 'Portable Speaker',
        sku: 'AUD-002',
        lotNumber: 'LOT-AUD-88B',
        trackingType: 'Serial',
        category: 'Sound & Audio',
        uom: 'Pieces (Pcs)',
        lowStockAlert: 5,
        unitPrice: 4200,
        availableQty: 18,
        damagedQty: 1,
        reservedQty: 4,
        totalQty: 23,
        returnability: 'Returnable',
        notes: 'High-power battery outdoor audio',
        status: 'active',
      },
      {
        id: 'PRD-003',
        name: 'Event Banner',
        sku: 'BRD-008',
        lotNumber: 'LOT-BRD-55C',
        trackingType: 'Consumable',
        category: 'Event Branding',
        uom: 'Pieces (Pcs)',
        lowStockAlert: 20,
        unitPrice: 850,
        availableQty: 80,
        damagedQty: 0,
        reservedQty: 15,
        totalQty: 95,
        returnability: 'Consumable',
        notes: 'District neon branded vinyl banner',
        status: 'active',
      },
      {
        id: 'PRD-004',
        name: 'Folding VIP Chair',
        sku: 'FUR-019',
        lotNumber: 'LOT-FUR-12D',
        trackingType: 'Countable',
        category: 'Furniture',
        uom: 'Pieces (Pcs)',
        lowStockAlert: 15,
        unitPrice: 1200,
        availableQty: 120,
        damagedQty: 6,
        reservedQty: 30,
        totalQty: 156,
        returnability: 'Returnable',
        notes: 'Padded black VIP seating',
        status: 'active',
      },
      {
        id: 'PRD-005',
        name: 'LED Spotlight 200W',
        sku: 'LGT-004',
        lotNumber: 'LOT-LGT-77E',
        trackingType: 'Serial',
        category: 'Lighting & Truss',
        uom: 'Pieces (Pcs)',
        lowStockAlert: 8,
        unitPrice: 3100,
        availableQty: 28,
        damagedQty: 3,
        reservedQty: 6,
        totalQty: 37,
        returnability: 'Returnable',
        notes: 'RGB Stage spotlight with DMX support',
        status: 'active',
      },
    ];

    this.stockActionLogs = [
      {
        id: 'DMG-1001',
        productId: 'PRD-004',
        productName: 'Folding VIP Chair',
        sku: 'FUR-019',
        type: 'DAMAGED',
        quantity: 2,
        reason: 'Crushed',
        photos: [],
        note: 'Damaged during return transit from JLN Stadium',
        timestamp: '10 Oct 2026, 04:30 PM',
        user: 'Ground User',
      },
    ];

    this.warehouses = [
      {
        id: 'WH-001',
        code: 'WH-001',
        name: 'North Central Hub',
        city: 'New Delhi',
        address: 'Sector 18, Industrial Area',
        status: 'active',
      },
      {
        id: 'WH-002',
        code: 'WH-002',
        name: 'West Regional Hub',
        city: 'Mumbai',
        address: 'Bhiwandi Logistics Park',
        status: 'active',
      },
      {
        id: 'WH-003',
        code: 'WH-003',
        name: 'JLN Stadium Store',
        city: 'New Delhi',
        address: 'Gate 4, JLN Stadium Complex',
        status: 'active',
      },
      {
        id: 'WH-004',
        code: 'WH-004',
        name: 'Vagator Beach Arena Store',
        city: 'Goa',
        address: 'Near Sunburn Arena, Vagator',
        status: 'active',
      },
    ];

    this.events = [
      {
        id: 'EV-001',
        code: 'EV-001',
        name: 'City Music Fest',
        venue: 'Mumbai · Jio Garden',
        dates: '10–12 Oct',
        planner: 'Sneha Patil',
        status: 'Upcoming',
      },
      {
        id: 'EV-002',
        code: 'EV-002',
        name: 'Brand Launch',
        venue: 'Pune · Hyatt Regency',
        dates: '18 Oct',
        planner: 'Sneha Patil',
        status: 'Active',
      },
      {
        id: 'EV-003',
        code: 'EV-003',
        name: 'Sports Weekend',
        venue: 'Goa · Fatorda Stadium',
        dates: '25–26 Oct',
        planner: 'Sneha Patil',
        status: 'Upcoming',
      },
    ];

    this.requisitions = [
      {
        id: 'REQ-0001',
        eventCode: 'EV-001',
        eventName: 'Summer Music Festival',
        eventDate: '10–15 Oct 2026',
        requestedDate: '10 Oct',
        neededDate: '15 Oct',
        progress: 0.24,
        items: [
          { productId: 'PRD-004', name: 'Folding VIP Chair', uom: 'Pieces (Pcs)', qty: 30, fulfilledQty: 0 },
          { productId: 'PRD-002', name: 'Portable Speaker', uom: 'Pieces (Pcs)', qty: 6, fulfilledQty: 0 },
        ],
        requiredDate: '15/10/2026',
        deliveryLocation: 'Mumbai · Jio Garden BKC',
        pocName: 'Sneha Patil',
        pocNo: '9820198201',
        status: 'In Review',
        submittedAt: '10 Oct 2026, 11:30 AM',
        planner: 'Sneha Patil',
      },
      {
        id: 'REQ-0002',
        eventCode: 'EV-002',
        eventName: 'Food Carnival',
        eventDate: '08–12 Oct 2026',
        requestedDate: '08 Oct',
        neededDate: '12 Oct',
        progress: 0.55,
        items: [
          { productId: 'PRD-003', name: 'Event Banner', uom: 'Pieces (Pcs)', qty: 15, fulfilledQty: 10 },
          { productId: 'PRD-005', name: 'LED Spotlight 200W', uom: 'Pieces (Pcs)', qty: 8, fulfilledQty: 4 },
        ],
        requiredDate: '12/10/2026',
        deliveryLocation: 'Pune · Hyatt Regency Complex',
        pocName: 'Sneha Patil',
        pocNo: '9820198201',
        status: 'Partially Fulfilled',
        submittedAt: '08 Oct 2026, 02:15 PM',
        planner: 'Sneha Patil',
      },
      {
        id: 'REQ-0003',
        eventCode: 'EV-003',
        eventName: 'College Fest',
        eventDate: '06–09 Oct 2026',
        requestedDate: '06 Oct',
        neededDate: '09 Oct',
        progress: 1.0,
        items: [
          { productId: 'PRD-001', name: 'Item 22', uom: 'Pieces (Pcs)', qty: 20, fulfilledQty: 20 },
          { productId: 'PRD-004', name: 'Folding VIP Chair', uom: 'Pieces (Pcs)', qty: 50, fulfilledQty: 50 },
        ],
        requiredDate: '09/10/2026',
        deliveryLocation: 'Goa · Fatorda Campus Grounds',
        pocName: 'Sneha Patil',
        pocNo: '9820198201',
        status: 'Fulfilled',
        submittedAt: '06 Oct 2026, 09:45 AM',
        planner: 'Sneha Patil',
      },
      {
        id: 'REQ-0004',
        eventCode: 'EV-001',
        eventName: 'City Music Fest',
        eventDate: '10–12 Oct 2026',
        requestedDate: '09 Oct',
        neededDate: '11 Oct',
        progress: 0.20,
        items: [
          { productId: 'PRD-005', name: 'LED Spotlight 200W', uom: 'Pieces (Pcs)', qty: 10, fulfilledQty: 2 },
        ],
        requiredDate: '11/10/2026',
        deliveryLocation: 'Mumbai · Jio Garden Stage 2',
        pocName: 'Sneha Patil',
        pocNo: '9820198201',
        status: 'In Review',
        submittedAt: '09 Oct 2026, 04:20 PM',
        planner: 'Sneha Patil',
      },
      {
        id: 'REQ-0005',
        eventCode: 'EV-002',
        eventName: 'Brand Launch 2026',
        eventDate: '18 Oct 2026',
        requestedDate: '10 Oct',
        neededDate: '17 Oct',
        progress: 0.60,
        items: [
          { productId: 'PRD-003', name: 'Event Banner', uom: 'Pieces (Pcs)', qty: 8, fulfilledQty: 5 },
          { productId: 'PRD-002', name: 'Portable Speaker', uom: 'Pieces (Pcs)', qty: 4, fulfilledQty: 2 },
        ],
        requiredDate: '17/10/2026',
        deliveryLocation: 'Pune · Hyatt Regency Main Hall',
        pocName: 'Sneha Patil',
        pocNo: '9820198201',
        status: 'Partially Fulfilled',
        submittedAt: '10 Oct 2026, 06:10 PM',
        planner: 'Sneha Patil',
      },
    ];
  }

  // --- Products ---
  getProducts() {
    return [...this.products];
  }

  addProduct(data) {
    // Unique SKU validation
    const skuExists = this.products.some(
      (p) => p.sku.trim().toLowerCase() === data.sku.trim().toLowerCase()
    );
    if (skuExists) {
      return { success: false, message: 'SKU code already exists. Please choose a unique SKU.' };
    }

    const newId = `PRD-${String(this.products.length + 1).padStart(3, '0')}`;
    const newProduct = {
      id: newId,
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      trackingType: data.trackingType || 'Countable',
      category: data.category || 'Electronics',
      uom: data.uom || 'Pieces (Pcs)',
      lowStockAlert: Number(data.lowStockAlert) || 10,
      unitPrice: Number(data.unitPrice) || 0,
      returnability: data.returnability || 'Returnable',
      notes: data.notes ? data.notes.trim() : '',
      status: data.status || 'active',
    };
    this.products.unshift(newProduct);
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
      sku: data.sku ? data.sku.trim().toUpperCase() : this.products[idx].sku,
    };
    return { success: true, product: this.products[idx] };
  }

  toggleProductStatus(id) {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false };
    const current = this.products[idx].status;
    this.products[idx].status = current === 'active' ? 'inactive' : 'active';
    return { success: true, status: this.products[idx].status };
  }

  deleteProduct(id) {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false };
    this.products.splice(idx, 1);
    return { success: true };
  }

  // --- Warehouses ---
  getWarehouses(userScope = null) {
    if (!userScope || userScope.length === 0) {
      return [...this.warehouses];
    }
    // Filter authorized locations for Operations Manager
    return this.warehouses.filter(
      (w) => userScope.includes(w.name) || userScope.includes(w.code)
    );
  }

  addWarehouse(data) {
    const codeExists = this.warehouses.some(
      (w) => w.code.trim().toLowerCase() === data.code.trim().toLowerCase()
    );
    if (codeExists) {
      return { success: false, message: 'Warehouse code already exists.' };
    }

    const newWarehouse = {
      id: data.code.trim().toUpperCase(),
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      city: data.city.trim(),
      address: data.address ? data.address.trim() : '',
      status: data.status || 'active',
    };
    this.warehouses.push(newWarehouse);
    return { success: true, warehouse: newWarehouse };
  }

  updateWarehouse(id, data) {
    const idx = this.warehouses.findIndex((w) => w.id === id);
    if (idx === -1) return { success: false, message: 'Warehouse not found' };
    this.warehouses[idx] = { ...this.warehouses[idx], ...data };
    return { success: true, warehouse: this.warehouses[idx] };
  }

  toggleWarehouseStatus(id) {
    const idx = this.warehouses.findIndex((w) => w.id === id);
    if (idx === -1) return { success: false };
    const current = this.warehouses[idx].status;
    this.warehouses[idx].status = current === 'active' ? 'inactive' : 'active';
    return { success: true, status: this.warehouses[idx].status };
  }

  deleteWarehouse(id) {
    const idx = this.warehouses.findIndex((w) => w.id === id);
    if (idx === -1) return { success: false };
    this.warehouses.splice(idx, 1);
    return { success: true };
  }

  // --- Events ---
  getEvents() {
    return [...this.events];
  }

  addEvent(data) {
    const codeExists = this.events.some(
      (e) => e.code.trim().toLowerCase() === data.code.trim().toLowerCase()
    );
    if (codeExists) {
      return { success: false, message: 'Event code already exists.' };
    }

    const newEvent = {
      id: data.code.trim().toUpperCase(),
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      venue: data.venue.trim(),
      dates: data.dates.trim(),
      planner: data.planner || 'Sneha Patil',
      status: data.status || 'Upcoming',
    };
    this.events.push(newEvent);
    return { success: true, event: newEvent };
  }

  updateEvent(id, data) {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return { success: false, message: 'Event not found' };
    this.events[idx] = { ...this.events[idx], ...data };
    return { success: true, event: this.events[idx] };
  }

  toggleEventStatus(id) {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return { success: false };
    const current = this.events[idx].status;
    this.events[idx].status = current === 'Active' ? 'Upcoming' : 'Active';
    return { success: true, status: this.events[idx].status };
  }

  deleteEvent(id) {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return { success: false };
    this.events.splice(idx, 1);
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

  getStockActionLogs() {
    return this.stockActionLogs || [];
  }

  // --- Reports Module (INCIFLO WMS Flow) ---
  initReportsData() {
    if (!this.reportsHistory) {
      this.reportsHistory = [
        {
          id: 'RPT-1001',
          reportName: 'Stock Inventory Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Jul 1, 2026',
          toDate: 'Oct 11, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Oct 11, 2026 00:10',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 142,
          fileSize: '2.4 MB',
        },
        {
          id: 'RPT-1002',
          reportName: 'Stock Movement Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Jul 7, 2026',
          toDate: 'Oct 10, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Oct 11, 2026 00:05',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 88,
          fileSize: '1.8 MB',
        },
        {
          id: 'RPT-1003',
          reportName: 'Stock Movement Report',
          warehouse: 'TESTIND-AUG26',
          fromDate: 'Aug 1, 2026',
          toDate: 'Sep 5, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Sep 5, 2026 14:53',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 230,
          fileSize: '3.8 MB',
        },
        {
          id: 'RPT-1004',
          reportName: 'Task & User Activity Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Jul 1, 2026',
          toDate: 'Aug 31, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Sep 4, 2026 17:59',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 65,
          fileSize: '1.2 MB',
        },
        {
          id: 'RPT-1005',
          reportName: 'Task & User Activity Report',
          warehouse: "QA Singh's Warehouse",
          fromDate: 'Jul 1, 2026',
          toDate: 'Sep 3, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Sep 3, 2026 18:19',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 42,
          fileSize: '950 KB',
        },
        {
          id: 'RPT-1006',
          reportName: 'Event Stock Reconciliation Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Jun 1, 2026',
          toDate: 'Sep 3, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Sep 3, 2026 18:15',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 54,
          fileSize: '1.4 MB',
        },
        {
          id: 'RPT-1007',
          reportName: 'Request Fulfillment Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Jul 1, 2026',
          toDate: 'Aug 31, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Sep 3, 2026 16:06',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 76,
          fileSize: '1.6 MB',
        },
        {
          id: 'RPT-1008',
          reportName: 'Stock Inventory Report',
          warehouse: 'Warehouse A - Central Staging',
          fromDate: 'Jun 15, 2026',
          toDate: 'Aug 30, 2026',
          downloadedBy: 'Rahul Kumar',
          generatedTime: 'Aug 30, 2026 14:20',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 112,
          fileSize: '2.1 MB',
        },
        {
          id: 'RPT-1009',
          reportName: 'Stock Movement Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'May 1, 2026',
          toDate: 'Jul 31, 2026',
          downloadedBy: 'Amit More',
          generatedTime: 'Aug 1, 2026 10:15',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 180,
          fileSize: '3.1 MB',
        },
        {
          id: 'RPT-1010',
          reportName: 'Task & User Activity Report',
          warehouse: 'TESTIND-AUG26',
          fromDate: 'May 10, 2026',
          toDate: 'Jul 20, 2026',
          downloadedBy: 'Sneha Patil',
          generatedTime: 'Jul 22, 2026 16:45',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 95,
          fileSize: '1.7 MB',
        },
        {
          id: 'RPT-1011',
          reportName: 'Event Stock Reconciliation Report',
          warehouse: 'Warehouse A - Central Staging',
          fromDate: 'May 1, 2026',
          toDate: 'Jun 30, 2026',
          downloadedBy: 'Vikram Singh',
          generatedTime: 'Jul 2, 2026 11:30',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 68,
          fileSize: '1.3 MB',
        },
        {
          id: 'RPT-1012',
          reportName: 'Request Fulfillment Report',
          warehouse: 'TESTIND-AUG26',
          fromDate: 'Apr 1, 2026',
          toDate: 'Jun 15, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Jun 16, 2026 15:10',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 140,
          fileSize: '2.5 MB',
        },
        {
          id: 'RPT-1013',
          reportName: 'Stock Inventory Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Mar 1, 2026',
          toDate: 'May 31, 2026',
          downloadedBy: 'Amit More',
          generatedTime: 'Jun 1, 2026 09:40',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 160,
          fileSize: '2.8 MB',
        },
        {
          id: 'RPT-1014',
          reportName: 'Stock Movement Report',
          warehouse: "QA Singh's Warehouse",
          fromDate: 'Feb 15, 2026',
          toDate: 'Apr 30, 2026',
          downloadedBy: 'Rahul Kumar',
          generatedTime: 'May 2, 2026 18:00',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 205,
          fileSize: '3.4 MB',
        },
        {
          id: 'RPT-1015',
          reportName: 'Task & User Activity Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Jan 1, 2026',
          toDate: 'Mar 31, 2026',
          downloadedBy: 'Demo1',
          generatedTime: 'Apr 1, 2026 12:20',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 125,
          fileSize: '2.0 MB',
        },
        {
          id: 'RPT-1016',
          reportName: 'Event Stock Reconciliation Report',
          warehouse: 'TESTIND-AUG26',
          fromDate: 'Jan 15, 2026',
          toDate: 'Feb 28, 2026',
          downloadedBy: 'Sneha Patil',
          generatedTime: 'Mar 2, 2026 17:05',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 45,
          fileSize: '980 KB',
        },
        {
          id: 'RPT-1017',
          reportName: 'Request Fulfillment Report',
          warehouse: 'Sagar Complex Warehouse',
          fromDate: 'Jan 1, 2026',
          toDate: 'Jan 31, 2026',
          downloadedBy: 'Vikram Singh',
          generatedTime: 'Feb 1, 2026 14:15',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 89,
          fileSize: '1.5 MB',
        },
        {
          id: 'RPT-1018',
          reportName: 'Stock Inventory Report',
          warehouse: 'TESTIND-AUG26',
          fromDate: 'Dec 1, 2025',
          toDate: 'Dec 31, 2025',
          downloadedBy: 'Demo1',
          generatedTime: 'Jan 2, 2026 10:00',
          status: 'COMPLETED',
          format: 'XLSX',
          recordsCount: 135,
          fileSize: '2.3 MB',
        },
      ];
    }

    if (!this.scheduledReports) {
      this.scheduledReports = [
        {
          id: 'SCH-001',
          reportName: 'Live Stock & Inventory',
          warehouse: 'Sagar Complex Warehouse',
          frequency: 'Daily',
          time: '08:00 AM',
          recipients: 'ops@districtstock.com',
          status: 'Active',
          lastRun: 'Today, 08:00 AM',
        },
        {
          id: 'SCH-002',
          reportName: 'Inward Outward Movement',
          warehouse: 'All Warehouses',
          frequency: 'Weekly',
          time: 'Mon 09:00 AM',
          recipients: 'manager@districtstock.com',
          status: 'Active',
          lastRun: 'Oct 6, 2026',
        },
        {
          id: 'SCH-003',
          reportName: 'Pallet Occupancy Report',
          warehouse: 'TESTIND-AUG26',
          frequency: 'Monthly',
          time: '1st of Month, 10:00 AM',
          recipients: 'audit@districtstock.com',
          status: 'Paused',
          lastRun: 'Oct 1, 2026',
        },
      ];
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
