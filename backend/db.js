const { Pool, types } = require('pg');

// Parse BIGINT
types.setTypeParser(20, val => parseInt(val, 10));

// Use environment variables if available, otherwise fall back to config.json for local development
let config;
try {
  config = require('./config.json');
} catch (e) {
  config = {};
}

const connection = new Pool({
  host: process.env.RDS_HOST || config.rds_host,
  user: process.env.RDS_USER || config.rds_user,
  password: process.env.RDS_PASSWORD || config.rds_password,
  port: process.env.RDS_PORT || config.rds_port || 5432,
  database: process.env.RDS_DB || config.rds_db,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = connection;
