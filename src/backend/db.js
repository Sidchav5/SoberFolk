const mysql = require('mysql2');

const connection = mysql.createPool({
  host: 'ballast.proxy.rlwy.net',
  user: 'root',
  password: 'hmaJazpXsafKoDLGVZRiJDIvHAIcyWBK',
  database: 'SoberFolks',
  port: 10902,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = connection;
