const { Client } = require('pg');

const client = new Client({
  host: 'db.xiojkhfuyjkklfopwjec.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'AnkitSheetal@2003',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const schemaSql = `
-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  username TEXT,
  password TEXT,
  email TEXT,
  role TEXT,
  phone TEXT,
  location TEXT,
  status TEXT DEFAULT 'Active',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Warehouses Table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  type TEXT,
  address TEXT,
  capacity TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  venue TEXT,
  city TEXT,
  state TEXT,
  start_date TEXT,
  end_date TEXT,
  planner_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  category TEXT,
  subcategory TEXT,
  uom TEXT,
  brand TEXT,
  hsn TEXT,
  min_stock NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inbounds Table
CREATE TABLE IF NOT EXISTS public.inbounds (
  id TEXT PRIMARY KEY,
  consignment_no TEXT,
  source_type TEXT,
  supplier_warehouse TEXT,
  destination_type TEXT,
  destination TEXT,
  received_date TEXT,
  total_qty NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Completed',
  items JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Movements Table
CREATE TABLE IF NOT EXISTS public.movements (
  id TEXT PRIMARY KEY,
  movement_id TEXT,
  movement_type TEXT,
  source TEXT,
  destination TEXT,
  date TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'Completed',
  vehicle_no TEXT,
  remarks TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Requisitions Table
CREATE TABLE IF NOT EXISTS public.requisitions (
  id TEXT PRIMARY KEY,
  requisition_no TEXT,
  event_id TEXT,
  event_name TEXT,
  planner_id TEXT,
  planner_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'Pending',
  urgency TEXT DEFAULT 'Medium',
  delivery_date TEXT,
  remarks TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Master Consolidated Store
CREATE TABLE IF NOT EXISTS public.master (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Active Auth Sessions (JWT, Access Token, Refresh Token, Session ID)
CREATE TABLE IF NOT EXISTS public.sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  role TEXT,
  access_token TEXT,
  refresh_token TEXT,
  device_info JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions for PostgREST & service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
`;

async function setup() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');
    await client.query(schemaSql);
    console.log('All tables created successfully in Supabase!');

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Existing public tables in Supabase now:');
    res.rows.forEach(r => console.log('  -', r.table_name));
    await client.end();
  } catch (e) {
    console.error('Error during setup:', e);
    process.exit(1);
  }
}

setup();
