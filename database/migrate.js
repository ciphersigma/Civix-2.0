#!/usr/bin/env node

/**
 * Database migration script
 * Runs all SQL schema files in order to set up the database
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/waterlogging_platform';

const SCHEMA_DIR = path.join(__dirname, 'schema');
const SCHEMA_FILES = [
  '00_init.sql',
  '01_users.sql',
  '02_waterlogging_reports.sql',
  '03_notifications.sql',
  '04_admin_users.sql',
  '05_firebase_uid.sql',
  '06_feedback.sql',
  '07_api_keys.sql',
  '08_weather_alerts.sql'
];

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    for (const file of SCHEMA_FILES) {
      const filePath = path.join(SCHEMA_DIR, file);
      console.log(`Running migration: ${file}`);
      
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      
      console.log(`✓ ${file} completed\n`);
    }

    console.log('All migrations completed successfully!');
    
    // Verify PostGIS installation
    const result = await client.query('SELECT PostGIS_Version()');
    console.log(`\nPostGIS version: ${result.rows[0].postgis_version}`);

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
