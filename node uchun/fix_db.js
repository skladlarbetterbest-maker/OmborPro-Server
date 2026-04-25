const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

async function fix() {
  const client = await pool.connect();
  try {
    console.log('Bazani yangilash 2 boshlandi...');
    
    await client.query(`
      ALTER TABLE history ADD COLUMN IF NOT EXISTS deletedby VARCHAR(50);
      ALTER TABLE history ADD COLUMN IF NOT EXISTS newvalues JSONB;
    `);
    
    console.log('✅ Ustunlar muvaffaqiyatli qo\'shildi!');
  } catch (e) {
    console.error('❌ Xato yuz berdi:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
