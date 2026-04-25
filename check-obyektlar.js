const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

async function checkObyektlar() {
  try {
    const res = await pool.query('SELECT * FROM obyektlar');
    console.log('📋 Obyektlar jadvali:');
    console.table(res.rows);

    console.log('\n🔍 Barchasi:');
    res.rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: "${row.name}"`);
    });
  } catch (err) {
    console.error('Xato:', err.message);
  } finally {
    await pool.end();
  }
}

checkObyektlar();