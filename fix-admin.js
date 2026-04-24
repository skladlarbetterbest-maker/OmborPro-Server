const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

async function fixAdmin() {
  try {
    // Avval jamoliddin userining hozirgi rolini ko'rish
    const checkRes = await pool.query('SELECT login, role, active FROM users WHERE login = $1', ['jamoliddin']);
    console.log('Hozirgi ma\'lumot:', checkRes.rows[0] || 'User topilmadi');

    // Rolini 'owner' qilib o'zgartirish
    const updateRes = await pool.query('UPDATE users SET role = $1 WHERE login = $2 RETURNING login, role', ['owner', 'jamoliddin']);
    console.log('Yangilangan ma\'lumot:', updateRes.rows[0]);

    console.log('✅ Jamoliddin roli muvaffaqiyatli "owner" qilib o\'zgartirildi!');
  } catch (err) {
    console.error('Xato:', err.message);
  } finally {
    await pool.end();
  }
}

fixAdmin();