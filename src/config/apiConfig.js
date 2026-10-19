/**
 * District Stock — Centralized API & Cloud Sync Configuration
 */

export const API_CONFIG = {
  // Live Render Production API (backed by Supabase PostgreSQL)
  BASE_URL: 'https://district-stock-api.onrender.com',
  SUPABASE_URL: 'https://xiojkhfuyjkklfopwjec.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb2praGZ1eWpra2xmb3B3amVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzA1MDAsImV4cCI6MjEwNzkwNjUwMH0.ppZJ0cyUAd02z0wqk2ICiyv2dBiMlv1zzoOFrHOoTHI',
  SYNC_ENABLED: true,
  TIMEOUT_MS: 10000,
};

