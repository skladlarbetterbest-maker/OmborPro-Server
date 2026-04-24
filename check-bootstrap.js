const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

async function checkBootstrap() {
  try {
    // 1. Jamoliddin user ma'lumotlari
    const userRes = await pool.query('SELECT * FROM users WHERE login = $1', ['jamoliddin']);
    console.log('👤 Jamoliddin user:');
    console.log('Role:', userRes.rows[0].role);
    console.log('Obyekt:', userRes.rows[0].obyekt);
    console.log('Obyekt type:', typeof userRes.rows[0].obyekt);

    // 2. Barcha obyektlar
    const obyektlarRes = await pool.query('SELECT name FROM obyektlar ORDER BY id');
    console.log('\n📋 Barcha obyektlar (database):');
    console.log(obyektlarRes.rows.map(r => r.name));

    // 3. Filtrlash logikasi (bootstrap.js dagi kabi)
    const userRole = userRes.rows[0].role;
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    const allowedObyekt = userRes.rows[0].obyekt;

    let obyektlar = obyektlarRes.rows.map(r => r.name);
    console.log('\n🔍 Filtrlashdan oldin:', obyektlar);
    console.log('isAdmin:', isAdmin);
    console.log('allowedObyekt:', allowedObyekt);

    if (!isAdmin && allowedObyekt !== 'Barchasi') {
      obyektlar = obyektlar.filter(o => o === allowedObyekt || o === 'Barchasi');
      console.log('Filtrlashdan keyin (admin emas):', obyektlar);
    } else {
      console.log('Filtrlashdan keyin (admin/owner):', obyektlar);
    }
  } catch (err) {
    console.error('Xato:', err.message);
  } finally {
    await pool.end();
  }
}

checkBootstrap();