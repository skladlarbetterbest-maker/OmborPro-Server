const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

async function addTelegramColumn() {
  try {
    // Avval column bor-yo'qligini tekshirish
    const checkRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'firms' AND column_name = 'telegram'
    `);

    if (checkRes.rows.length > 0) {
      console.log('✅ "telegram" column allaqachon bor!');
      return;
    }

    // Column qo'shish
    await pool.query(`ALTER TABLE firms ADD COLUMN telegram VARCHAR(100)`);
    console.log('✅ "telegram" column muvaffaqiyatli qo\'shildi!');
  } catch (err) {
    console.error('❌ Xato:', err.message);
  } finally {
    await pool.end();
  }
}

addTelegramColumn();