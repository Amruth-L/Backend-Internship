const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function setupDatabase() {
  console.log('Starting database setup...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema.sql...');
    await pool.query(schemaSql);
    console.log('Database schema and index created successfully!');
  } catch (err) {
    console.error('Error setting up the database:', err);
  } finally {
    await pool.end();
  }
}

setupDatabase();
