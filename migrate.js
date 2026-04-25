const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// DB ulanish (store.js dagi bilan bir xil)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

const dataDir = path.join(__dirname, 'data');

async function migrate() {
  console.log('🚀 Migratsiya boshlandi...');

  try {
    // 1. Users
    const usersData = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
    for (const login in usersData) {
      const u = usersData[login];
      await pool.query(`
        INSERT INTO users (login, pass, telegram_id, block, active, role, obyekt, ombor, can_edit_jurnal, can_delete_jurnal)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (login) DO NOTHING
      `, [login, u.pass, u.telegram_id, u.block, u.active, u.role, u.obyekt, u.ombor, u.can_edit_jurnal, u.can_delete_jurnal]);
    }
    console.log('✅ Users ko\'chirildi');

    // 2. Katalog
    const katalogData = JSON.parse(fs.readFileSync(path.join(dataDir, 'katalog.json'), 'utf8'));
    for (const p of katalogData) {
      const id = p.id || 'PRD_' + uuidv4().slice(0, 8).toUpperCase();
      await pool.query(`
        INSERT INTO katalog (id, nom, olv, active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (nom) DO NOTHING
      `, [id, p.nom, p.olv, p.active ?? true]);
    }
    console.log('✅ Katalog ko\'chirildi');

    // 3. Jurnal
    const jurnalData = JSON.parse(fs.readFileSync(path.join(dataDir, 'jurnal.json'), 'utf8'));
    for (const entry of jurnalData) {
      await pool.query(`
        INSERT INTO jurnal (id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [entry.id, entry.sana, entry.tur, entry.mahsulot, entry.miqdor, entry.narx, entry.summa, entry.tomon, entry.obyekt, entry.izoh, entry.operator]);
    }
    console.log('✅ Jurnal ko\'chirildi');

    // 4. History
    const historyData = JSON.parse(fs.readFileSync(path.join(dataDir, 'history.json'), 'utf8'));
    for (const entry of historyData) {
      await pool.query(`
        INSERT INTO history (id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator, action, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [entry.id, entry.sana, entry.tur, entry.mahsulot, entry.miqdor, entry.narx, entry.summa, entry.tomon, entry.obyekt, entry.izoh, entry.operator, entry.action, entry.timestamp || new Date()]);
    }
    console.log('✅ History ko\'chirildi');

    // 5. Obyektlar
    const obyektData = JSON.parse(fs.readFileSync(path.join(dataDir, 'obyektlar.json'), 'utf8'));
    for (const name of obyektData) {
      await pool.query('INSERT INTO obyektlar (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }
    console.log('✅ Obyektlar ko\'chirildi');

    // 6. Omborlar
    const omborData = JSON.parse(fs.readFileSync(path.join(dataDir, 'omborlar.json'), 'utf8'));
    for (const name of omborData) {
      await pool.query('INSERT INTO omborlar (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }
    console.log('✅ Omborlar ko\'chirildi');

    // 7. Firms
    const firmsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'firms.json'), 'utf8'));
    for (const f of firmsData) {
      const id = f.id || 'FRM_' + uuidv4().slice(0, 8).toUpperCase();
      await pool.query(`
        INSERT INTO firms (id, name, phone, address, inn, note, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (name) DO NOTHING
      `, [id, f.name, f.phone, f.address, f.inn, f.note, f.active ?? true]);
    }
    console.log('✅ Firmalar ko\'chirildi');

    // 8. Settings
    const settingsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'));
    for (const key in settingsData) {
      await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, settingsData[key]]);
    }
    console.log('✅ Sozlamalar ko\'chirildi');

    // 9. Transfers
    const transfersData = JSON.parse(fs.readFileSync(path.join(dataDir, 'transfers.json'), 'utf8'));
    if (Array.isArray(transfersData)) {
      for (const t of transfersData) {
        await pool.query(`
          INSERT INTO transfers (id, sana, kimdan, kimga, mahsulot, miqdor, operator)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [t.id, t.sana, t.kimdan, t.kimga, t.mahsulot, t.miqdor, t.operator]);
      }
    }
    console.log('✅ Transferlar ko\'chirildi');

    // 10. Inventarizatsiya
    const invData = JSON.parse(fs.readFileSync(path.join(dataDir, 'inventarizatsiya.json'), 'utf8'));
    for (const entry of invData) {
      await pool.query(`
        INSERT INTO inventarizatsiya (id, sana, obyekt, operator, data)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [entry.id, entry.sana, entry.obyekt, entry.operator, JSON.stringify(entry.data)]);
    }
    console.log('✅ Inventarizatsiya ko\'chirildi');

    // 11. Min Stock
    const minStockData = JSON.parse(fs.readFileSync(path.join(dataDir, 'minStock.json'), 'utf8'));
    for (const name in minStockData) {
      await pool.query(`
        INSERT INTO min_stock (product_name, min_qty)
        VALUES ($1, $2)
        ON CONFLICT (product_name) DO UPDATE SET min_qty = $2
      `, [name, minStockData[name]]);
    }
    console.log('✅ Min Stock ko\'chirildi');

    // 12. Debtors
    const debtorsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'debtors.json'), 'utf8'));
    if (Array.isArray(debtorsData)) {
      for (const d of debtorsData) {
        await pool.query(`
          INSERT INTO debtors (id, name, phone, address, summa, izoh)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [d.id, d.name, d.phone, d.address, d.summa, d.izoh]);
      }
    }
    console.log('✅ Debitorlar ko\'chirildi');

    // 13. Creditors
    const creditorsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'creditors.json'), 'utf8'));
    if (Array.isArray(creditorsData)) {
      for (const c of creditorsData) {
        await pool.query(`
          INSERT INTO creditors (id, name, phone, address, summa, izoh)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [c.id, c.name, c.phone, c.address, c.summa, c.izoh]);
      }
    }
    console.log('✅ Kreditorlar ko\'chirildi');

    // 14. Payments
    const paymentsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'payments.json'), 'utf8'));
    if (Array.isArray(paymentsData)) {
      for (const p of paymentsData) {
        await pool.query(`
          INSERT INTO payments (id, sana, tur, name, summa, izoh, operator)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [p.id, p.sana, p.tur, p.name, p.summa, p.izoh, p.operator]);
      }
    }
    console.log('✅ To\'lovlar ko\'chirildi');

    // 15. Inv Links
    const invLinksData = JSON.parse(fs.readFileSync(path.join(dataDir, 'inv-links.json'), 'utf8'));
    for (const link of invLinksData) {
      await pool.query(`
        INSERT INTO inv_links (id, token, obyekt, operator, status, sana, vaqt, diffs, yakunlangan_vaqt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (token) DO NOTHING
      `, [link.id, link.token, link.obyekt, link.operator, link.status, link.sana, link.vaqt, JSON.stringify(link.diffs || []), link.yakunlanganVaqt]);
    }
    console.log('✅ Inventarizatsiya linklari ko\'chirildi');

    console.log('🎉 MIGRATSIYA MUVAFFAQIYATLI YAKUNLANDI!');
  } catch (err) {
    console.error('❌ Xatolik yuz berdi:', err);
  } finally {
    await pool.end();
  }
}

migrate();
