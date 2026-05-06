const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('[DB] Conexión a PostgreSQL establecida');
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
