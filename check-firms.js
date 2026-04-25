const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

async function checkFirms() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'firms'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Firms jadvali columns:');
    console.table(res.rows);
  } catch (err) {
    console.error('Xato:', err.message);
  } finally {
    await pool.end();
  }
}

checkFirms();