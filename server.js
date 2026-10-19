/**
 * District Stock — Production Centralized Backend API Server
 * 
 * Powered by Node.js + Supabase PostgreSQL
 * Features:
 * - Persistent PostgreSQL storage on Supabase
 * - JWT Access Token & Refresh Token generation and verification
 * - Persistent Session ID tracking in database
 * - Bidirectional Cloud Sync for offline-first mobile clients
 * - Local storage fallback for zero downtime
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = process.env.PORT || 10000;
const DATA_DIR = path.join(__dirname, 'server_data');

// Supabase PostgreSQL Connection
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:AnkitSheetal%402003@db.xiojkhfuyjkklfopwjec.supabase.co:5432/postgres';
const JWT_SECRET = process.env.JWT_SECRET || 'district-stock-secret-jwt-key-2026';

// Supabase REST Info
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xiojkhfuyjkklfopwjec.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb2praGZ1eWpra2xmb3B3amVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMzMDUwMCwiZXhwIjoyMTA3OTA2NTAwfQ.KnP4vnJPEDUViokonVqGMfakDE6btkFHtOUYGzLe29g';

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

// Ensure local backup storage exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create DATA_DIR:', err);
  }
}

// Local File Helper (Resilient Fallback Cache)
function readLocalCollection(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    return name === 'master' ? { warehouses: [], products: [], events: [], requisitions: [] } : [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return name === 'master' ? { warehouses: [], products: [], events: [], requisitions: [] } : [];
  }
}

function writeLocalCollection(name, data) {
  try {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
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

async function getFromDb(collectionName) {
  try {
    if (collectionName === 'master') {
      const res = await pool.query("SELECT key, data FROM public.master WHERE key = 'master_data' LIMIT 1;");
      if (res.rows.length > 0 && res.rows[0].data) {
        return res.rows[0].data;
      }
      return readLocalCollection('master');
    }

    const res = await pool.query(`SELECT raw_data FROM public.${collectionName} ORDER BY created_at DESC;`);
    if (res.rows && res.rows.length > 0) {
      return res.rows.map((r) => r.raw_data).filter(Boolean);
    }
    return readLocalCollection(collectionName);
  } catch (err) {
    console.warn(`[DB Read Warning] Failed for ${collectionName}, falling back to local:`, err.message);
    return readLocalCollection(collectionName);
  }
}

async function saveToDb(collectionName, items) {
  writeLocalCollection(collectionName, items);

  try {
    if (collectionName === 'master') {
      await pool.query(
        `INSERT INTO public.master (key, data, updated_at) 
         VALUES ('master_data', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
        [JSON.stringify(items)]
      );
      return true;
    }

    if (!Array.isArray(items)) return false;

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
        await pool.query(query, values);
      }
    }
    return true;
  } catch (err) {
    console.warn(`[DB Write Warning] Failed for ${collectionName}:`, err.message);
    return false;
  }
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
        reject(err);
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

// ==========================================
// HTTP Server & Routes
// ==========================================

const server = http.createServer(async (req, res) => {
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
    sendJson(res, 200, {
      status: 'ok',
      service: 'District Stock Central API',
      version: '1.0.32',
      database: 'Supabase PostgreSQL',
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
        await pool.query(
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
    const allData = {};
    for (const key of collections) {
      allData[key] = await getFromDb(key);
    }
    sendJson(res, 200, { success: true, data: allData, timestamp: Date.now() });
    return;
  }

  // POST /api/sync/all
  if (pathname === '/api/sync/all' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const updated = {};
      for (const [key, val] of Object.entries(payload)) {
        if (collections.includes(key)) {
          await saveToDb(key, val);
          updated[key] = Array.isArray(val) ? val.length : 1;
        }
      }
      sendJson(res, 200, { success: true, updated, timestamp: Date.now() });
    } catch (e) {
      sendJson(res, 400, { success: false, error: e.message });
    }
    return;
  }

  // /api/sync/:collection
  const syncMatch = pathname.match(/^\/api\/sync\/([a-zA-Z0-9_-]+)$/);
  if (syncMatch) {
    const collectionName = syncMatch[1].toLowerCase();

    if (req.method === 'GET') {
      const data = await getFromDb(collectionName);
      sendJson(res, 200, {
        success: true,
        collection: collectionName,
        count: Array.isArray(data) ? data.length : 1,
        data,
      });
      return;
    }

    if (req.method === 'POST') {
      try {
        const payload = await parseJsonBody(req);
        let itemsToSave = [];

        if (collectionName === 'master' && typeof payload === 'object') {
          itemsToSave = payload;
        } else if (Array.isArray(payload)) {
          itemsToSave = payload;
        } else if (payload && Array.isArray(payload.data)) {
          itemsToSave = payload.data;
        } else if (payload && typeof payload === 'object') {
          const existing = await getFromDb(collectionName);
          const id = payload.id || payload.userId || payload.code || payload.consignmentNo;
          const idx = id && Array.isArray(existing) ? existing.findIndex((x) => (x.id || x.userId || x.code || x.consignmentNo) === id) : -1;
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...payload, updatedAt: new Date().toISOString() };
          } else if (Array.isArray(existing)) {
            existing.push({ ...payload, createdAt: payload.createdAt || new Date().toISOString() });
          }
          itemsToSave = existing;
        }

        await saveToDb(collectionName, itemsToSave);
        sendJson(res, 200, {
          success: true,
          collection: collectionName,
          count: Array.isArray(itemsToSave) ? itemsToSave.length : 1,
          timestamp: Date.now(),
        });
      } catch (e) {
        sendJson(res, 400, { success: false, error: e.message });
      }
      return;
    }
  }

  sendJson(res, 404, { error: 'Not Found', path: pathname });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`District Stock Central API Server (Supabase DB)`);
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  console.log(`Connected to Supabase PostgreSQL at:`);
  console.log(`db.xiojkhfuyjkklfopwjec.supabase.co`);
  console.log(`===============================================`);
});
