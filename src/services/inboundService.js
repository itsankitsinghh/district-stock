/**
 * District Stock — Centralized Inbound Workflow & Persistence Service
 * 
 * Manages the complete lifecycle of Inbound Consignments:
 * Lifecycle: DRAFT → GENERATED → PUTAWAY → COMPLETED
 * 
 * Business Rules & Validations:
 * 1. DRAFT:
 *    - Editable: header fields, product selection, received quantities, line item addition/deletion.
 *    - Has a unique Inbound No. (e.g., INB-2026-0001).
 *    - Updates same record without generating duplicate Inbound No.
 * 2. GENERATED:
 *    - Finalized consignment. Product details and Received Qty are locked.
 *    - Putaway Qty initialized to 0 for all line items.
 *    - Remaining Qty = Received Qty - Putaway Qty.
 * 3. PUTAWAY:
 *    - Automatically set when the first successful putaway transaction is recorded.
 *    - Serial: Scanned serial numbers validated for duplicates. Putaway Qty = count of valid unique serials.
 *    - Countable/Consumable: Manual entry validated to be > 0 and <= Remaining Qty.
 *    - Putaway Qty can NEVER exceed Received Qty.
 * 4. COMPLETED:
 *    - Automatically set when EVERY line item has Putaway Qty == Received Qty (Remaining Qty == 0 for all).
 *    - Read-only state.
 * 5. PERSISTENCE:
 *    - Stored in expo-file-system as district_stock_inbound_v1.json.
 *    - Persists across application reloads, restarts, and builds.
 */

import { storageHelper } from './storageHelper';
import masterService from './masterService';

const INBOUND_STORAGE_FILENAME = 'district_stock_inbound_v1.json';

class InboundService {
  constructor() {
    this.inbounds = [];
    this.isInitialized = false;
    this.subscribers = [];
  }

