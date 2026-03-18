#!/usr/bin/env node

/**
 * Database connection test script
 * Tests PostgreSQL and Redis connections
 */

const { Client } = require('pg');
const redis = require('redis');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/waterlogging_platform';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function testPostgreSQL() {
  console.log('Testing PostgreSQL connection...');
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✓ PostgreSQL connected successfully');

    // Test PostGIS
    const postgisResult = await client.query('SELECT PostGIS_Version()');
    console.log(`✓ PostGIS version: ${postgisResult.rows[0].postgis_version}`);

    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`✓ Tables found: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check spatial indexes
    const indexResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'waterlogging_reports' 
        AND indexname LIKE '%location%'
    `);
    
    console.log(`✓ Spatial indexes: ${indexResult.rows.length}`);
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    return true;
  } catch (error) {
    console.error('✗ PostgreSQL connection failed:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

async function testRedis() {
  console.log('\nTesting Redis connection...');
  
  const client = redis.createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Redis connected successfully');

    // Test ping
    const pong = await client.ping();
    console.log(`✓ Redis ping: ${pong}`);

    // Test set/get
    await client.set('test_key', 'test_value', { EX: 10 });
    const value = await client.get('test_key');
    console.log(`✓ Redis set/get: ${value === 'test_value' ? 'working' : 'failed'}`);

    // Clean up
    await client.del('test_key');

    return true;
  } catch (error) {
    console.error('✗ Redis connection failed:', error.message);
    return false;
  } finally {
    await client.quit();
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('Database Connection Test');
  console.log('='.repeat(50));
  console.log();

  const postgresOk = await testPostgreSQL();
  const redisOk = await testRedis();

  console.log();
  console.log('='.repeat(50));
  console.log('Test Summary');
  console.log('='.repeat(50));
  console.log(`PostgreSQL: ${postgresOk ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Redis:      ${redisOk ? '✓ PASS' : '✗ FAIL'}`);
  console.log();

  if (postgresOk && redisOk) {
    console.log('✓ All database connections working!');
    process.exit(0);
  } else {
    console.log('✗ Some database connections failed');
    console.log('\nTroubleshooting:');
    if (!postgresOk) {
      console.log('  PostgreSQL:');
      console.log('    - Check Docker is running: docker ps');
      console.log('    - Start database: npm run db:up');
      console.log('    - Run migrations: npm run db:migrate');
    }
    if (!redisOk) {
      console.log('  Redis:');
      console.log('    - Check Docker is running: docker ps');
      console.log('    - Start Redis: npm run db:up');
    }
    process.exit(1);
  }
}

runTests();
