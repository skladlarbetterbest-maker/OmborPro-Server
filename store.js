/**
 * Store — PostgreSQL ga asoslangan ma'lumotlar bazasi
 */
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function uid(prefix = '') {
  return prefix + '_' + uuidv4().slice(0, 8).toUpperCase();
}

function clean(val) {
  return String(val || '').replace(/\s+/g, ' ').trim();
}

function dateUz(d) {
  d = d || new Date();
  return d.toLocaleDateString('uz-UZ');
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      login VARCHAR(100) PRIMARY KEY,
      pass VARCHAR(255),
      telegram_id VARCHAR(50),
      block VARCHAR(1) DEFAULT 'E',
      active BOOLEAN DEFAULT true,
      role VARCHAR(20) DEFAULT 'free',
      obyekt VARCHAR(100) DEFAULT 'Barchasi',
      ombor VARCHAR(100) DEFAULT 'Barchasi',
      can_edit_jurnal BOOLEAN DEFAULT true,
      can_delete_jurnal BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS jurnal (
      id VARCHAR(50) PRIMARY KEY,
      sana VARCHAR(20),
      tur VARCHAR(10),
      mahsulot VARCHAR(255),
      miqdor DECIMAL(15,2),
      narx DECIMAL(15,2),
      summa DECIMAL(15,2),
      tomon VARCHAR(255),
      obyekt VARCHAR(100),
      izoh TEXT,
      operator VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS history (
      id VARCHAR(50) PRIMARY KEY,
      action VARCHAR(20),
      source_id VARCHAR(50),
      sana VARCHAR(20),
      tur VARCHAR(10),
      mahsulot VARCHAR(255),
      miqdor DECIMAL(15,2),
      narx DECIMAL(15,2),
      summa DECIMAL(15,2),
      tomon VARCHAR(255),
      obyekt VARCHAR(100),
      izoh TEXT,
      operator VARCHAR(100),
      changed_by VARCHAR(100),
      timestamp TIMESTAMP DEFAULT NOW(),
      changed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS katalog (
      id VARCHAR(50) PRIMARY KEY,
      nom VARCHAR(255) UNIQUE,
      olv VARCHAR(50),
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE TABLE IF NOT EXISTS obyektlar (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE)`);
  await query(`CREATE TABLE IF NOT EXISTS omborlar (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE)`);
  await query(`
    CREATE TABLE IF NOT EXISTS firms (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      address TEXT,
      inn VARCHAR(50),
      note TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value TEXT)`);
  await query(`
    CREATE TABLE IF NOT EXISTS inv_links (
      id VARCHAR(50) PRIMARY KEY,
      token VARCHAR(100) UNIQUE,
      obyekt VARCHAR(100),
      operator VARCHAR(100),
      status VARCHAR(20) DEFAULT 'jarayonda',
      sana VARCHAR(20),
      vaqt VARCHAR(20),
      diffs JSONB,
      yakunlangan_vaqt VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id VARCHAR(50) PRIMARY KEY,
      sana VARCHAR(20),
      kimdan VARCHAR(100),
      kimga VARCHAR(100),
      mahsulot VARCHAR(255),
      miqdor DECIMAL(15,2),
      operator VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS inventarizatsiya (
      id VARCHAR(50) PRIMARY KEY,
      sana VARCHAR(20),
      obyekt VARCHAR(100),
      operator VARCHAR(100),
      data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS min_stock (
      product_name VARCHAR(255) PRIMARY KEY,
      min_qty DECIMAL(15,2),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS debtors (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      summa DECIMAL(15,2),
      izoh TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS creditors (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      summa DECIMAL(15,2),
      izoh TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(50) PRIMARY KEY,
      sana VARCHAR(20),
      tur VARCHAR(20),
      name VARCHAR(255),
      summa DECIMAL(15,2),
      izoh TEXT,
      operator VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const users = await query('SELECT * FROM users WHERE login = $1', ['jamoliddin']);
  if (users.rows.length === 0) {
    await query(`
      INSERT INTO users (login, pass, block, active, role, obyekt, ombor, can_edit_jurnal, can_delete_jurnal)
      VALUES ('jamoliddin', '122', 'E', true, 'admin', 'Barchasi', 'Barchasi', true, true)
    `);
  }

  const obyektlar = await query("SELECT * FROM obyektlar WHERE name = 'Barchasi'");
  if (obyektlar.rows.length === 0) {
    await query("INSERT INTO obyektlar (name) VALUES ('Barchasi')");
  }

  const omborlar = await query("SELECT * FROM omborlar WHERE name = 'Barchasi'");
  if (omborlar.rows.length === 0) {
    await query("INSERT INTO omborlar (name) VALUES ('Barchasi')");
  }
}

initTables().catch(console.error);

async function readData(fileName) {
  return null;
}

async function writeData(fileName, data) {
  return true;
}

// Users
async function getUsers() {
  const res = await query('SELECT * FROM users');
  const users = {};
  res.rows.forEach(u => { users[u.login] = u; });
  return users;
}

async function getUser(login) {
  const res = await query('SELECT * FROM users WHERE login = $1', [login]);
  return res.rows[0] || null;
}

async function upsertUser(login, userData) {
  const existing = await getUser(login) || {};
  const pass = userData.pass !== undefined ? userData.pass : existing.pass;
  const telegram_id = userData.telegram_id !== undefined ? userData.telegram_id : existing.telegram_id;
  const block = userData.block !== undefined ? userData.block : (existing.block || 'E');
  const active = userData.active !== undefined ? userData.active : (existing.active ?? true);
  const role = userData.role !== undefined ? userData.role : (existing.role || 'free');
  const obyekt = userData.obyekt !== undefined ? userData.obyekt : (existing.obyekt || 'Barchasi');
  const ombor = userData.ombor !== undefined ? userData.ombor : (existing.ombor || 'Barchasi');
  const can_edit_jurnal = userData.can_edit_jurnal !== undefined ? userData.can_edit_jurnal : (existing.can_edit_jurnal ?? false);
  const can_delete_jurnal = userData.can_delete_jurnal !== undefined ? userData.can_delete_jurnal : (existing.can_delete_jurnal ?? false);

  const res = await query(`
    INSERT INTO users (login, pass, telegram_id, block, active, role, obyekt, ombor, can_edit_jurnal, can_delete_jurnal, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (login) DO UPDATE SET
      pass = EXCLUDED.pass,
      telegram_id = EXCLUDED.telegram_id,
      block = EXCLUDED.block,
      active = EXCLUDED.active,
      role = EXCLUDED.role,
      obyekt = EXCLUDED.obyekt,
      ombor = EXCLUDED.ombor,
      can_edit_jurnal = EXCLUDED.can_edit_jurnal,
      can_delete_jurnal = EXCLUDED.can_delete_jurnal,
      updated_at = NOW()
    RETURNING *
  `, [login, pass || '', telegram_id || '', block, active, role, obyekt, ombor, can_edit_jurnal, can_delete_jurnal]);
  return res.rows[0];
}

async function deleteUser(login) {
  await query('DELETE FROM users WHERE login = $1', [login]);
}

// Jurnal
async function getJurnal() {
  const res = await query('SELECT * FROM jurnal ORDER BY created_at DESC');
  return res.rows;
}

async function addJurnalEntry(entry) {
  const id = uid('JRN');
  const { sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator } = entry;
  const res = await query(`
    INSERT INTO jurnal (id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    RETURNING *
  `, [id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator]);
  return res.rows[0];
}

async function updateJurnalEntry(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const res = await query(`UPDATE jurnal SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return res.rows[0];
}

async function deleteJurnalEntry(id) {
  const res = await query('DELETE FROM jurnal WHERE id = $1 RETURNING *', [id]);
  return res.rows[0];
}

// History
async function getHistory() {
  const res = await query('SELECT * FROM history ORDER BY timestamp DESC');
  return res.rows;
}

async function addHistoryEntry(entry) {
  const id = uid('HIS');
  const { sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator, action, editedBy, deletedBy, newValues } = entry;
  const res = await query(`
    INSERT INTO history (id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator, action, editedby, deletedby, newvalues, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    RETURNING *
  `, [id, sana, tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh, operator, action, editedBy, deletedBy, newValues ? JSON.stringify(newValues) : null]);
  return res.rows[0];
}

// Katalog
async function getKatalog() {
  const res = await query('SELECT * FROM katalog WHERE active = true ORDER BY nom');
  return res.rows;
}

async function upsertProduct(name, unit, oldNom) {
  const id = uid('PRD');
  const normalized = clean(name).toLowerCase();
  
  if (oldNom) {
    const oldNormalized = clean(oldNom).toLowerCase();
    const res = await query(`
      UPDATE katalog SET nom = $1, olv = $2, updated_at = NOW()
      WHERE LOWER(nom) = $3 RETURNING *
    `, [clean(name), clean(unit || ''), oldNormalized]);
    if (res.rows[0]) return res.rows[0];
  }
  
  const res = await query(`
    INSERT INTO katalog (id, nom, olv, active, created_at)
    VALUES ($1, $2, $3, true, NOW())
    ON CONFLICT (nom) DO UPDATE SET
      olv = COALESCE($3, katalog.olv),
      updated_at = NOW()
    RETURNING *
  `, [id, clean(name), clean(unit || '')]);
  return res.rows[0];
}

async function deleteProduct(name) {
  await query('UPDATE katalog SET active = false WHERE LOWER(nom) = LOWER($1)', [name]);
}

// Obyektlar
async function getObyektlar() {
  const res = await query('SELECT name FROM obyektlar ORDER BY id');
  return res.rows.map(r => r.name);
}

async function addObyekt(name) {
  await query('INSERT INTO obyektlar (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  return await getObyektlar();
}

async function removeObyekt(name) {
  await query('DELETE FROM obyektlar WHERE name = $1', [name]);
  return await getObyektlar();
}

// Omborlar
async function getOmborlar() {
  const res = await query('SELECT name FROM omborlar ORDER BY id');
  return res.rows.map(r => r.name);
}

async function addOmbor(name) {
  await query('INSERT INTO omborlar (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  return await getOmborlar();
}

async function removeOmbor(name) {
  await query('DELETE FROM omborlar WHERE name = $1', [name]);
  return getOmborlar();
}

// Firms
async function getFirms() {
  const res = await query('SELECT * FROM firms WHERE active = true ORDER BY name');
  return res.rows;
}

async function upsertFirm(name, data) {
  const id = uid('FRM');
  const { phone, address, inn, note, oldName } = data || {};
  
  if (oldName) {
    const res = await query(`
      UPDATE firms SET name = $1, phone = COALESCE($2, phone), address = COALESCE($3, address),
      inn = COALESCE($4, inn), note = COALESCE($5, note), updated_at = NOW()
      WHERE LOWER(name) = LOWER($6) RETURNING *
    `, [clean(name), phone, address, inn, note, oldName]);
    if (res.rows[0]) return res.rows[0];
  }
  
  const res = await query(`
    INSERT INTO firms (id, name, phone, address, inn, note, active, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
    ON CONFLICT (name) DO UPDATE SET
      phone = COALESCE($3, firms.phone),
      address = COALESCE($4, firms.address),
      inn = COALESCE($5, firms.inn),
      note = COALESCE($6, firms.note),
      updated_at = NOW()
    RETURNING *
  `, [id, clean(name), phone || '', address || '', inn || '', note || '']);
  return res.rows[0];
}

async function deleteFirm(name) {
  await query('UPDATE firms SET active = false WHERE LOWER(name) = LOWER($1)', [name]);
}

// Settings
async function getSettings() {
  const res = await query('SELECT * FROM settings');
  const settings = {};
  res.rows.forEach(s => { settings[s.key] = s.value; });
  return settings;
}

async function updateSetting(key, value) {
  await query(`
    INSERT INTO settings (key, value) VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = $2
  `, [key, value]);
  return { [key]: value };
}

// Transfers
async function getTransfers() {
  const res = await query('SELECT * FROM transfers ORDER BY created_at DESC');
  return res.rows;
}

async function addTransfer(transfer) {
  const id = uid('TRF');
  const { sana, kimdan, kimga, mahsulot, miqdor, operator } = transfer;
  const res = await query(`
    INSERT INTO transfers (id, sana, kimdan, kimga, mahsulot, miqdor, operator, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `, [id, sana || dateUz(), kimdan, kimga, mahsulot, miqdor, operator]);
  return res.rows[0];
}

// Inventarizatsiya
async function getInventarizatsiya() {
  const res = await query('SELECT * FROM inventarizatsiya ORDER BY created_at DESC');
  return res.rows;
}

async function addInventarizatsiya(entry) {
  const id = uid('INV');
  const { sana, obyekt, operator, data } = entry;
  const res = await query(`
    INSERT INTO inventarizatsiya (id, sana, obyekt, operator, data, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `, [id, sana || dateUz(), obyekt, operator, JSON.stringify(data)]);
  return res.rows[0];
}

async function deleteInventarizatsiya(id) {
  const res = await query('DELETE FROM inventarizatsiya WHERE id = $1 RETURNING *', [id]);
  return res.rows[0];
}

// Min Stock
async function getMinStock() {
  const res = await query('SELECT * FROM min_stock');
  const data = {};
  res.rows.forEach(r => { data[r.product_name] = r.min_qty; });
  return data;
}

async function setMinStock(productName, minQty) {
  await query(`
    INSERT INTO min_stock (product_name, min_qty, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (product_name) DO UPDATE SET min_qty = $2, updated_at = NOW()
  `, [productName, minQty]);
  return { [productName]: minQty };
}

// Debtors
async function getDebtors() {
  const res = await query('SELECT * FROM debtors ORDER BY created_at DESC');
  return res.rows;
}

async function addDebtor(entry) {
  const id = uid('DBT');
  const { name, phone, address, summa, izoh } = entry;
  const res = await query(`
    INSERT INTO debtors (id, name, phone, address, summa, izoh, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `, [id, name, phone, address, summa, izoh]);
  return res.rows[0];
}

async function updateDebtor(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }
  fields.push('updated_at = NOW()');
  values.push(id);
  const res = await query(`UPDATE debtors SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return res.rows[0];
}

// Creditors
async function getCreditors() {
  const res = await query('SELECT * FROM creditors ORDER BY created_at DESC');
  return res.rows;
}

async function addCreditor(entry) {
  const id = uid('CRD');
  const { name, phone, address, summa, izoh } = entry;
  const res = await query(`
    INSERT INTO creditors (id, name, phone, address, summa, izoh, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `, [id, name, phone, address, summa, izoh]);
  return res.rows[0];
}

async function updateCreditor(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }
  fields.push('updated_at = NOW()');
  values.push(id);
  const res = await query(`UPDATE creditors SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return res.rows[0];
}

// Payments
async function getPayments() {
  const res = await query('SELECT * FROM payments ORDER BY created_at DESC');
  return res.rows;
}

async function addPayment(entry) {
  const id = uid('PAY');
  const { sana, tur, name, summa, izoh, operator } = entry;
  const res = await query(`
    INSERT INTO payments (id, sana, tur, name, summa, izoh, operator, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `, [id, sana || dateUz(), tur, name, summa, izoh, operator]);
  return res.rows[0];
}

// Qoldiq hisoblash
async function computeQoldiq(jurnal, obyektFilter) {
  const q = {};
  jurnal.forEach(r => {
    const n = clean(r.mahsulot);
    if (!n) return;
    const rowObyekt = clean(r.obyekt) || 'Barchasi';
    if (obyektFilter && obyektFilter !== 'Barchasi' && rowObyekt !== obyektFilter) return;
    if (!q[n]) q[n] = { kirim: 0, chiqim: 0, qoldiq: 0, kirimSumma: 0, chiqimSumma: 0, narx: 0 };
    const m = Number(r.miqdor) || 0;
    const s = Number(r.summa) || 0;
    if (r.tur === 'Kirim') {
      q[n].kirim += m;
      q[n].kirimSumma += s;
      q[n].qoldiq += m;
    } else {
      q[n].chiqim += m;
      q[n].chiqimSumma += s;
      q[n].qoldiq -= m;
    }
  });
  Object.keys(q).forEach(nom => {
    const data = q[nom];
    const productEntries = jurnal.filter(r => clean(r.mahsulot) === nom && r.tur === 'Kirim');
    let remaining = data.qoldiq;
    let totalCost = 0;
    for (const entry of productEntries) {
      if (remaining <= 0.0001) break;
      const m = Number(entry.miqdor) || 0;
      const s = Number(entry.summa) || 0;
      if (m > 0) {
        const take = Math.min(m, remaining);
        totalCost += take * (s / m);
        remaining -= take;
      }
    }
    data.narx = remaining <= 0.0001 && data.qoldiq > 0 ? Math.round(totalCost / data.qoldiq) : 0;
  });
  return q;
}

// FIFO
async function calculateFifo(mahsulot, obyekt, requestedMiqdor) {
  const jurnal = await getJurnal();
  const pName = clean(mahsulot);
  const pObyekt = clean(obyekt) || 'Barchasi';
  const productJournal = jurnal.filter(r => clean(r.mahsulot) === pName && clean(r.obyekt) === pObyekt);
  const kirims = productJournal.filter(r => r.tur === 'Kirim');
  const chiqims = productJournal.filter(r => r.tur === 'Chiqim');
  let totalChiqim = chiqims.reduce((sum, r) => sum + (Number(r.miqdor) || 0), 0);
  let chunks = [];
  let remainingToFulfill = Number(requestedMiqdor);
  for (let k of kirims) {
    if (remainingToFulfill <= 0.0001) break;
    let kMiqdor = Number(k.miqdor) || 0;
    if (totalChiqim >= kMiqdor) {
      totalChiqim -= kMiqdor;
      continue;
    }
    let availableHere = kMiqdor - totalChiqim;
    totalChiqim = 0;
    let take = Math.min(availableHere, remainingToFulfill);
    let narx = Number(k.narx) || 0;
    chunks.push({ miqdor: take, narx });
    remainingToFulfill -= take;
  }
  if (remainingToFulfill > 0.0001) {
    const qObj = await computeQoldiq(jurnal, pObyekt);
    const mavjud = qObj[pName]?.qoldiq || 0;
    throw new Error(`Yetarli qoldiq yo'q. Mahsulot: ${pName}, So'ralgan: ${requestedMiqdor}, Mavjud: ${mavjud}`);
  }
  return chunks;
}

// Inv Links
async function getInvLinks() {
  const res = await query('SELECT * FROM inv_links ORDER BY created_at DESC');
  return res.rows;
}

async function getInvLinkByToken(token) {
  const res = await query('SELECT * FROM inv_links WHERE token = $1', [token]);
  return res.rows[0] || null;
}

async function addInvLink(token, obyekt, operator) {
  const id = uid();
  const res = await query(`
    INSERT INTO inv_links (id, token, obyekt, operator, status, sana, vaqt, diffs, created_at)
    VALUES ($1, $2, $3, $4, 'jarayonda', $5, $6, '[]', NOW())
    RETURNING *
  `, [id, token, obyekt, operator, new Date().toLocaleDateString('uz-UZ'), new Date().toLocaleTimeString('uz-UZ')]);
  return res.rows[0];
}

async function updateInvLink(token, status, diffs) {
  const res = await query(`
    UPDATE inv_links SET status = $1, diffs = $2, yakunlangan_vaqt = $3
    WHERE token = $4 RETURNING *
  `, [status, JSON.stringify(diffs || []), new Date().toLocaleTimeString('uz-UZ'), token]);
  return res.rows[0];
}

async function deleteHistoryEntry(id) {
  await query('DELETE FROM history WHERE id = $1', [id]);
}

module.exports = {
  readData, writeData, uid, clean, dateUz,
  getUsers, getUser, upsertUser, deleteUser,
  getJurnal, addJurnalEntry, updateJurnalEntry, deleteJurnalEntry,
  getHistory, addHistoryEntry, deleteHistoryEntry,
  getKatalog, upsertProduct, deleteProduct,
  getObyektlar, addObyekt, removeObyekt,
  getOmborlar, addOmbor, removeOmbor,
  getFirms, upsertFirm, deleteFirm,
  getSettings, updateSetting,
  getTransfers, addTransfer,
  getInventarizatsiya, addInventarizatsiya, deleteInventarizatsiya,
  getInvLinks, getInvLinkByToken, addInvLink, updateInvLink,
  getMinStock, setMinStock,
  getDebtors, addDebtor, updateDebtor,
  getCreditors, addCreditor, updateCreditor,
  getPayments, addPayment,
  computeQoldiq, calculateFifo
};
