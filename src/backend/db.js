const mysql = require("mysql2");
require("dotenv").config();

// Debug: Log environment variables
console.log("🔍 Environment Variables:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "***" : "undefined");
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PORT:", process.env.DB_PORT);

const connection = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Siddhesh@5',
  database: process.env.DB_NAME || 'SoberFolks',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
connection.query("SELECT 1", (err, results) => {
  if (err) {
    console.error("❌ DB connection failed:", err);
  } else {
    console.log("✅ Database connected successfully");
  }
});

module.exports = connection;