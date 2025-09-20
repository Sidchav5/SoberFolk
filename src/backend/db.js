const mysql = require("mysql2");

const connection = mysql.createPool({
  host: 'ballast.proxy.rlwy.net',
  user: 'root',
  password: 'hmaJazpXsafKoDLGVZRiJDIvHAIcyWBK',
  database: 'SoberFolks',
  port: 10902,
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