// // db.js — PostgreSQL Database Connection Pool

const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD|| 'root',
  database: process.env.DB_NAME || 'soberfolks',
  max: 20,                    // Maximum number of clients in the pool
  // idleTimeoutMillis: 100000,   // Close idle clients after 30 seconds
  // connectionTimeoutMillis: 10000, // Connection timeout
});


// Test connection once at startup
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('📋 Connection details:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
  } else {
    console.log('✅ PostgreSQL Database connected successfully');
    console.log('🕐 Server time:', result.rows[0].now);
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err);
});

// Export the pool for querying
module.exports = pool;
