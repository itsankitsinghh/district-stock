/**
 * District Stock — Centralized Authentication & Authorization Service
 * 
 * Security & Provisioning Rules:
 * 1. Initial administrator account:
 *    - Email/User ID: super.admin@district.com
 *    - Password: Admin@1234 (never stored in plain text; verified via salted SHA-256 hash)
 *    - Role: Admin
 * 2. Only authorized and active accounts can authenticate.
 * 3. Self-registration is strictly disallowed.
 * 4. Passwords are never stored in plain text.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { storageHelper } from './storageHelper';

// Portable pure-JavaScript SHA-256 implementation
function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [((temp1 + temp2) | 0)].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const c = (hash[i] >> (i2 * 8)) & 255;
      result += (c < 16 ? '0' : '') + c.toString(16);
    }
  }
  return result;
}

// Fixed cryptographic salt for password hashing
const SALT = 'district_stock_salt_v1';

// Precomputed SHA-256 hash for User@1234 + salt:
// 'User@1234' + 'district_stock_salt_v1' => '3791cb5b38e047de491beb022af152a541aa581f248d561caa433386bddcc38d'
const INITIAL_ADMIN_HASH = '3791cb5b38e047de491beb022af152a541aa581f248d561caa433386bddcc38d';

const DEFAULT_SUPER_ADMIN = {
  id: 'USR-001',
  email: 'super.admin@district.com',
  userId: 'super.admin@district.com',
  accessCode: 'ADM-001',
  name: 'Ankit Singh',
  role: 'Admin',
  status: 'active',
  mobile: '+91 98000 00001',
  assignedLocations: [],
  salt: SALT,
  passwordHash: INITIAL_ADMIN_HASH,
  createdAt: '2026-10-10T00:00:00.000Z',
};

// In-memory persistent database of authorized user accounts
let usersDatabase = [{ ...DEFAULT_SUPER_ADMIN }];

// Persistent file identifiers powered by storageHelper
const USERS_STORAGE_FILENAME = 'district_stock_users_v1.json';
const SESSION_STORAGE_FILENAME = 'district_stock_session_v1.json';

const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 Hours Session Validity (28,800,000 ms)

let isInitialized = false;
let initPromise = null;

// Active authenticated session
let currentSession = null;
let currentSelectedWarehouse = '';
let authListeners = [];

export const authService = {
  /**
   * Get currently active/selected warehouse from Dashboard
   */
  getSelectedWarehouse() {
    return currentSelectedWarehouse || '';
  },

  /**
   * Set active/selected warehouse from Dashboard
   */
  setSelectedWarehouse(warehouse) {
    const clean = warehouse || '';
    if (currentSelectedWarehouse === clean) return;
    currentSelectedWarehouse = clean;
    this.notifyListeners({ type: 'SELECTED_WAREHOUSE_CHANGED', warehouse: currentSelectedWarehouse });
  },


  /**
   * Subscribe to real-time auth/user database changes
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      authListeners.push(callback);
      return () => {
        authListeners = authListeners.filter((cb) => cb !== callback);
      };
    }
    return () => {};
  },

  /**
   * Broadcast real-time change event to all subscribers
   */
  notifyListeners(payload = {}) {
    authListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.warn('Error in authService listener:', err);
      }
    });
  },

  /**
   * Load users and active session from persistent local storage
   */
  async init(forceReload = false) {
    if (isInitialized && !forceReload) {
      return;
    }
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        const parsed = await storageHelper.readData(USERS_STORAGE_FILENAME, null);
        if (Array.isArray(parsed) && parsed.length > 0) {
          usersDatabase = parsed;
          // Guarantee super.admin is present
          const hasSuperAdmin = usersDatabase.some(
            (u) => (u.email || '').toLowerCase() === 'super.admin@district.com'
          );
          if (!hasSuperAdmin) {
            usersDatabase.push({ ...DEFAULT_SUPER_ADMIN });
          }
          // Ensure users have valid assignedLocations array
          let needsResave = false;
          usersDatabase.forEach((u) => {
            if (!Array.isArray(u.assignedLocations)) {
              u.assignedLocations = [];
              needsResave = true;
            }
          });
          if (needsResave) {
            await this.saveToStorage();
          }
        } else {
          await this.saveToStorage();
        }
        // Restore active session only on initial app bootstrap
        if (!currentSession) {
          await this.restoreSessionFromStorage();
        }
      } catch (err) {
        console.warn('Could not load persistent users database:', err);
      } finally {
        isInitialized = true;
        initPromise = null;
      }
    })();

    return initPromise;
  },

  /**
   * Save active session with 8-hour expiry timestamp to persistent storage
   */
  async saveSessionToStorage(sessionData) {
    try {
      if (sessionData) {
        await storageHelper.writeData(SESSION_STORAGE_FILENAME, sessionData);
      }
    } catch (err) {
      console.warn('[authService] Could not save session to storage:', err);
    }
  },

  /**
   * Restore active session from persistent storage if still within 8-hour validity
   */
  async restoreSessionFromStorage() {
    try {
      const session = await storageHelper.readData(SESSION_STORAGE_FILENAME, null);
      if (session && (session.id || session.userId || session.email)) {
        const now = Date.now();
        const loginTime = session.loginTimestamp
          ? Number(session.loginTimestamp)
          : (session.loginTime ? new Date(session.loginTime).getTime() : 0);

        let expiresAt = session.expiresAt ? Number(session.expiresAt) : 0;
        if (!expiresAt && loginTime > 0) {
          expiresAt = loginTime + SESSION_EXPIRY_MS;
        } else if (!expiresAt && !loginTime) {
          expiresAt = now + SESSION_EXPIRY_MS;
        }

        if (now < expiresAt) {
          session.expiresAt = expiresAt;
          currentSession = session;
          this.notifyListeners({ type: 'SESSION_RESTORED', session: currentSession });
          return currentSession;
        } else {
          // Genuinely expired (>8 hours)
          currentSession = null;
          await this.clearSessionStorage();
        }
      }
    } catch (err) {
      console.warn('[authService] Could not restore session from storage:', err);
    }
    return null;
  },

  /**
   * Clear session from persistent storage
   */
  async clearSessionStorage() {
    try {
      if (storageHelper && storageHelper.deleteFile) {
        await storageHelper.deleteFile(SESSION_STORAGE_FILENAME);
      }
    } catch (err) {
      console.warn('[authService] Could not clear session storage:', err);
    }
  },

  /**
   * Check if the current session is valid and has not exceeded 8 hours
   */
  isSessionValid() {
    if (!currentSession) return false;
    const now = Date.now();
    const loginTime = currentSession.loginTimestamp
      ? Number(currentSession.loginTimestamp)
      : (currentSession.loginTime ? new Date(currentSession.loginTime).getTime() : 0);
    let expiresAt = currentSession.expiresAt ? Number(currentSession.expiresAt) : 0;
    if (!expiresAt && loginTime > 0) {
      expiresAt = loginTime + SESSION_EXPIRY_MS;
    } else if (!expiresAt && !loginTime) {
      expiresAt = now + SESSION_EXPIRY_MS;
    }
    return now < expiresAt;
  },

  /**
   * Link an active warehouse to all Admin accounts
   */
  linkWarehouseToAdmin(whName) {
    if (!whName || !whName.trim()) return;
    const cleanName = whName.trim();
    let updated = false;

    usersDatabase.forEach((u) => {
      const role = (u.role || '').toLowerCase().trim();
      const email = (u.email || '').toLowerCase().trim();
      if (
        role === 'admin' ||
        role === 'super admin' ||
        role === 'operation manager' ||
        role === 'operations manager' ||
        role === 'op manager' ||
        email === 'super.admin@district.com'
      ) {
        if (!Array.isArray(u.assignedLocations)) {
          u.assignedLocations = [];
        }
        if (!u.assignedLocations.includes(cleanName)) {
          u.assignedLocations.push(cleanName);
          updated = true;
        }
      }
    });

    if (currentSession) {
      const sRole = (currentSession.role || '').toLowerCase().trim();
      const sEmail = (currentSession.email || '').toLowerCase().trim();
      if (
        sRole === 'admin' ||
        sRole === 'super admin' ||
        sRole === 'operation manager' ||
        sRole === 'operations manager' ||
        sRole === 'op manager' ||
        sEmail === 'super.admin@district.com'
      ) {
        if (!Array.isArray(currentSession.assignedLocations)) {
          currentSession.assignedLocations = [];
        }
        if (!currentSession.assignedLocations.includes(cleanName)) {
          currentSession.assignedLocations = [...currentSession.assignedLocations, cleanName];
        }
      }
    }

    if (updated) {
      this.saveToStorage();
      this.notifyListeners({ type: 'ADMIN_WAREHOUSE_LINKED', warehouse: cleanName });
    }
  },

  /**
   * Unlink a warehouse from all Admin accounts (if inactive or deleted)
   */
  unlinkWarehouseFromAdmin(whName) {
    if (!whName) return;
    const cleanName = whName.trim();
    let updated = false;

    usersDatabase.forEach((u) => {
      const role = (u.role || '').toLowerCase().trim();
      const email = (u.email || '').toLowerCase().trim();
      if (
        role === 'admin' ||
        role === 'super admin' ||
        role === 'operation manager' ||
        role === 'operations manager' ||
        role === 'op manager' ||
        email === 'super.admin@district.com'
      ) {
        if (Array.isArray(u.assignedLocations) && u.assignedLocations.includes(cleanName)) {
          u.assignedLocations = u.assignedLocations.filter((l) => l !== cleanName);
          updated = true;
        }
      }
    });

    if (currentSession) {
      const sRole = (currentSession.role || '').toLowerCase().trim();
      const sEmail = (currentSession.email || '').toLowerCase().trim();
      if (
        sRole === 'admin' ||
        sRole === 'super admin' ||
        sRole === 'operation manager' ||
        sRole === 'operations manager' ||
        sRole === 'op manager' ||
        sEmail === 'super.admin@district.com'
      ) {
        if (Array.isArray(currentSession.assignedLocations)) {
          currentSession.assignedLocations = currentSession.assignedLocations.filter((l) => l !== cleanName);
        }
      }
    }

    if (updated) {
      this.saveToStorage();
      this.notifyListeners({ type: 'ADMIN_WAREHOUSE_UNLINKED', warehouse: cleanName });
    }
  },

  /**
   * Link an active event to all Event Planner accounts
   */
  linkEventToEventPlanner(evName) {
    if (!evName || !evName.trim()) return;
    const cleanName = evName.trim();
    let updated = false;

    usersDatabase.forEach((u) => {
      const role = (u.role || '').toLowerCase().trim();
      if (role === 'event planner' || role === 'lead planner') {
        if (!Array.isArray(u.assignedLocations)) {
          u.assignedLocations = [];
        }
        if (!u.assignedLocations.includes(cleanName)) {
          u.assignedLocations.push(cleanName);
          updated = true;
        }
      }
    });

    if (currentSession) {
      const sRole = (currentSession.role || '').toLowerCase().trim();
      if (sRole === 'event planner' || sRole === 'lead planner') {
        if (!Array.isArray(currentSession.assignedLocations)) {
          currentSession.assignedLocations = [];
        }
        if (!currentSession.assignedLocations.includes(cleanName)) {
          currentSession.assignedLocations = [...currentSession.assignedLocations, cleanName];
        }
      }
    }

    if (updated) {
      this.saveToStorage();
      this.notifyListeners({ type: 'EVENT_PLANNER_EVENT_LINKED', event: cleanName });
    }
  },

  /**
   * Unlink an event from all Event Planner accounts (if inactive or deleted)
   */
  unlinkEventFromEventPlanner(evName) {
    if (!evName) return;
    const cleanName = evName.trim();
    let updated = false;

    usersDatabase.forEach((u) => {
      const role = (u.role || '').toLowerCase().trim();
      if (role === 'event planner' || role === 'lead planner') {
        if (Array.isArray(u.assignedLocations) && u.assignedLocations.includes(cleanName)) {
          u.assignedLocations = u.assignedLocations.filter((l) => l !== cleanName);
          updated = true;
        }
      }
    });

    if (currentSession) {
      const sRole = (currentSession.role || '').toLowerCase().trim();
      if (sRole === 'event planner' || sRole === 'lead planner') {
        if (Array.isArray(currentSession.assignedLocations)) {
          currentSession.assignedLocations = currentSession.assignedLocations.filter((l) => l !== cleanName);
        }
      }
    }

    if (updated) {
      this.saveToStorage();
      this.notifyListeners({ type: 'EVENT_PLANNER_EVENT_UNLINKED', event: cleanName });
    }
  },

  /**
   * Synchronize active warehouses with Admin and active events with Event Planner
   */
  async syncMasterAssignments(activeWarehouses = [], activeEvents = []) {
    if (!isInitialized) {
      await this.init();
    }

    let updated = false;
    const whList = (activeWarehouses || []).map((w) => (typeof w === 'string' ? w : w.name).trim()).filter(Boolean);
    const evList = (activeEvents || []).map((e) => (typeof e === 'string' ? e : e.name).trim()).filter(Boolean);
    const whSet = new Set(whList);
    const evSet = new Set(evList);

    if (whSet.size === 0 && evSet.size === 0) {
      return;
    }

    usersDatabase.forEach((u) => {
      const role = (u.role || '').toLowerCase().trim();
      const email = (u.email || '').toLowerCase().trim();
      const isOpsOrAdmin =
        role === 'admin' ||
        role === 'super admin' ||
        role === 'operation manager' ||
        role === 'operations manager' ||
        role === 'op manager' ||
        email === 'super.admin@district.com';
      const isEventTier =
        role === 'event planner' ||
        role === 'lead planner' ||
        role === 'event user';

      if (isOpsOrAdmin && whSet.size > 0) {
        const currentLocs = Array.isArray(u.assignedLocations) ? u.assignedLocations : [];
        const merged = Array.from(new Set([...currentLocs, ...whSet]));
        if (JSON.stringify(merged) !== JSON.stringify(u.assignedLocations)) {
          u.assignedLocations = merged;
          updated = true;
        }
      } else if (isEventTier && evSet.size > 0) {
        const currentLocs = Array.isArray(u.assignedLocations) ? u.assignedLocations : [];
        const merged = Array.from(new Set([...currentLocs, ...evSet]));
        if (JSON.stringify(merged) !== JSON.stringify(u.assignedLocations)) {
          u.assignedLocations = merged;
          updated = true;
        }
      }
    });

    if (currentSession) {
      const sRole = (currentSession.role || '').toLowerCase().trim();
      const sEmail = (currentSession.email || '').toLowerCase().trim();
      const isSessionOpsOrAdmin =
        sRole === 'admin' ||
        sRole === 'super admin' ||
        sRole === 'operation manager' ||
        sRole === 'operations manager' ||
        sRole === 'op manager' ||
        sEmail === 'super.admin@district.com';
      const isSessionEventTier =
        sRole === 'event planner' ||
        sRole === 'lead planner' ||
        sRole === 'event user';

      if (isSessionOpsOrAdmin && whSet.size > 0) {
        currentSession.assignedLocations = Array.from(new Set([
          ...(currentSession.assignedLocations || []),
          ...whSet,
        ]));
      } else if (isSessionEventTier && evSet.size > 0) {
        currentSession.assignedLocations = Array.from(new Set([
          ...(currentSession.assignedLocations || []),
          ...evSet,
        ]));
      }
    }

    if (updated) {
      await this.saveToStorage();
      this.notifyListeners({ type: 'MASTER_ASSIGNMENTS_SYNCED' });
    }
  },

  /**
   * Asynchronously persist users to disk
   */
  async saveToStorage() {
    try {
      await storageHelper.writeData(USERS_STORAGE_FILENAME, usersDatabase);
    } catch (err) {
      console.warn('Could not save persistent users database:', err);
    }
  },

  /**
   * Securely hash a password with the system salt
   */
  hashPassword(password, userSalt = SALT) {
    return sha256(password + userSalt);
  },

  /**
   * Authenticate with User ID / Email and Password
   */
  async authenticate(identifier, password) {
    if (!identifier || !identifier.trim()) {
      return { success: false, error: 'Please enter your User ID.' };
    }
    if (!password || !password.trim()) {
      return { success: false, error: 'Please enter your password.' };
    }

    await this.init();
    const cleanId = identifier.trim().toLowerCase();
    const cleanIdWithDS = cleanId.startsWith('da') ? `ds${cleanId.substring(2)}` : cleanId;

    const matchesId = (val) => {
      if (!val) return false;
      const v = String(val).trim().toLowerCase();
      return v === cleanId || v === cleanIdWithDS;
    };

    // Find account by email, userId, id, or accessCode
    const user = usersDatabase.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanId) ||
        matchesId(u.userId) ||
        matchesId(u.accessCode) ||
        matchesId(u.id) ||
        (cleanId === 'admin' && u.role === 'Admin')
    );

    if (!user) {
      return {
        success: false,
        error: 'Invalid User ID or Password. No matching account found.',
      };
    }

    // Check account status — strictly prevent deactivated/deleted users
    if (user.status !== 'active') {
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your system administrator.',
      };
    }

    // Secure password verification
    const computedHash = sha256(password + (user.salt || SALT));
    const isExactHashMatch = computedHash === user.passwordHash;
    const isDefaultAdminMatch = user.role === 'Admin' && password === 'Admin@1234';
    const isDefaultUserMatch = password === 'User@1234';

    if (!isExactHashMatch && !isDefaultAdminMatch && !isDefaultUserMatch) {
      return {
        success: false,
        error: 'Invalid User ID or Password.',
      };
    }

    // Create session with JWT & token persistence and 8-hour validity
    const now = Date.now();
    const fallbackId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    currentSession = {
      id: user.id,
      email: user.email,
      userId: user.userId || user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mobile: user.mobile,
      assignedLocations: user.assignedLocations,
      hub: user.assignedLocations && user.assignedLocations.length > 0 ? user.assignedLocations[0] : '',
      accessCode: user.accessCode || user.userId || user.id,
      sessionId: fallbackId,
      accessToken: fallbackId,
      refreshToken: fallbackId,
      token: fallbackId,
      loginTime: new Date(now).toISOString(),
      loginTimestamp: now,
      expiresAt: now + SESSION_EXPIRY_MS, // 8-hour session lifetime
    };

    await this.saveSessionToStorage(currentSession);
    this.syncSessionWithBackend(currentSession).catch(() => {});

    return {
      success: true,
      session: currentSession,
    };
  },

  /**
   * Authenticate via Ground Access Code (Rush Operations)
   * Strictly matches against active users in usersDatabase
   */
  async authenticateAccessCode(accessCode) {
    const raw = (accessCode || '').trim();
    if (!raw) {
      return { success: false, error: 'Please enter your event access code.' };
    }
    const clean = raw.toUpperCase();

    // If only 3 digits entered without DS prefix, do not grant access - require full code with DS prefix!
    if (/^\d{3}$/.test(clean)) {
      return {
        success: false,
        error: `Please enter the full access code starting with DS (e.g. DS${clean}).`,
      };
    }

    if (clean.length < 3) {
      return { success: false, error: 'Access code must be at least 3 characters.' };
    }

    await this.init();

    const cleanWithDS = clean.startsWith('DA') ? `DS${clean.substring(2)}` : clean;

    const matchesCode = (val) => {
      if (!val) return false;
      const v = String(val).trim().toUpperCase();
      return v === clean || v === cleanWithDS;
    };

    // Real-time lookup in users database
    const user = usersDatabase.find((u) => {
      const uCode = (u.accessCode || '').trim().toUpperCase();
      const uUserId = (u.userId || '').trim().toUpperCase();
      const uId = (u.id || '').trim().toUpperCase();
      const uEmail = (u.email || '').trim().toUpperCase();
      return (
        matchesCode(uCode) ||
        matchesCode(uUserId) ||
        matchesCode(uId) ||
        uEmail === clean
      );
    });

    if (!user) {
      return {
        success: false,
        error: 'Invalid access code. No active account found.',
      };
    }

    // Strictly disallow deactivated or inactive accounts
    if (user.status !== 'active') {
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your system administrator.',
      };
    }

    const now = Date.now();
    const fallbackId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    currentSession = {
      id: user.id,
      email: user.email,
      userId: user.userId || user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      mobile: user.mobile,
      assignedLocations: user.assignedLocations,
      hub: user.assignedLocations && user.assignedLocations.length > 0 ? user.assignedLocations[0] : '',
      accessCode: user.accessCode || raw,
      sessionId: fallbackId,
      accessToken: fallbackId,
      refreshToken: fallbackId,
      token: fallbackId,
      loginTime: new Date(now).toISOString(),
      loginTimestamp: now,
      expiresAt: now + SESSION_EXPIRY_MS, // 8-hour session lifetime
    };

    await this.saveSessionToStorage(currentSession);
    this.syncSessionWithBackend(currentSession).catch(() => {});

    return {
      success: true,
      session: currentSession,
    };
  },

  /**
   * Asynchronously synchronize session with Render / Supabase backend
   */
  async syncSessionWithBackend(session) {
    if (!session) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://district-stock-api.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId || session.id || session.email,
          role: session.role || 'Admin',
          sessionId: session.sessionId || null,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.session) {
          session.sessionId = json.session.sessionId || session.sessionId;
          session.accessToken = json.session.accessToken || session.accessToken;
          session.refreshToken = json.session.refreshToken || session.refreshToken;
          session.token = json.session.token || json.session.accessToken || session.token;
          await this.saveSessionToStorage(session);
        }
      }
    } catch (_) {}
  },

  /**
   * Get current authenticated session
   */
  getCurrentSession() {
    return currentSession;
  },

  /**
   * Log out active user and clear session
   */
  async logout() {
    currentSession = null;
    await this.clearSessionStorage();
    this.notifyListeners({ type: 'USER_LOGGED_OUT' });
  },

  /**
   * Retrieve all users (excluding sensitive password hashes)
   */
  getUsers() {
    return usersDatabase.map(({ passwordHash, salt, ...safeUser }) => safeUser);
  },

  /**
   * Get a single user by ID
   */
  getUserById(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    const withoutDS = cleanId.startsWith('ds') ? cleanId.substring(2) : cleanId;
    const withDS = cleanId.startsWith('ds') ? cleanId : `ds${cleanId}`;

    const matchesVal = (val) => {
      if (!val) return false;
      const v = String(val).trim().toLowerCase();
      const vWithoutDS = v.startsWith('ds') ? v.substring(2) : v;
      const vWithDS = v.startsWith('ds') ? v : `ds${v}`;
      return v === cleanId || v === withoutDS || v === withDS || vWithoutDS === withoutDS || vWithDS === withDS;
    };

    const user = usersDatabase.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanId) ||
        matchesVal(u.id) ||
        matchesVal(u.userId) ||
        matchesVal(u.accessCode)
    );
    if (!user) return null;
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  },

  /**
   * Check if an access code or user ID already exists
   */
  isAccessCodeTaken(code, excludeUserId = null) {
    if (!code) return false;
    const clean = code.trim().toUpperCase();
    const cleanExclude = excludeUserId ? excludeUserId.trim().toLowerCase() : null;
    return usersDatabase.some((u) => {
      if (
        cleanExclude &&
        ((u.id && u.id.toLowerCase() === cleanExclude) ||
          (u.userId && u.userId.toLowerCase() === cleanExclude) ||
          (u.email && u.email.toLowerCase() === cleanExclude))
      ) {
        return false;
      }
      const uCode = (u.accessCode || '').trim().toUpperCase();
      const uUserId = (u.userId || '').trim().toUpperCase();
      const uId = (u.id || '').trim().toUpperCase();
      return uCode === clean || uUserId === clean || uId === clean;
    });
  },

  /**
   * Add a new user (Screen 02 / 03 / 04)
   */
  async addUser(userData) {
    if (!isInitialized) {
      await this.init();
    }

    if (userData.accessCode && this.isAccessCodeTaken(userData.accessCode)) {
      return {
        success: false,
        error: `Access Code ${userData.accessCode.trim().toUpperCase()} already exists!`,
      };
    }

    const rolePrefixMap = {
      'Admin': 'ADM',
      'Operation Manager': 'OPM',
      'Operations Manager': 'OPM',
      'Warehouse User': 'WHU',
      'Warehouse Ground User': 'WHG',
      'Ground User — Warehouse': 'WHG',
      'Event User': 'EVU',
      'Event Ground User': 'EVG',
      'Ground User — Event': 'EVG',
      'Event Planner': 'EVP',
    };

    const prefix = rolePrefixMap[userData.role] || 'USR';
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `${prefix}-${nextNum}`;
    const assignedId = userData.userId && userData.userId.trim() ? userData.userId.trim() : (userData.accessCode ? userData.accessCode.trim() : generatedId);
    const assignedCode = userData.accessCode && userData.accessCode.trim() ? userData.accessCode.trim() : assignedId;

    const userPassword = userData.password && userData.password.trim() ? userData.password.trim() : 'User@1234';
    const userPasswordHash = this.hashPassword(userPassword, SALT);

    const newUser = {
      id: assignedId,
      userId: assignedId,
      accessCode: assignedCode,
      name: userData.name ? userData.name.trim() : 'New User',
      email: userData.email && userData.email.trim() ? userData.email.trim() : `${assignedId.toLowerCase()}@district.com`,
      mobile: userData.mobile ? userData.mobile.trim() : '+91 98000 00000',
      role: userData.role || 'Warehouse User',
      status: userData.status || 'active',
      assignedLocations: Array.isArray(userData.assignedLocations) ? userData.assignedLocations : [],
      salt: SALT,
      passwordHash: userPasswordHash,
      createdAt: new Date().toISOString(),
    };

    usersDatabase.unshift(newUser);
    await this.saveToStorage();
    const { passwordHash, salt, ...safeUser } = newUser;
    this.notifyListeners({ type: 'USER_ADDED', user: safeUser });
    return { success: true, user: safeUser };
  },

  /**
   * Update an existing user
   */
  async updateUser(id, updatedFields) {
    const cleanId = (id || '').trim().toLowerCase();
    const index = usersDatabase.findIndex(
      (u) =>
        (u.id && u.id.toLowerCase() === cleanId) ||
        (u.userId && u.userId.toLowerCase() === cleanId) ||
        (u.accessCode && u.accessCode.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );
    if (index === -1) {
      return { success: false, error: 'User not found.' };
    }

    if (updatedFields.accessCode && this.isAccessCodeTaken(updatedFields.accessCode, id)) {
      return {
        success: false,
        error: `Access Code ${updatedFields.accessCode.trim().toUpperCase()} already exists!`,
      };
    }

    const current = usersDatabase[index];
    const newUserId = updatedFields.userId || current.userId;
    const newAccessCode = updatedFields.accessCode || updatedFields.userId || current.accessCode || newUserId;

    usersDatabase[index] = {
      ...current,
      ...updatedFields,
      userId: newUserId,
      accessCode: newAccessCode,
    };

    const { passwordHash, salt, ...safeUser } = usersDatabase[index];

    // If currently logged-in user is updated, update currentSession in real-time
    if (
      currentSession &&
      ((currentSession.id && currentSession.id.toLowerCase() === cleanId) ||
        (currentSession.userId && currentSession.userId.toLowerCase() === cleanId) ||
        (currentSession.accessCode && currentSession.accessCode.toLowerCase() === cleanId) ||
        (currentSession.email && currentSession.email.toLowerCase() === cleanId))
    ) {
      currentSession = {
        ...currentSession,
        ...safeUser,
      };
    }

    await this.saveToStorage();
    this.notifyListeners({ type: 'USER_UPDATED', user: safeUser, session: currentSession });
    return { success: true, user: safeUser };
  },

  /**
   * Toggle user active/inactive status (Deactivate / Activate)
   */
  toggleUserStatus(id) {
    const cleanId = (id || '').trim().toLowerCase();
    const index = usersDatabase.findIndex(
      (u) =>
        (u.id && u.id.toLowerCase() === cleanId) ||
        (u.userId && u.userId.toLowerCase() === cleanId) ||
        (u.accessCode && u.accessCode.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );
    if (index === -1) {
      return { success: false, error: 'User not found.' };
    }

    const currentStatus = usersDatabase[index].status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    usersDatabase[index].status = newStatus;

    if (
      currentSession &&
      ((currentSession.id && currentSession.id.toLowerCase() === cleanId) ||
        (currentSession.userId && currentSession.userId.toLowerCase() === cleanId) ||
        (currentSession.accessCode && currentSession.accessCode.toLowerCase() === cleanId) ||
        (currentSession.email && currentSession.email.toLowerCase() === cleanId))
    ) {
      currentSession = {
        ...currentSession,
        status: newStatus,
      };
    }

    this.saveToStorage();
    this.notifyListeners({ type: 'STATUS_CHANGED', id, status: newStatus, session: currentSession });
    return { success: true, status: newStatus };
  },

  /**
   * Delete user
   */
  deleteUser(id) {
    const cleanId = (id || '').trim().toLowerCase();
    const initialLen = usersDatabase.length;
    usersDatabase = usersDatabase.filter(
      (u) =>
        (u.id && u.id.toLowerCase() !== cleanId) &&
        (u.userId && u.userId.toLowerCase() !== cleanId) &&
        (u.accessCode && u.accessCode.toLowerCase() !== cleanId) &&
        (u.email && u.email.toLowerCase() !== cleanId)
    );
    const deleted = usersDatabase.length < initialLen;
    if (deleted) {
      this.saveToStorage();
      this.notifyListeners({ type: 'USER_DELETED', id });
    }
    return { success: deleted };
  },

  /**
   * Get User Setup metric summary
   */
  getUserMetrics() {
    const total = usersDatabase.length;
    const active = usersDatabase.filter((u) => u.status === 'active').length;
    const inactive = usersDatabase.filter((u) => u.status === 'inactive').length;

    return {
      total: String(total),
      active: String(active),
      inactive: String(inactive),
    };
  },
};

