const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

function uid(prefix = '') {
  return prefix + '_' + uuidv4().slice(0, 8).toUpperCase();
}

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'omborpro',
  password: '0',
  port: 5432
});

const dataDir = path.join(__dirname, 'data');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migration started...');

    // 1. Users
    if (fs.existsSync(path.join(dataDir, 'users.json'))) {
      const usersData = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
      for (const [login, u] of Object.entries(usersData)) {
        await client.query(`
          INSERT INTO users (login, pass, telegram_id, block, active, role, obyekt, ombor, can_edit_jurnal, can_delete_jurnal, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (login) DO NOTHING
        `, [login, u.pass, u.telegramId || '', u.block || 'E', u.active !== false, u.role || 'free', u.obyekt || 'Barchasi', u.ombor || 'Barchasi', u.canEditJurnal !== false, u.canDeleteJurnal !== false, u.createdAt ? new Date(u.createdAt) : new Date(), u.updatedAt ? new Date(u.updatedAt) : new Date()]);
      }
      console.log('Users migrated.');
    }

    // 2. Jurnal
    if (fs.existsSync(path.join(dataDir, 'jurnal.json'))) {
      const jurnalData = JSON.parse(fs.readFileSync(path.join(dataDir, 'jurnal.json'), 'utf8'));
      for (const j of jurnalData) {
        await client.query(`
          INSERT INTO jurnal (id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator, editedby, editedat, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING
        `, [j.id, j.sana, j.tur, j.mahsulot, j.miqdor || 0, j.narx || 0, j.summa || 0, j.tomon || '', j.obyekt || '', j.izoh || '', j.operator || '', j.editedBy || null, j.editedAt ? new Date(j.editedAt) : null, j.createdAt ? new Date(j.createdAt) : new Date()]);
      }
      console.log('Jurnal migrated.');
    }

    // 3. History
    if (fs.existsSync(path.join(dataDir, 'history.json'))) {
      const historyData = JSON.parse(fs.readFileSync(path.join(dataDir, 'history.json'), 'utf8'));
      for (const h of historyData) {
        await client.query(`
          INSERT INTO history (id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator, action, editedby, deletedby, newvalues, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO NOTHING
        `, [h.id, h.sana, h.tur, h.mahsulot, h.miqdor || 0, h.narx || 0, h.summa || 0, h.tomon || '', h.obyekt || '', h.izoh || '', h.operator || '', h.action || '', h.editedBy || null, h.deletedBy || null, h.newValues ? JSON.stringify(h.newValues) : null, h.timestamp ? new Date(h.timestamp) : new Date()]);
      }
      console.log('History migrated.');
    }

    // 4. Katalog
    if (fs.existsSync(path.join(dataDir, 'katalog.json'))) {
      const katalogData = JSON.parse(fs.readFileSync(path.join(dataDir, 'katalog.json'), 'utf8'));
      for (const k of katalogData) {
        await client.query(`
          INSERT INTO katalog (id, nom, olv, active, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (nom) DO NOTHING
        `, [k.id || uid('PRD'), k.nom, k.olv || '', k.active !== false, k.createdAt ? new Date(k.createdAt) : new Date()]);
      }
      console.log('Katalog migrated.');
    }

    // 5. Firms
    if (fs.existsSync(path.join(dataDir, 'firms.json'))) {
      const firmsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'firms.json'), 'utf8'));
      for (const f of firmsData) {
        await client.query(`
          INSERT INTO firms (id, name, phone, address, inn, note, active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (name) DO NOTHING
        `, [f.id || uid('FRM'), f.name, f.phone || '', f.address || '', f.inn || '', f.note || '', f.active !== false, f.createdAt ? new Date(f.createdAt) : new Date()]);
      }
      console.log('Firms migrated.');
    }

    // 6. Obyektlar
    if (fs.existsSync(path.join(dataDir, 'obyektlar.json'))) {
      const obyektlarData = JSON.parse(fs.readFileSync(path.join(dataDir, 'obyektlar.json'), 'utf8'));
      for (const o of obyektlarData) {
        await client.query(`
          INSERT INTO obyektlar (name) VALUES ($1) ON CONFLICT (name) DO NOTHING
        `, [o]);
      }
      console.log('Obyektlar migrated.');
    }

    // 7. Omborlar
    if (fs.existsSync(path.join(dataDir, 'omborlar.json'))) {
      const omborlarData = JSON.parse(fs.readFileSync(path.join(dataDir, 'omborlar.json'), 'utf8'));
      for (const o of omborlarData) {
        await client.query(`
          INSERT INTO omborlar (name) VALUES ($1) ON CONFLICT (name) DO NOTHING
        `, [o]);
      }
      console.log('Omborlar migrated.');
    }

    // 8. Transfers
    if (fs.existsSync(path.join(dataDir, 'transfers.json'))) {
      const transfersData = JSON.parse(fs.readFileSync(path.join(dataDir, 'transfers.json'), 'utf8'));
      for (const t of transfersData) {
        await client.query(`
          INSERT INTO transfers (id, sana, kimdan, kimga, mahsulot, miqdor, operator, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [t.id, t.sana, t.kimdan, t.kimga, t.mahsulot, t.miqdor || 0, t.operator || '', t.createdAt ? new Date(t.createdAt) : new Date()]);
      }
      console.log('Transfers migrated.');
    }

    // 9. Inventarizatsiya
    if (fs.existsSync(path.join(dataDir, 'inventarizatsiya.json'))) {
      const invData = JSON.parse(fs.readFileSync(path.join(dataDir, 'inventarizatsiya.json'), 'utf8'));
      for (const i of invData) {
        await client.query(`
          INSERT INTO inventarizatsiya (id, sana, obyekt, operator, data, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [i.id, i.sana, i.obyekt || '', i.operator || '', JSON.stringify(i.data || i.diffs || []), i.createdAt ? new Date(i.createdAt) : new Date()]);
      }
      console.log('Inventarizatsiya migrated.');
    }

    // 10. Inv Links
    if (fs.existsSync(path.join(dataDir, 'inv-links.json'))) {
      const linksData = JSON.parse(fs.readFileSync(path.join(dataDir, 'inv-links.json'), 'utf8'));
      for (const l of linksData) {
        await client.query(`
          INSERT INTO inv_links (id, token, obyekt, operator, status, sana, vaqt, diffs, yakunlangan_vaqt, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [l.id, l.token, l.obyekt || '', l.operator || '', l.status || '', l.sana || '', l.vaqt || '', JSON.stringify(l.diffs || []), l.yakunlanganVaqt || '', l.createdAt ? new Date(l.createdAt) : new Date()]);
      }
      console.log('Inv Links migrated.');
    }

    // 11. Min Stock
    if (fs.existsSync(path.join(dataDir, 'minStock.json'))) {
      const minStockData = JSON.parse(fs.readFileSync(path.join(dataDir, 'minStock.json'), 'utf8'));
      for (const [name, qty] of Object.entries(minStockData)) {
        await client.query(`
          INSERT INTO min_stock (product_name, min_qty, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (product_name) DO NOTHING
        `, [name, qty]);
      }
      console.log('Min Stock migrated.');
    }

    // 12. Settings
    if (fs.existsSync(path.join(dataDir, 'settings.json'))) {
      const settingsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'));
      for (const [key, value] of Object.entries(settingsData)) {
        await client.query(`
          INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING
        `, [key, String(value)]);
      }
      console.log('Settings migrated.');
    }

    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
