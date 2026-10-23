/**
 * District Stock — Production Centralized Backend API Server
 * 
 * Powered by Node.js + Supabase PostgreSQL
 * Features:
 * - Persistent PostgreSQL storage on Supabase (the database is the only source of truth)
 * - JWT Access Token & Refresh Token generation and verification
 * - Persistent Session ID tracking in database
 * - Bidirectional Cloud Sync for offline-first mobile clients
 * - Honest error reporting: a failed database write is returned to the client as an error
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = process.env.PORT || 10000;

// Supabase PostgreSQL Connection
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:AnkitSheetal%402003@db.xiojkhfuyjkklfopwjec.supabase.co:5432/postgres';
const JWT_SECRET = process.env.JWT_SECRET || 'district-stock-secret-jwt-key-2026';

// Supabase REST Info
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xiojkhfuyjkklfopwjec.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb2praGZ1eWpra2xmb3B3amVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMzMDUwMCwiZXhwIjoyMTA3OTA2NTAwfQ.KnP4vnJPEDUViokonVqGMfakDE6btkFHtOUYGzLe29g';

// ==========================================
// Database connection manager
// ==========================================
//
// The "direct" Supabase host (db.<project-ref>.supabase.co) only has an IPv6 address, and
// Render can only make outbound IPv4 connections, so it can never connect from Render.
// That is why nothing was ever saved. The Supabase Session pooler is IPv4-capable, so we
// derive its address from the same project/credentials and try it first. The region can be
// overridden with SUPABASE_POOLER_REGION.
const SUPABASE_POOLER_REGION = process.env.SUPABASE_POOLER_REGION || 'ap-southeast-1';

function toPoolerUrl(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (!match) return null;
    parsed.hostname = `aws-0-${SUPABASE_POOLER_REGION}.pooler.supabase.com`;
    parsed.port = '5432';
    parsed.username = `postgres.${match[1]}`;
    return parsed.toString();
  } catch (_) {
    return null;
  }
}

const DB_URL_CANDIDATES = [toPoolerUrl(DB_URL), DB_URL]
  .filter(Boolean)
  .filter((candidate, index, all) => all.indexOf(candidate) === index);

let pool = null;
let connectingPromise = null;
const dbStatus = { connected: false, via: null, lastError: null, lastAttempt: null };

function describeDbTarget(connectionString) {
  try {
    const parsed = new URL(connectionString);
    return `${parsed.hostname}:${parsed.port || 5432}`;
  } catch (_) {
    return 'unknown-host';
  }
}

function dbUnavailableError() {
  const err = new Error(`Database unavailable${dbStatus.lastError ? ` (${dbStatus.lastError})` : ''}`);
  err.code = 'DB_UNAVAILABLE';
  return err;
}

async function connectDatabase() {
  dbStatus.lastAttempt = new Date().toISOString();
  for (const connectionString of DB_URL_CANDIDATES) {
    const target = describeDbTarget(connectionString);
    const candidate = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    candidate.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
    });
    try {
      await candidate.query('SELECT 1');
      const previous = pool;
      pool = candidate;
      if (previous) previous.end().catch(() => {});
      dbStatus.connected = true;
      dbStatus.via = target;
      dbStatus.lastError = null;
      console.log(`[DB] Connected to Supabase PostgreSQL via ${target}`);
      return true;
    } catch (err) {
      dbStatus.lastError = `${target}: ${err.message}`;
      console.error(`[DB] Could not connect via ${target}:`, err.message);
      candidate.end().catch(() => {});
    }
  }
  dbStatus.connected = false;
  dbStatus.via = null;
  return false;
}

async function getPool() {
  if (pool) return pool;
  if (!connectingPromise) {
    connectingPromise = connectDatabase().finally(() => {
      connectingPromise = null;
    });
  }
  await connectingPromise;
  if (!pool) throw dbUnavailableError();
  return pool;
}

async function withTransaction(work) {
  const activePool = await getPool();
  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

// ==========================================
// JWT & Session Helpers (Zero Dependency Crypto)
// ==========================================

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString();
}

function createJwt(payload, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSig) return null;
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

// ==========================================
// Database Query Helpers
// ==========================================

function mergeUnique(listA = [], listB = [], keys = ['id']) {
  const map = new Map();
  const getKey = (item) => {
    if (!item || typeof item !== 'object') return null;
    for (const k of keys) {
      if (item[k]) return String(item[k]).toLowerCase().trim();
    }
    return null;
  };
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
}

// Collections that are stored as one JSON object (blob in public.master) rather than a plain list of rows
const OBJECT_COLLECTIONS = ['master', 'movements', 'logistics', 'carriers'];
// Collections stored as one row per record, with the full record kept in raw_data
const ROW_COLLECTIONS = ['users', 'warehouses', 'events', 'products', 'inbounds', 'movements', 'requisitions'];
const SYNC_COLLECTIONS = Array.from(new Set([...OBJECT_COLLECTIONS, ...ROW_COLLECTIONS]));

function badPayloadError(message) {
  const err = new Error(message);
  err.code = 'BAD_PAYLOAD';
  return err;
}

// Reads from the database only. Any failure is thrown to the caller; we never answer with a
// stale local copy, because that makes the client believe its data is safe when it is not.
async function getFromDb(collectionName) {
  if (!SYNC_COLLECTIONS.includes(collectionName)) {
    throw badPayloadError(`Unknown collection: ${collectionName}`);
  }
  const db = await getPool();

  if (collectionName === 'master') {
    let masterObj = { warehouses: [], products: [], events: [], requisitions: [] };
    const res = await db.query("SELECT key, data FROM public.master WHERE key = 'master_data' LIMIT 1;");
    if (res.rows.length > 0 && res.rows[0].data && typeof res.rows[0].data === 'object') {
      masterObj = { ...masterObj, ...res.rows[0].data };
    }
    const whRes = await db.query('SELECT raw_data FROM public.warehouses ORDER BY created_at DESC;');
    if (whRes.rows.length > 0) {
      const dbWhs = whRes.rows.map((r) => r.raw_data).filter(Boolean);
      masterObj.warehouses = mergeUnique(masterObj.warehouses, dbWhs, ['id', 'code', 'name']);
    }
    const prRes = await db.query('SELECT raw_data FROM public.products ORDER BY created_at DESC;');
    if (prRes.rows.length > 0) {
      const dbPrs = prRes.rows.map((r) => r.raw_data).filter(Boolean);
      masterObj.products = mergeUnique(masterObj.products, dbPrs, ['id', 'code', 'sku', 'name']);
    }
    const evRes = await db.query('SELECT raw_data FROM public.events ORDER BY created_at DESC;');
    if (evRes.rows.length > 0) {
      const dbEvs = evRes.rows.map((r) => r.raw_data).filter(Boolean);
      masterObj.events = mergeUnique(masterObj.events, dbEvs, ['id', 'code', 'name']);
    }
    const reqRes = await db.query('SELECT raw_data FROM public.requisitions ORDER BY created_at DESC;');
    if (reqRes.rows.length > 0) {
      const dbReqs = reqRes.rows.map((r) => r.raw_data).filter(Boolean);
      masterObj.requisitions = mergeUnique(masterObj.requisitions, dbReqs, ['id', 'requisitionNo']);
    }
    return masterObj;
  }

  if (collectionName === 'movements') {
    const res = await db.query("SELECT key, data FROM public.master WHERE key = 'movements_data' LIMIT 1;");
    if (res.rows.length > 0 && res.rows[0].data && typeof res.rows[0].data === 'object') {
      return res.rows[0].data;
    }
    const rawRes = await db.query('SELECT raw_data FROM public.movements ORDER BY created_at DESC;');
    return rawRes.rows.map((r) => r.raw_data).filter(Boolean);
  }

  if (collectionName === 'logistics' || collectionName === 'carriers') {
    const res = await db.query("SELECT key, data FROM public.master WHERE key = 'logistics_data' LIMIT 1;");
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data;
    }
    return { carriers: [], transporters: [] };
  }

  // collectionName is whitelisted above, so it is safe to use as a table name
  const res = await db.query(`SELECT raw_data FROM public.${collectionName} ORDER BY created_at DESC;`);
  return res.rows.map((r) => r.raw_data).filter(Boolean);
}

// Writes one collection using the caller's transaction client. A record that individually fails
// is rolled back to a savepoint and reported in summary.failed, so one bad record cannot block
// the rest of the batch. Any other failure is thrown so the whole transaction is rolled back.
async function saveCollection(db, collectionName, items, summary) {
  try {
    if (collectionName === 'master') {
      if (!items || typeof items !== 'object' || Array.isArray(items)) {
        throw badPayloadError('master must be an object');
      }
      await db.query(
        `INSERT INTO public.master (key, data, updated_at)
         VALUES ('master_data', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
        [JSON.stringify(items)]
      );
      if (Array.isArray(items.warehouses) && items.warehouses.length > 0) {
        await saveCollection(db, 'warehouses', items.warehouses, summary);
      }
      if (Array.isArray(items.products) && items.products.length > 0) {
        await saveCollection(db, 'products', items.products, summary);
      }
      if (Array.isArray(items.events) && items.events.length > 0) {
        await saveCollection(db, 'events', items.events, summary);
      }
      if (Array.isArray(items.requisitions) && items.requisitions.length > 0) {
        await saveCollection(db, 'requisitions', items.requisitions, summary);
      }
      return true;
    }

    if (collectionName === 'movements') {
      if (items && typeof items === 'object' && !Array.isArray(items)) {
        await db.query(
          `INSERT INTO public.master (key, data, updated_at)
           VALUES ('movements_data', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
          [JSON.stringify(items)]
        );
        const flattened = [
          ...(Array.isArray(items.outbounds) ? items.outbounds : []),
          ...(Array.isArray(items.transfers) ? items.transfers : []),
          ...(Array.isArray(items.returns) ? items.returns : []),
        ];
        if (flattened.length > 0) {
          await saveCollection(db, 'movements', flattened, summary);
        }
        return true;
      }
    }

    if (collectionName === 'logistics' || collectionName === 'carriers') {
      await db.query(
        `INSERT INTO public.master (key, data, updated_at)
         VALUES ('logistics_data', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
        [JSON.stringify(items)]
      );
      return true;
    }

    if (!Array.isArray(items)) {
      throw badPayloadError(`Expected a list of records for ${collectionName}`);
    }

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.id || item.code || item.consignmentNo || item.movementId || item.requisitionNo || item.userId || crypto.randomUUID());

      let query = '';
      let values = [];

      if (collectionName === 'users') {
        query = `
          INSERT INTO public.users (id, user_id, username, password, email, role, phone, location, status, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();
        `;
        values = [id, item.userId || id, item.username || item.name || '', item.password || '', item.email || '', item.role || 'Warehouse User', item.phone || '', item.location || '', item.status || 'Active', JSON.stringify(item)];
      } else if (collectionName === 'warehouses') {
        query = `
          INSERT INTO public.warehouses (id, code, name, city, state, pincode, type, address, capacity, manager_name, manager_phone, is_active, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            city = EXCLUDED.city,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();
        `;
        values = [id, item.code || id, item.name || '', item.city || '', item.state || '', item.pincode || '', item.type || '', item.address || '', item.capacity || '', item.managerName || '', item.managerPhone || '', item.isActive !== false, JSON.stringify(item)];
      } else if (collectionName === 'products') {
        query = `
          INSERT INTO public.products (id, code, name, category, subcategory, uom, brand, hsn, min_stock, price, is_active, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();
        `;
        values = [id, item.code || id, item.name || '', item.category || '', item.subcategory || '', item.uom || 'Pcs', item.brand || '', item.hsn || '', Number(item.minStock || 0), Number(item.price || 0), item.isActive !== false, JSON.stringify(item)];
      } else if (collectionName === 'events') {
        query = `
          INSERT INTO public.events (id, code, name, venue, city, state, start_date, end_date, planner_name, is_active, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();
        `;
        values = [id, item.code || id, item.name || '', item.venue || '', item.city || '', item.state || '', item.startDate || '', item.endDate || '', item.plannerName || '', item.isActive !== false, JSON.stringify(item)];
      } else if (collectionName === 'inbounds') {
        query = `
          INSERT INTO public.inbounds (id, consignment_no, source_type, supplier_warehouse, destination_type, destination, received_date, total_qty, status, items, documents, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (id) DO UPDATE SET
            total_qty = EXCLUDED.total_qty,
            status = EXCLUDED.status,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();
        `;
        values = [id, item.consignmentNo || id, item.sourceType || '', item.supplierWarehouse || '', item.destinationType || '', item.destination || '', item.receivedDate || '', Number(item.totalQty || 0), item.status || 'Completed', JSON.stringify(item.items || []), JSON.stringify(item.documents || []), JSON.stringify(item)];
      } else if (collectionName === 'movements') {
        query = `
          INSERT INTO public.movements (id, movement_id, movement_type, source, destination, date, items, status, vehicle_no, remarks, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();
        `;
        values = [id, item.movementId || id, item.movementType || '', item.source || '', item.destination || '', item.date || '', JSON.stringify(item.items || []), item.status || 'Completed', item.vehicleNo || '', item.remarks || '', JSON.stringify(item)];
      } else if (collectionName === 'requisitions') {
        query = `
          INSERT INTO public.requisitions (id, requisition_no, event_id, event_name, planner_id, planner_name, items, status, urgency, delivery_date, remarks, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();
        `;
        values = [id, item.requisitionNo || id, item.eventId || '', item.eventName || '', item.plannerId || '', item.plannerName || '', JSON.stringify(item.items || []), item.status || 'Pending', item.urgency || 'Medium', item.deliveryDate || '', item.remarks || '', JSON.stringify(item)];
      }

      if (query) {
        await db.query('SAVEPOINT save_row');
        try {
          await db.query(query, values);
          await db.query('RELEASE SAVEPOINT save_row');
          summary.saved += 1;
        } catch (rowErr) {
          await db.query('ROLLBACK TO SAVEPOINT save_row');
          summary.failed.push({ collection: collectionName, id, error: rowErr.message });
          console.error(`[DB Write Error] ${collectionName} record ${id} was not saved:`, rowErr.message);
        }
      }
    }
    return true;
  } catch (err) {
    console.error(`[DB Write Error] Failed for ${collectionName}:`, err.message);
    throw err;
  }
}

// Saves a collection atomically. Throws if the database cannot be reached or the transaction
// fails, so callers can tell the client the data was NOT saved. Resolves with
// { saved, failed } where failed lists individual records the database rejected.
async function saveToDb(collectionName, items) {
  if (!SYNC_COLLECTIONS.includes(collectionName)) {
    throw badPayloadError(`Unknown collection: ${collectionName}`);
  }
  const summary = { saved: 0, failed: [] };
  await withTransaction((db) => saveCollection(db, collectionName, items, summary));
  return summary;
}


// Helper to parse JSON request body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(badPayloadError(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Tells the client the truth about a failed read/write: 503 when the database is unreachable,
// 400 for a malformed request, 500 for anything else. The client must treat these as "not saved".
function sendDbError(res, err) {
  const statusCode = err.code === 'DB_UNAVAILABLE' ? 503 : err.code === 'BAD_PAYLOAD' ? 400 : 500;
  sendJson(res, statusCode, { success: false, error: err.message });
}

// ==========================================
// HTTP Server & Routes
// ==========================================

async function handleRequest(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Health / Status
  if (pathname === '/' || pathname === '/health') {
    // Live check so "ok" really means data can be saved. Still answers 200 when degraded so the
    // host's health probe does not restart a server that is just waiting for the database.
    let databaseReachable = false;
    try {
      const db = await getPool();
      await db.query('SELECT 1');
      databaseReachable = true;
    } catch (_) {}
    sendJson(res, 200, {
      status: databaseReachable ? 'ok' : 'degraded',
      service: 'District Stock Central API',
      version: '1.0.32',
      database: 'Supabase PostgreSQL',
      databaseConnected: databaseReachable,
      databaseVia: databaseReachable ? dbStatus.via : null,
      databaseError: databaseReachable ? null : dbStatus.lastError,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === '/api/ping') {
    sendJson(res, 200, { pong: true, database: 'Supabase PostgreSQL', time: Date.now() });
    return;
  }

  // ==========================================
  // Auth & Session Endpoints
  // ==========================================

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const userId = String(payload.userId || payload.username || 'admin');
      const role = String(payload.role || 'Admin');
      const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;

      const accessToken = createJwt({ userId, role, sessionId, type: 'access' }, 86400 * 7); // 7 days
      const refreshToken = createJwt({ userId, role, sessionId, type: 'refresh' }, 86400 * 30); // 30 days

      // Persist session to Supabase database
      try {
        const db = await getPool();
        await db.query(
          `INSERT INTO public.sessions (session_id, user_id, role, access_token, refresh_token, device_info, expires_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days', NOW())
           ON CONFLICT (session_id) DO UPDATE SET
             access_token = EXCLUDED.access_token,
             refresh_token = EXCLUDED.refresh_token,
             updated_at = NOW();`,
          [sessionId, userId, role, accessToken, refreshToken, JSON.stringify(payload.deviceInfo || {})]
        );
      } catch (dbErr) {
        console.warn('[Session Persist Warning]:', dbErr.message);
      }

      sendJson(res, 200, {
        success: true,
        message: 'Login successful',
        session: {
          sessionId,
          userId,
          role,
          token: accessToken,
          accessToken,
          refreshToken,
          expiresIn: 86400 * 7,
          timestamp: Date.now(),
        },
      });
    } catch (e) {
      sendJson(res, 400, { success: false, error: e.message });
    }
    return;
  }

  // POST /api/auth/refresh
  if (pathname === '/api/auth/refresh' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const refreshToken = payload.refreshToken || payload.refresh_token;

      if (!refreshToken) {
        sendJson(res, 400, { success: false, error: 'refreshToken required' });
        return;
      }

      const verified = verifyJwt(refreshToken);
      if (!verified || verified.type !== 'refresh') {
        sendJson(res, 401, { success: false, error: 'Invalid or expired refresh token' });
        return;
      }

      const newAccessToken = createJwt({
        userId: verified.userId,
        role: verified.role,
        sessionId: verified.sessionId,
        type: 'access',
      }, 86400 * 7);

      sendJson(res, 200, {
        success: true,
        accessToken: newAccessToken,
        token: newAccessToken,
        sessionId: verified.sessionId,
      });
    } catch (e) {
      sendJson(res, 400, { success: false, error: e.message });
    }
    return;
  }

  // GET /api/auth/session
  if (pathname === '/api/auth/session' && req.method === 'GET') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || parsedUrl.query.sessionId || parsedUrl.query.token;

    if (!token) {
      sendJson(res, 401, { success: false, error: 'Token missing' });
      return;
    }

    const payload = verifyJwt(token);
    if (!payload) {
      sendJson(res, 401, { success: false, error: 'Session expired or invalid' });
      return;
    }

    sendJson(res, 200, { success: true, valid: true, user: payload });
    return;
  }

  // ==========================================
  // Cloud Sync Endpoints (Supabase Backed)
  // ==========================================

  const collections = ['users', 'warehouses', 'events', 'products', 'inbounds', 'movements', 'requisitions', 'master'];

  // GET /api/sync/all
  if (pathname === '/api/sync/all' && req.method === 'GET') {
    try {
      const allData = {};
      for (const key of collections) {
        allData[key] = await getFromDb(key);
      }
      sendJson(res, 200, { success: true, data: allData, timestamp: Date.now() });
    } catch (err) {
      sendDbError(res, err);
    }
    return;
  }

  // POST /api/sync/all
  if (pathname === '/api/sync/all' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const updated = {};
      const failed = [];
      for (const [key, val] of Object.entries(payload)) {
        if (collections.includes(key)) {
          const result = await saveToDb(key, val);
          failed.push(...result.failed);
          updated[key] = Array.isArray(val) ? val.length : 1;
        }
      }
      sendJson(res, 200, { success: true, updated, failed, timestamp: Date.now() });
    } catch (err) {
      sendDbError(res, err);
    }
    return;
  }

  // /api/sync/:collection
  const syncMatch = pathname.match(/^\/api\/sync\/([a-zA-Z0-9_-]+)$/);
  if (syncMatch) {
    const collectionName = syncMatch[1].toLowerCase();

    if (!SYNC_COLLECTIONS.includes(collectionName)) {
      sendJson(res, 404, { success: false, error: `Unknown collection: ${collectionName}` });
      return;
    }

    if (req.method === 'GET') {
      try {
        const data = await getFromDb(collectionName);
        sendJson(res, 200, {
          success: true,
          collection: collectionName,
          count: Array.isArray(data) ? data.length : 1,
          data,
        });
      } catch (err) {
        sendDbError(res, err);
      }
      return;
    }

    if (req.method === 'POST') {
      try {
        const payload = await parseJsonBody(req);
        let itemsToSave = [];

        if (OBJECT_COLLECTIONS.includes(collectionName) && payload && typeof payload === 'object' && !Array.isArray(payload)) {
          // master / movements / logistics arrive as one object ({ warehouses, ... } / { outbounds, ... } /
          // { carriers, transporters }) and must be saved exactly as sent.
          itemsToSave = payload;
        } else if (Array.isArray(payload)) {
          itemsToSave = payload;
        } else if (payload && Array.isArray(payload.data)) {
          itemsToSave = payload.data;
        } else if (payload && typeof payload === 'object') {
          // A single record: merge it into the stored copy (if any) and upsert just that record.
          const id = payload.id || payload.userId || payload.code || payload.consignmentNo;
          const existing = id ? await getFromDb(collectionName) : [];
          const match = id && Array.isArray(existing)
            ? existing.find((x) => (x.id || x.userId || x.code || x.consignmentNo) === id)
            : null;
          const now = new Date().toISOString();
          itemsToSave = [match
            ? { ...match, ...payload, updatedAt: now }
            : { ...payload, createdAt: payload.createdAt || now }];
        }

        const result = await saveToDb(collectionName, itemsToSave);
        sendJson(res, 200, {
          success: true,
          collection: collectionName,
          count: Array.isArray(itemsToSave) ? itemsToSave.length : 1,
          saved: result.saved,
          failed: result.failed,
          timestamp: Date.now(),
        });
      } catch (err) {
        sendDbError(res, err);
      }
      return;
    }
  }

  sendJson(res, 404, { error: 'Not Found', path: pathname });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('[Server] Unhandled request error:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { success: false, error: err.message });
    } else {
      res.end();
    }
  });
});

// Exposed so the persistence logic can be tested without starting the HTTP listener.
module.exports = { saveCollection, saveToDb, getFromDb, withTransaction, getPool, connectDatabase, dbStatus };

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`District Stock Central API Server (Supabase DB)`);
    console.log(`Listening on http://0.0.0.0:${PORT}`);
    console.log(`===============================================`);
  });

  // Connect to the database now, and keep retrying until it is reachable. Requests that arrive
  // while the database is down get a 503 (never a fake success).
  connectDatabase();
  setInterval(() => {
    if (!dbStatus.connected) connectDatabase();
  }, 30000).unref();
}
