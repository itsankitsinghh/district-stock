/**
 * District Stock — Production Centralized Backend API Server
 * 
 * Standalone Node.js HTTP Server (Zero extra dependencies required)
 * Runs seamlessly on Render, Railway, Fly.io, or VPS.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 10000;
const DATA_DIR = path.join(__dirname, 'server_data');

// Ensure data storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create DATA_DIR:', err);
  }
}

// In-memory cache + JSON file persistence
const collections = {
  users: 'users.json',
  warehouses: 'warehouses.json',
  events: 'events.json',
  products: 'products.json',
  inbounds: 'inbounds.json',
  movements: 'movements.json',
  requisitions: 'requisitions.json',
};

// Helper to read collection
function readCollection(name) {
  const filename = collections[name] || `${name}.json`;
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    return [];
  }
}

// Helper to write collection
function writeCollection(name, data) {
  const filename = collections[name] || `${name}.json`;
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
    return false;
  }
}

// Helper to parse JSON request body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Protect against large payloads (> 50MB)
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Set standard CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

// Send JSON response
function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Root / Health check
  if (pathname === '/' || pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'District Stock Central API',
      version: '1.0.31',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Ping endpoint
  if (pathname === '/api/ping') {
    sendJson(res, 200, { pong: true, time: Date.now() });
    return;
  }

  // Sync All Collections: GET /api/sync/all
  if (pathname === '/api/sync/all' && req.method === 'GET') {
    const allData = {};
    for (const key of Object.keys(collections)) {
      allData[key] = readCollection(key);
    }
    sendJson(res, 200, { success: true, data: allData, timestamp: Date.now() });
    return;
  }

  // Sync All Collections: POST /api/sync/all
  if (pathname === '/api/sync/all' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const updated = {};
      for (const [key, val] of Object.entries(payload)) {
        if (Array.isArray(val)) {
          writeCollection(key, val);
          updated[key] = val.length;
        }
      }
      sendJson(res, 200, { success: true, updated, timestamp: Date.now() });
    } catch (e) {
      sendJson(res, 400, { success: false, error: e.message });
    }
    return;
  }

  // Specific Collection endpoints: /api/sync/:collection
  const syncMatch = pathname.match(/^\/api\/sync\/([a-zA-Z0-9_-]+)$/);
  if (syncMatch) {
    const collectionName = syncMatch[1].toLowerCase();

    if (req.method === 'GET') {
      const data = readCollection(collectionName);
      sendJson(res, 200, { success: true, collection: collectionName, count: data.length, data });
      return;
    }

    if (req.method === 'POST') {
      try {
        const payload = await parseJsonBody(req);
        let itemsToSave = [];
        if (Array.isArray(payload)) {
          itemsToSave = payload;
        } else if (payload && Array.isArray(payload.data)) {
          itemsToSave = payload.data;
        } else if (payload && typeof payload === 'object') {
          // If single object, append or update
          const existing = readCollection(collectionName);
          const id = payload.id || payload.userId || payload.code || payload.consignmentNo;
          const idx = id ? existing.findIndex((x) => (x.id || x.userId || x.code || x.consignmentNo) === id) : -1;
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...payload, updatedAt: new Date().toISOString() };
          } else {
            existing.push({ ...payload, createdAt: payload.createdAt || new Date().toISOString() });
          }
          itemsToSave = existing;
        }

        writeCollection(collectionName, itemsToSave);
        sendJson(res, 200, {
          success: true,
          collection: collectionName,
          count: itemsToSave.length,
          timestamp: Date.now(),
        });
      } catch (e) {
        sendJson(res, 400, { success: false, error: e.message });
      }
      return;
    }
  }

  // Fallback 404
  sendJson(res, 404, { error: 'Not Found', path: pathname });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`District Stock Central API Server`);
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  console.log(`Ready to serve Render & mobile clients`);
  console.log(`===============================================`);
});