  /**
   * Subscribe to inbound data changes
   */
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
        cb(this.getInbounds());
      } catch (err) {
        console.warn('[InboundService] Subscriber notification error:', err);
      }
    });
  }

  /**
   * Initialize service and load persistent data from disk
   */
  async init() {
    if (this.isInitialized) return this.inbounds;

    try {
      const parsed = await storageHelper.readData(INBOUND_STORAGE_FILENAME, null);
      if (Array.isArray(parsed)) {
        this.inbounds = parsed;
      } else {
        // Table starts empty if no previous data
        this.inbounds = [];
      }
    } catch (err) {
      console.warn('[InboundService] Failed to read storage file, initializing empty:', err);
      this.inbounds = [];
    }

    this.isInitialized = true;
    return this.inbounds;
  }

  /**
   * Persist current inbound dataset to disk
   */
  async persist() {
    try {
      await storageHelper.writeData(INBOUND_STORAGE_FILENAME, this.inbounds);
    } catch (err) {
      console.error('[InboundService] Failed to write storage file:', err);
    }
    this.notifySubscribers();
  }

  /**
   * Reset / clear all inbounds to blank (for clean testing)
   */
  async clearAll() {
    this.inbounds = [];
    await this.persist();
    return true;
  }

  /**
   * Get all inbounds, optionally filtered by user assigned warehouse scope
   */
  getInbounds(userScope = null) {
    if (!this.inbounds) return [];

    if (!userScope || userScope.length === 0) {
      return [...this.inbounds];
    }

    // Filter by destination or source warehouse
    return this.inbounds.filter((item) => {
      const dest = (item.destination || '').trim().toLowerCase();
      const src = (item.source || '').trim().toLowerCase();
      return userScope.some((loc) => {
        const target = loc.trim().toLowerCase();
        return dest.includes(target) || src.includes(target);
      });
    });
  }

  /**
   * Get a single inbound by ID or Inbound No.
   */
  getInboundById(idOrNo) {
    if (!idOrNo) return null;
    const target = String(idOrNo).trim().toLowerCase();
    return (
      this.inbounds.find(
        (item) =>
          String(item.id).toLowerCase() === target ||
          String(item.no).toLowerCase() === target
      ) || null
    );
  }

  /**
   * Generate next sequential unique Inbound No.
   * Format: INB0001, INB0002, etc. (starts from INB0001)
   */
  generateInboundNo() {
    let maxNum = 0;

    this.inbounds.forEach((item) => {
      if (item.no) {
        const cleanNo = String(item.no).trim();
        // Match exact INB0001 format
        const match = cleanNo.match(/^INB(\d+)$/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        } else {
          // Fallback match for legacy INB-YYYY-XXXX
          const legacyMatch = cleanNo.match(/INB-\d{4}-(\d+)/i);
          if (legacyMatch && legacyMatch[1]) {
            const num = parseInt(legacyMatch[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
    });

    const nextSeq = maxNum + 1;
    // Format as INB0001 (starts at INB0001)
    return `INB${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Standardize product lines structure
   */
  normalizeProductLines(lines) {
    if (!Array.isArray(lines)) return [];
    return lines.map((l, index) => {
      const receivedQty = parseInt(l.receivedQty, 10) || 0;
      const putawayQty = parseInt(l.putawayQty, 10) || 0;
      const serialNumbers = Array.isArray(l.serialNumbers) ? [...l.serialNumbers] : [];

      return {
        id: l.id || `line-${Date.now()}-${index}`,
        srNo: index + 1,
        productId: l.productId || '',
        productName: l.productName || '',
        sku: l.sku || '',
        uom: l.uom || '',
        trackingType: l.trackingType || '',
        receivedQty,
        putawayQty,
        remainingQty: Math.max(0, receivedQty - putawayQty),
        serialNumbers,
        price: l.price || '0',
        amount: Number(l.amount) || 0,
        remarks: l.remarks || '',
      };
    });
  }

  /**
   * Save a new or existing Draft Inbound
   */
  async saveDraft(data, user = 'Current User') {
    await this.init();

    const existingIndex = data.id
      ? this.inbounds.findIndex((i) => i.id === data.id || i.no === data.no)
      : -1;

    const normalizedLines = this.normalizeProductLines(data.productLines || []);

    if (existingIndex !== -1) {
      // UPDATE EXISTING DRAFT (Do NOT generate duplicate Inbound No.!)
      const existing = this.inbounds[existingIndex];

      if (existing.status && existing.status.toUpperCase() !== 'DRAFT') {
        return {
          success: false,
          message: `Cannot edit draft. This inbound is currently in "${existing.status}" status.`,
        };
      }

      const totalQty = normalizedLines.reduce((sum, l) => sum + (l.receivedQty || 0), 0);
      const totalAmount = normalizedLines.reduce((sum, l) => sum + (l.amount || 0), 0);

      const updated = {
        ...existing,
        date: data.date ? data.date.trim() : existing.date,
        refNo: data.refNo ? data.refNo.trim() : existing.refNo,
        source: data.source ? data.source.trim() : existing.source,
        destination: data.destination ? data.destination.trim() : existing.destination,
        method: data.method || existing.method,
        status: 'Draft',
        itemsCount: normalizedLines.length,
        totalQty,
        totalAmount,
        receivingMethodDetails: data.receivingMethodDetails || existing.receivingMethodDetails,
        productLines: normalizedLines,
        updatedAt: new Date().toISOString(),
        updatedBy: user,
      };

      this.inbounds[existingIndex] = updated;
      await this.persist();
      return { success: true, inbound: updated, isNew: false };
    }

    // CREATE NEW DRAFT
    const newId = `INB-${Date.now()}`;
    const newNo = this.generateInboundNo();
    const totalQty = normalizedLines.reduce((sum, l) => sum + (l.receivedQty || 0), 0);
    const totalAmount = normalizedLines.reduce((sum, l) => sum + (l.amount || 0), 0);

    const newDraft = {
      id: newId,
      no: newNo,
      date: data.date ? data.date.trim() : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      refNo: data.refNo ? data.refNo.trim() : '',
      source: data.source ? data.source.trim() : 'Vendor Consignment',
      destination: data.destination ? data.destination.trim() : 'Central Warehouse',
      method: data.method || 'Courier',
      status: 'Draft',
      itemsCount: normalizedLines.length,
      totalQty,
      totalAmount,
      receivingMethodDetails: data.receivingMethodDetails || {},
      productLines: normalizedLines,
      createdAt: new Date().toISOString(),
      createdBy: user,
      auditTrail: [
        {
          action: 'CREATED_DRAFT',
          user,
          timestamp: new Date().toISOString(),
          note: `Draft ${newNo} initialized`,
        },
      ],
    };

    this.inbounds.unshift(newDraft);
    await this.persist();
    return { success: true, inbound: newDraft, isNew: true };
  }

  /**
   * Finalize and Generate Inbound
   * Transitions status from DRAFT → GENERATED
   * Validates:
   * 1. Consignment has at least one line item.
   * 2. Every line item has a selected product, valid UOM, and valid Tracking Type.
   * 3. Every line item has Received Qty > 0.
   * Initializes Putaway Qty = 0.
   */
  async finalizeInbound(idOrNo, user = 'Current User') {
    await this.init();

    const idx = this.inbounds.findIndex(
      (i) => i.id === idOrNo || i.no === idOrNo
    );
    if (idx === -1) {
      return { success: false, message: 'Inbound record not found.' };
    }

    const item = this.inbounds[idx];

    // Status check
    if (item.status && item.status.toUpperCase() !== 'DRAFT') {
      return {
        success: false,
        message: `Inbound is already in "${item.status}" status. Only Drafts can be finalized.`,
      };
    }

    // Line items validation
    const lines = item.productLines || [];
    if (lines.length === 0) {
      return {
        success: false,
        message: 'Cannot finalize. Please add at least one product line item.',
      };
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (!line.productName || !line.productName.trim()) {
        return {
          success: false,
          message: `Line #${lineNum}: Product name is missing. Please select a valid product from Master.`,
        };
      }

      if (!line.uom || !line.uom.trim()) {
        return {
          success: false,
          message: `Line #${lineNum} (${line.productName}): UOM is missing.`,
        };
      }

      if (!line.trackingType || !line.trackingType.trim()) {
        return {
          success: false,
          message: `Line #${lineNum} (${line.productName}): Tracking type is missing.`,
        };
      }

      const received = parseInt(line.receivedQty, 10);
      if (isNaN(received) || received <= 0) {
        return {
          success: false,
          message: `Line #${lineNum} (${line.productName}): Received quantity must be greater than zero.`,
        };
      }
    }

    // Initialize Putaway Qty to 0 and calculate remaining
    const finalizedLines = lines.map((l) => ({
      ...l,
      receivedQty: parseInt(l.receivedQty, 10) || 0,
      putawayQty: 0,
      remainingQty: parseInt(l.receivedQty, 10) || 0,
      serialNumbers: [],
    }));

    item.status = 'Generated';
    item.productLines = finalizedLines;
    item.finalizedAt = new Date().toISOString();
    item.finalizedBy = user;

    if (!item.auditTrail) item.auditTrail = [];
    item.auditTrail.push({
      action: 'FINALIZED',
      user,
      timestamp: new Date().toISOString(),
      note: `Inbound ${item.no} finalized into GENERATED status with ${finalizedLines.length} product lines`,
    });

    this.inbounds[idx] = item;
    await this.persist();

    return { success: true, inbound: item };
  }

  /**
   * Record Putaway for a specific line item
   * 
   * Supports:
   * - Serial Tracked items: array of serial numbers
   * - Countable / Consumable items: numeric quantity
   * 
   * Automatically updates status:
   * - If first putaway -> PUTAWAY
   * - If ALL lines completely put away -> COMPLETED
   */
  async recordPutaway(inboundId, lineIdentifier, putawayData, user = 'Current User') {
    await this.init();

    const idx = this.inbounds.findIndex(
      (i) => i.id === inboundId || i.no === inboundId
    );
    if (idx === -1) {
      return { success: false, message: 'Inbound record not found.' };
    }

    const item = this.inbounds[idx];
    const statusUpper = (item.status || '').toUpperCase();

    if (statusUpper === 'DRAFT') {
      return {
        success: false,
        message: 'Cannot perform putaway on a Draft inbound. Please finalize it first.',
      };
    }

    if (statusUpper === 'COMPLETED') {
      return {
        success: false,
        message: 'This inbound is already Completed and is read-only.',
      };
    }

    // Locate line item by index or ID
    const lines = [...(item.productLines || [])];
    let lineIndex = -1;

    if (typeof lineIdentifier === 'number') {
      lineIndex = lineIdentifier;
    } else {
      lineIndex = lines.findIndex(
        (l) => l.id === lineIdentifier || l.productId === lineIdentifier
      );
    }

    if (lineIndex < 0 || lineIndex >= lines.length) {
      return { success: false, message: 'Product line item not found.' };
    }

    const targetLine = { ...lines[lineIndex] };
    const trackingTypeLower = (targetLine.trackingType || '').toLowerCase();
    const isSerial = trackingTypeLower.includes('serial');

    let qtyAdded = 0;
    let addedSerials = [];

    if (isSerial) {
      // SERIAL PUTAWAY LOGIC
      const newSerials = Array.isArray(putawayData.serials)
        ? putawayData.serials
        : putawayData.serial
        ? [putawayData.serial]
        : [];

      // If array of serials is explicitly provided, set it as the line's serials
      if (Array.isArray(putawayData.serials)) {
        targetLine.serialNumbers = [...putawayData.serials];
        targetLine.putawayQty = targetLine.serialNumbers.length;
        addedSerials = targetLine.serialNumbers;
      } else {
        if (newSerials.length === 0) {
          return { success: false, message: 'No serial number provided.' };
        }

        if (!targetLine.serialNumbers) targetLine.serialNumbers = [];

        for (const s of newSerials) {
          const cleanSerial = String(s).trim();
          if (!cleanSerial) continue;

          // Duplicate check within line
          if (targetLine.serialNumbers.includes(cleanSerial)) {
            return {
              success: false,
              message: `Duplicate serial number: "${cleanSerial}" has already been scanned for this product.`,
            };
          }

          // Duplicate check across other serial-tracked lines in same inbound
          for (let otherIdx = 0; otherIdx < lines.length; otherIdx++) {
            if (otherIdx !== lineIndex && lines[otherIdx].serialNumbers?.includes(cleanSerial)) {
              return {
                success: false,
                message: `Duplicate serial: "${cleanSerial}" is already assigned to ${lines[otherIdx].productName}.`,
              };
            }
          }

          targetLine.serialNumbers.push(cleanSerial);
          addedSerials.push(cleanSerial);
        }

        qtyAdded = addedSerials.length;
        targetLine.putawayQty = targetLine.serialNumbers.length;
      }
    } else {
      // COUNTABLE & CONSUMABLE PUTAWAY LOGIC
      const rawQty = putawayData.quantity !== undefined ? putawayData.quantity : putawayData.qty;
      const qtyNum = parseInt(rawQty, 10);
      if (isNaN(qtyNum) || qtyNum < 0) {
        return { success: false, message: 'Putaway quantity must be a non-negative number.' };
      }

      if (qtyNum > targetLine.receivedQty) {
        return {
          success: false,
          message: `Putaway quantity (${qtyNum}) cannot exceed received quantity (${targetLine.receivedQty}).`,
        };
      }

      qtyAdded = qtyNum - (targetLine.putawayQty || 0);
      targetLine.putawayQty = qtyNum;
    }

    // Safety constraint: Never allow Putaway Qty to exceed Received Qty
    if (targetLine.putawayQty > targetLine.receivedQty) {
      return {
        success: false,
        message: `Putaway quantity cannot exceed received quantity (${targetLine.receivedQty}).`,
      };
    }

    // Recalculate line remaining
    targetLine.remainingQty = Math.max(0, targetLine.receivedQty - targetLine.putawayQty);
    lines[lineIndex] = targetLine;
    item.productLines = lines;

    // Preserve audit trail of putaway transaction
    if (!item.auditTrail) item.auditTrail = [];
    item.auditTrail.push({
      action: 'PUTAWAY_TRANSACTION',
      user,
      timestamp: new Date().toISOString(),
      lineId: targetLine.id,
      productName: targetLine.productName,
      sku: targetLine.sku,
      quantityAdded: qtyAdded,
      serialsAdded: addedSerials,
      totalLinePutaway: targetLine.putawayQty,
      lineRemaining: targetLine.remainingQty,
    });

    // =========================================================================
    // AUTOMATIC STATUS LIFECYCLE EVALUATION
    // Status transitions:
    // - All items 100% putaway/scanned -> COMPLETED
    // - Any item has putaway/scanned > 0 -> IN PROGRESS
    // - All items putaway/scanned == 0 -> REVERT TO GENERATED
    // =========================================================================
    const allLinesComplete = lines.length > 0 && lines.every(
      (l) => (parseInt(l.putawayQty, 10) || 0) >= (parseInt(l.receivedQty, 10) || 0) && (parseInt(l.receivedQty, 10) || 0) > 0
    );

    const hasAnyPutaway = lines.some((l) => (parseInt(l.putawayQty, 10) || 0) > 0);

    if (allLinesComplete) {
      const wasAlreadyCompleted = item.status === 'Completed';
      item.status = 'Completed';
      item.completedAt = new Date().toISOString();
      item.completedBy = user;
      item.auditTrail.push({
        action: 'STATUS_CHANGE_COMPLETED',
        user,
        timestamp: new Date().toISOString(),
        note: `All ${lines.length} lines fully put away. Inbound marked Completed.`,
      });

      // Update available stock in Master inventory when putaway is completed
      if (!wasAlreadyCompleted && masterService && typeof masterService.addInboundStock === 'function') {
        try {
          masterService.addInboundStock(lines, item.no);
        } catch (stkErr) {
          console.warn('[InboundService] Failed to update master stock:', stkErr);
        }
      }
    } else if (hasAnyPutaway) {
      item.status = 'In Progress';
      item.auditTrail.push({
        action: 'STATUS_CHANGE_IN_PROGRESS',
        user,
        timestamp: new Date().toISOString(),
        note: `Putaway / Scanning started. Inbound status transitioned to In Progress.`,
      });
    } else {
      item.status = 'Generated';
      item.auditTrail.push({
        action: 'STATUS_REVERT_GENERATED',
        user,
        timestamp: new Date().toISOString(),
        note: `Putaway / Scanning cleared to 0. Inbound status reverted to Generated.`,
      });
    }

    this.inbounds[idx] = item;
    await this.persist();

    return {
      success: true,
      inbound: item,
      line: targetLine,
      qtyAdded,
      newStatus: item.status,
      allCompleted: allLinesComplete,
    };
  }

  /**
   * Update fields of an existing Inbound record
   */
  async updateInbound(idOrNo, updateData) {
    await this.init();
    const idx = this.inbounds.findIndex(
      (i) => i.id === idOrNo || i.no === idOrNo
    );
    if (idx !== -1) {
      this.inbounds[idx] = { ...this.inbounds[idx], ...updateData };
      await this.persist();
      return this.inbounds[idx];
    }
    return null;
  }

  /**
   * Cancel an Inbound record
   */
  async cancelInbound(idOrNo, user = 'Current User') {
    await this.init();

    const idx = this.inbounds.findIndex((i) => i.id === idOrNo || i.no === idOrNo);
    if (idx === -1) return { success: false, message: 'Inbound not found.' };

    const item = this.inbounds[idx];
    item.status = 'Canceled';
    item.canceledAt = new Date().toISOString();
    item.canceledBy = user;

    if (!item.auditTrail) item.auditTrail = [];
    item.auditTrail.push({
      action: 'CANCELED',
      user,
      timestamp: new Date().toISOString(),
      note: `Inbound ${item.no} status updated to Canceled`,
    });

    this.inbounds[idx] = item;
    await this.persist();

    return { success: true, inbound: item };
  }

  /**
   * Delete a line item from an Inbound
   * Restricted by business rules:
   * - DRAFT: Allowed.
   * - GENERATED: Allowed if no putaway recorded.
   * - PUTAWAY / COMPLETED: Disallowed.
   */
  async deleteLineItem(inboundId, lineIndex, user = 'Current User') {
    await this.init();

    const idx = this.inbounds.findIndex((i) => i.id === inboundId || i.no === inboundId);
    if (idx === -1) return { success: false, message: 'Inbound not found.' };

    const item = this.inbounds[idx];
    const statusUpper = (item.status || '').toUpperCase();

    if (statusUpper === 'COMPLETED') {
      return { success: false, message: 'Cannot delete lines from a Completed inbound.' };
    }

    const lines = [...(item.productLines || [])];
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return { success: false, message: 'Line item not found.' };
    }

    const targetLine = lines[lineIndex];

    if ((targetLine.putawayQty || 0) > 0) {
      return {
        success: false,
        message: 'Cannot delete a line item that has recorded putaway activity.',
      };
    }

    if (lines.length === 1 && statusUpper !== 'DRAFT') {
      return {
        success: false,
        message: 'A finalized inbound must have at least one line item.',
      };
    }

    lines.splice(lineIndex, 1);
    // Re-index lines
    const reindexed = lines.map((l, i) => ({ ...l, srNo: i + 1 }));

    item.productLines = reindexed;
    item.itemsCount = reindexed.length;
    item.totalQty = reindexed.reduce((sum, l) => sum + (l.receivedQty || 0), 0);
    item.totalAmount = reindexed.reduce((sum, l) => sum + (l.amount || 0), 0);

    if (!item.auditTrail) item.auditTrail = [];
    item.auditTrail.push({
      action: 'LINE_DELETED',
      user,
      timestamp: new Date().toISOString(),
      productName: targetLine.productName,
    });

    this.inbounds[idx] = item;
    await this.persist();

    return { success: true, inbound: item };
  }

  /**
   * Delete an entire Inbound record (Allowed for Drafts)
   */
  async deleteInbound(idOrNo, user = 'Current User') {
    await this.init();

    const idx = this.inbounds.findIndex((i) => i.id === idOrNo || i.no === idOrNo);
    if (idx === -1) return { success: false, message: 'Inbound not found.' };

    const item = this.inbounds[idx];
    const statusUpper = (item.status || '').toUpperCase();

    if (statusUpper !== 'DRAFT') {
      return {
        success: false,
        message: `Cannot delete inbound in "${item.status}" status. Only Draft inbounds can be deleted.`,
      };
    }

    this.inbounds.splice(idx, 1);
    await this.persist();

    return { success: true };
  }
}

export const inboundService = new InboundService();
export default inboundService;
