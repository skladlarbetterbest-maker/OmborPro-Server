/**
 * OmborPro Google Apps Script backend
 *
 * 1. Google Apps Script ichida yangi project oching.
 * 2. Shu fayl kodini Code.gs ga joylang.
 * 3. setupProject() ni bir marta run qiling.
 * 4. Project Settings > Script properties:
 *    ADMIN_KEY=strong-secret-key
 *    TELEGRAM_BOT_TOKEN=123456:ABC...   // ixtiyoriy
 *    SPREADSHEET_ID=...                 // ixtiyoriy, bo'sh bo'lsa active spreadsheet ishlaydi
 * 5. Deploy > New deployment > Web app:
 *    Execute as: Me
 *    Who has access: Anyone with the link
 *
 * Frontend POST body misollari:
 * { action: "bootstrap", adminKey: "..." }
 * { action: "addJournalRow", adminKey: "...", tur: "Kirim", sana: "16.04.2026", mahsulot: "Sement M400", firma: "Mega Trade", miqdor: 10, narx: 50000, obyekt: "Obyekt 1", izoh: "", operator: "jamoliddin" }
 * { action: "upsertProduct", adminKey: "...", name: "Sement M400", unit: "qop" }
 * { action: "upsertFirm", adminKey: "...", name: "Mega Trade", phone: "+998..." }
 */

var SHEETS = {
  USERS: 'users',
  PRODUCTS: 'products',
  FIRMS: 'firms',
  JOURNAL: 'jurnal',
  HISTORY: 'history',
  OBJECTS: 'obyektlar',
  WAREHOUSES: 'omborlar',
  SETTINGS: 'settings'
};

var HEADERS = {};
HEADERS[SHEETS.USERS] = ['login', 'password', 'telegramChatId', 'block', 'active', 'role', 'obyekt', 'ombor', 'canEditJurnal', 'canDeleteJurnal', 'createdAt', 'updatedAt'];
HEADERS[SHEETS.PRODUCTS] = ['id', 'name', 'name_normalized', 'unit', 'active', 'createdAt', 'updatedAt'];
HEADERS[SHEETS.FIRMS] = ['id', 'name', 'name_normalized', 'phone', 'note', 'active', 'createdAt', 'updatedAt'];
HEADERS[SHEETS.JOURNAL] = ['id', 'sana', 'tur', 'mahsulotId', 'mahsulot', 'firmaId', 'firma', 'miqdor', 'narx', 'summa', 'obyekt', 'ombor', 'izoh', 'operator', 'createdAt', 'updatedAt'];
HEADERS[SHEETS.HISTORY] = ['id', 'action', 'sourceJournalId', 'sana', 'tur', 'mahsulotId', 'mahsulot', 'firmaId', 'firma', 'miqdor', 'narx', 'summa', 'obyekt', 'ombor', 'izoh', 'operator', 'changedBy', 'changedAt', 'note'];
HEADERS[SHEETS.OBJECTS] = ['id', 'name', 'name_normalized', 'active', 'createdAt', 'updatedAt'];
HEADERS[SHEETS.WAREHOUSES] = ['id', 'name', 'name_normalized', 'active', 'createdAt', 'updatedAt'];
HEADERS[SHEETS.SETTINGS] = ['key', 'value', 'updatedAt'];

function doGet(e) {
  try {
    var action = param_(e, 'action', 'bootstrap');
    if (action === 'health') {
      return json_({ ok: true, app: 'OmborPro', time: new Date().toISOString() });
    }
    if (action === 'bootstrap') {
      ensureAuthorized_(e);
      return json_(bootstrap_());
    }
    return json_({ ok: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonError_(err);
  }
}

function doPost(e) {
  try {
    var body = parseBody_(e);
    ensureAuthorized_(body);

    switch (body.action) {
      case 'bootstrap':
        return json_(bootstrap_());
      case 'upsertProduct':
        return json_({ ok: true, data: upsertProduct_(body) });
      case 'upsertFirm':
        return json_({ ok: true, data: upsertFirm_(body) });
      case 'upsertObject':
        return json_({ ok: true, data: upsertSimpleNamedRow_(SHEETS.OBJECTS, body.name) });
      case 'upsertWarehouse':
        return json_({ ok: true, data: upsertSimpleNamedRow_(SHEETS.WAREHOUSES, body.name) });
      case 'upsertUser':
        return json_({ ok: true, data: upsertUser_(body) });
      case 'addJournalRow':
        return json_({ ok: true, data: addJournalRow_(body) });
      case 'updateJournalRow':
        return json_({ ok: true, data: updateJournalRow_(body) });
      case 'deleteJournalRow':
        return json_({ ok: true, data: deleteJournalRow_(body) });
      case 'restoreHistoryRow':
        return json_({ ok: true, data: restoreHistoryRow_(body) });
      case 'syncTelegramChat':
        return json_({ ok: true, data: syncTelegramChat_(body) });
      default:
        return json_({ ok: false, error: 'Unknown POST action: ' + body.action });
    }
  } catch (err) {
    return jsonError_(err);
  }
}

function setupProject() {
  var ss = spreadsheet_();
  ensureSheet_(ss, SHEETS.USERS, HEADERS[SHEETS.USERS]);
  ensureSheet_(ss, SHEETS.PRODUCTS, HEADERS[SHEETS.PRODUCTS]);
  ensureSheet_(ss, SHEETS.FIRMS, HEADERS[SHEETS.FIRMS]);
  ensureSheet_(ss, SHEETS.JOURNAL, HEADERS[SHEETS.JOURNAL]);
  ensureSheet_(ss, SHEETS.HISTORY, HEADERS[SHEETS.HISTORY]);
  ensureSheet_(ss, SHEETS.OBJECTS, HEADERS[SHEETS.OBJECTS]);
  ensureSheet_(ss, SHEETS.WAREHOUSES, HEADERS[SHEETS.WAREHOUSES]);
  ensureSheet_(ss, SHEETS.SETTINGS, HEADERS[SHEETS.SETTINGS]);

  importLegacyProducts_();
  seedDefaults_();
  setupFormatting_(ss);

  return bootstrap_();
}

function seedDefaults_() {
  upsertSetting_('appName', 'OmborPro');
  upsertSetting_('lang', 'uz');

  upsertSimpleNamedRow_(SHEETS.OBJECTS, 'Barchasi');
  upsertSimpleNamedRow_(SHEETS.OBJECTS, 'Obyekt 1');
  upsertSimpleNamedRow_(SHEETS.OBJECTS, 'Obyekt 2');
  upsertSimpleNamedRow_(SHEETS.OBJECTS, 'Obyekt 3');

  upsertSimpleNamedRow_(SHEETS.WAREHOUSES, 'Barchasi');
  upsertSimpleNamedRow_(SHEETS.WAREHOUSES, 'Ombor 1');
  upsertSimpleNamedRow_(SHEETS.WAREHOUSES, 'Ombor 2');
  upsertSimpleNamedRow_(SHEETS.WAREHOUSES, 'Ombor 3');

  upsertProduct_({ name: 'Mix 70 mm', unit: 'kg' });
  upsertProduct_({ name: 'Mix 100 mm', unit: 'kg' });
  upsertProduct_({ name: 'Mix 120 mm', unit: 'kg' });
  upsertProduct_({ name: 'Armatura 12 talik', unit: 'm' });
  upsertProduct_({ name: 'Armatura 14 talik', unit: 'm' });
  upsertProduct_({ name: 'Sement M400', unit: 'qop' });
  upsertProduct_({ name: 'Sement M500', unit: 'qop' });

  upsertUser_({
    login: 'jamoliddin',
    password: '122',
    role: 'admin',
    active: true,
    obyekt: 'Barchasi',
    ombor: 'Barchasi',
    canEditJurnal: true,
    canDeleteJurnal: true
  });
}

function bootstrap_() {
  importLegacyProducts_();
  var products = activeRows_(SHEETS.PRODUCTS);
  var firms = activeRows_(SHEETS.FIRMS);
  var users = activeRows_(SHEETS.USERS);
  var objects = activeRows_(SHEETS.OBJECTS);
  var warehouses = activeRows_(SHEETS.WAREHOUSES);
  var journal = rows_(SHEETS.JOURNAL);
  var history = rows_(SHEETS.HISTORY);
  var settings = rows_(SHEETS.SETTINGS);

  return {
    ok: true,
    users: users,
    katalog: products.map(function (p) {
      return { id: p.id, nom: p.name, olv: p.unit, active: p.active };
    }),
    firms: firms,
    obyektlar: objects.map(function (o) { return o.name; }),
    omborlar: warehouses.map(function (o) { return o.name; }),
    jurnal: journal,
    history: history,
    settings: settings
  };
}

function importLegacyProducts_() {
  var ss = spreadsheet_();
  var legacy = ss.getSheetByName('MaxsulotNomi');
  if (!legacy) return;

  var lastRow = legacy.getLastRow();
  if (lastRow < 1) return;

  var values = legacy.getRange(1, 1, lastRow, 2).getValues();
  values.forEach(function (row, index) {
    var name = cleanText_(row[0]);
    var unit = cleanText_(row[1]);
    if (!name) return;

    if (index === 0 && normalizeName_(name) === 'maxsulot nomi') return;
    upsertProduct_({ name: name, unit: unit || '' });
  });
}

function upsertProduct_(payload) {
  var name = requiredText_(payload.name, 'name');
  var unit = cleanText_(payload.unit || '');
  var normalized = normalizeName_(name);
  var sheet = sheet_(SHEETS.PRODUCTS);
  var rows = rows_(SHEETS.PRODUCTS);
  var now = new Date().toISOString();
  var match = findByField_(rows, 'name_normalized', normalized);

  if (match) {
    updateRowByNumber_(sheet, match._rowNumber, HEADERS[SHEETS.PRODUCTS], {
      unit: unit || match.unit,
      active: toBoolean_(payload.active, true),
      updatedAt: now
    });
    return getRowByNumber_(SHEETS.PRODUCTS, match._rowNumber);
  }

  var row = {
    id: uid_('PRD'),
    name: name,
    name_normalized: normalized,
    unit: unit,
    active: toBoolean_(payload.active, true),
    createdAt: now,
    updatedAt: now
  };
  appendRow_(sheet, HEADERS[SHEETS.PRODUCTS], row);
  return row;
}

function upsertFirm_(payload) {
  var name = requiredText_(payload.name, 'name');
  var normalized = normalizeName_(name);
  var phone = cleanText_(payload.phone || '');
  var note = cleanText_(payload.note || '');
  var sheet = sheet_(SHEETS.FIRMS);
  var rows = rows_(SHEETS.FIRMS);
  var now = new Date().toISOString();
  var match = findByField_(rows, 'name_normalized', normalized);

  if (match) {
    updateRowByNumber_(sheet, match._rowNumber, HEADERS[SHEETS.FIRMS], {
      phone: phone || match.phone,
      note: note || match.note,
      active: toBoolean_(payload.active, true),
      updatedAt: now
    });
    return getRowByNumber_(SHEETS.FIRMS, match._rowNumber);
  }

  var row = {
    id: uid_('FRM'),
    name: name,
    name_normalized: normalized,
    phone: phone,
    note: note,
    active: toBoolean_(payload.active, true),
    createdAt: now,
    updatedAt: now
  };
  appendRow_(sheet, HEADERS[SHEETS.FIRMS], row);
  return row;
}

function upsertSimpleNamedRow_(sheetName, name) {
  var cleanName = requiredText_(name, 'name');
  var normalized = normalizeName_(cleanName);
  var sheet = sheet_(sheetName);
  var rows = rows_(sheetName);
  var now = new Date().toISOString();
  var match = findByField_(rows, 'name_normalized', normalized);

  if (match) {
    updateRowByNumber_(sheet, match._rowNumber, HEADERS[sheetName], { active: true, updatedAt: now });
    return getRowByNumber_(sheetName, match._rowNumber);
  }

  var row = {
    id: uid_(sheetName === SHEETS.OBJECTS ? 'OBJ' : 'WH'),
    name: cleanName,
    name_normalized: normalized,
    active: true,
    createdAt: now,
    updatedAt: now
  };
  appendRow_(sheet, HEADERS[sheetName], row);
  return row;
}

function upsertUser_(payload) {
  var login = requiredText_(payload.login, 'login').toLowerCase();
  var password = requiredText_(payload.password, 'password');
  var now = new Date().toISOString();
  var sheet = sheet_(SHEETS.USERS);
  var rows = rows_(SHEETS.USERS);
  var match = findByField_(rows, 'login', login);
  var row = {
    login: login,
    password: password,
    telegramChatId: cleanText_(payload.telegramChatId || ''),
    block: cleanText_(payload.block || ''),
    active: toBoolean_(payload.active, true),
    role: cleanText_(payload.role || 'free'),
    obyekt: cleanText_(payload.obyekt || 'Barchasi'),
    ombor: cleanText_(payload.ombor || 'Barchasi'),
    canEditJurnal: toBoolean_(payload.canEditJurnal, false),
    canDeleteJurnal: toBoolean_(payload.canDeleteJurnal, false),
    updatedAt: now
  };

  if (match) {
    updateRowByNumber_(sheet, match._rowNumber, HEADERS[SHEETS.USERS], row);
    return getRowByNumber_(SHEETS.USERS, match._rowNumber);
  }

  row.createdAt = now;
  appendRow_(sheet, HEADERS[SHEETS.USERS], row);
  return row;
}

function addJournalRow_(payload) {
  var product = ensureProduct_(payload);
  var firm = ensureFirm_(payload);
  var objectName = cleanText_(payload.obyekt || 'Barchasi');
  var warehouseName = cleanText_(payload.ombor || 'Barchasi');
  if (objectName) upsertSimpleNamedRow_(SHEETS.OBJECTS, objectName);
  if (warehouseName) upsertSimpleNamedRow_(SHEETS.WAREHOUSES, warehouseName);

  var qty = Number(payload.miqdor) || 0;
  var price = Number(payload.narx) || 0;
  if (qty <= 0) throw new Error('miqdor 0 dan katta bo‘lishi kerak');

  var now = new Date().toISOString();
  var row = {
    id: uid_('JRN'),
    sana: cleanText_(payload.sana || formatDateUz_(new Date())),
    tur: validateType_(payload.tur),
    mahsulotId: product.id,
    mahsulot: product.name,
    firmaId: firm ? firm.id : '',
    firma: firm ? firm.name : '',
    miqdor: qty,
    narx: price,
    summa: Number(payload.summa) || qty * price,
    obyekt: objectName,
    ombor: warehouseName,
    izoh: cleanText_(payload.izoh || ''),
    operator: cleanText_(payload.operator || 'system'),
    createdAt: now,
    updatedAt: now
  };

  appendRow_(sheet_(SHEETS.JOURNAL), HEADERS[SHEETS.JOURNAL], row);
  notifyTelegram_(row);
  return row;
}

function updateJournalRow_(payload) {
  var id = requiredText_(payload.id, 'id');
  var rows = rows_(SHEETS.JOURNAL);
  var match = findByField_(rows, 'id', id);
  if (!match) throw new Error('Jurnal yozuvi topilmadi: ' + id);

  var before = shallowCopy_(match);
  var product = ensureProduct_(payload);
  var firm = ensureFirm_(payload);
  var qty = Number(payload.miqdor) || 0;
  var price = Number(payload.narx) || 0;
  var updated = {
    sana: cleanText_(payload.sana || match.sana),
    tur: validateType_(payload.tur || match.tur),
    mahsulotId: product.id,
    mahsulot: product.name,
    firmaId: firm ? firm.id : '',
    firma: firm ? firm.name : '',
    miqdor: qty,
    narx: price,
    summa: Number(payload.summa) || qty * price,
    obyekt: cleanText_(payload.obyekt || match.obyekt || 'Barchasi'),
    ombor: cleanText_(payload.ombor || match.ombor || 'Barchasi'),
    izoh: cleanText_(payload.izoh || match.izoh),
    operator: cleanText_(payload.operator || match.operator),
    updatedAt: new Date().toISOString()
  };

  updateRowByNumber_(sheet_(SHEETS.JOURNAL), match._rowNumber, HEADERS[SHEETS.JOURNAL], updated);
  appendHistory_('edit', getRowByNumber_(SHEETS.JOURNAL, match._rowNumber), payload.changedBy || updated.operator, 'old=' + JSON.stringify(before));
  return getRowByNumber_(SHEETS.JOURNAL, match._rowNumber);
}

function deleteJournalRow_(payload) {
  var id = requiredText_(payload.id, 'id');
  var rows = rows_(SHEETS.JOURNAL);
  var match = findByField_(rows, 'id', id);
  if (!match) throw new Error('Jurnal yozuvi topilmadi: ' + id);

  appendHistory_('delete', match, cleanText_(payload.changedBy || payload.operator || 'system'), cleanText_(payload.note || ''));
  deleteRow_(sheet_(SHEETS.JOURNAL), match._rowNumber);
  return { deletedId: id };
}

function restoreHistoryRow_(payload) {
  var historyId = requiredText_(payload.id, 'id');
  var rows = rows_(SHEETS.HISTORY);
  var match = findByField_(rows, 'id', historyId);
  if (!match) throw new Error('History yozuvi topilmadi: ' + historyId);

  var row = {
    tur: match.tur,
    sana: match.sana,
    mahsulot: match.mahsulot,
    firma: match.firma,
    miqdor: Number(match.miqdor) || 0,
    narx: Number(match.narx) || 0,
    summa: Number(match.summa) || 0,
    obyekt: match.obyekt,
    ombor: match.ombor,
    izoh: match.izoh,
    operator: cleanText_(payload.changedBy || 'system')
  };

  var restored = addJournalRow_(row);
  appendHistory_('restore', restored, cleanText_(payload.changedBy || 'system'), 'historyId=' + historyId);
  return restored;
}

function syncTelegramChat_(payload) {
  var login = requiredText_(payload.login, 'login').toLowerCase();
  var chatId = requiredText_(payload.telegramChatId, 'telegramChatId');
  var rows = rows_(SHEETS.USERS);
  var match = findByField_(rows, 'login', login);
  if (!match) throw new Error('User topilmadi: ' + login);

  updateRowByNumber_(sheet_(SHEETS.USERS), match._rowNumber, HEADERS[SHEETS.USERS], {
    telegramChatId: chatId,
    updatedAt: new Date().toISOString()
  });
  return getRowByNumber_(SHEETS.USERS, match._rowNumber);
}

function notifyTelegram_(journalRow) {
  var token = scriptProp_('TELEGRAM_BOT_TOKEN');
  if (!token) return;

  var users = activeRows_(SHEETS.USERS).filter(function (u) {
    return String(u.telegramChatId || '').trim();
  });

  if (!users.length) return;

  var text = [
    journalRow.tur === 'Kirim' ? '📥 KIRIM' : '📤 CHIQIM',
    'Mahsulot: ' + journalRow.mahsulot,
    'Firma: ' + (journalRow.firma || '—'),
    'Miqdor: ' + journalRow.miqdor,
    'Narx: ' + journalRow.narx,
    'Summa: ' + journalRow.summa,
    'Obyekt: ' + (journalRow.obyekt || '—'),
    'Ombor: ' + (journalRow.ombor || '—'),
    'Operator: ' + (journalRow.operator || '—')
  ].join('\n');

  users.forEach(function (user) {
    try {
      UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: user.telegramChatId,
          text: text
        }),
        muteHttpExceptions: true
      });
    } catch (err) {
      Logger.log('Telegram send failed for ' + user.login + ': ' + err);
    }
  });
}

function appendHistory_(action, sourceRow, changedBy, note) {
  var row = {
    id: uid_('HIS'),
    action: action,
    sourceJournalId: sourceRow.id || '',
    sana: sourceRow.sana || '',
    tur: sourceRow.tur || '',
    mahsulotId: sourceRow.mahsulotId || '',
    mahsulot: sourceRow.mahsulot || '',
    firmaId: sourceRow.firmaId || '',
    firma: sourceRow.firma || '',
    miqdor: sourceRow.miqdor || 0,
    narx: sourceRow.narx || 0,
    summa: sourceRow.summa || 0,
    obyekt: sourceRow.obyekt || '',
    ombor: sourceRow.ombor || '',
    izoh: sourceRow.izoh || '',
    operator: sourceRow.operator || '',
    changedBy: changedBy || 'system',
    changedAt: new Date().toISOString(),
    note: note || ''
  };
  appendRow_(sheet_(SHEETS.HISTORY), HEADERS[SHEETS.HISTORY], row);
  return row;
}

function ensureProduct_(payload) {
  if (payload.mahsulotId) {
    var productById = findByField_(rows_(SHEETS.PRODUCTS), 'id', cleanText_(payload.mahsulotId));
    if (productById) return productById;
  }
  return upsertProduct_({
    name: payload.mahsulot || payload.name,
    unit: payload.unit || payload.olv || ''
  });
}

function ensureFirm_(payload) {
  var firmName = cleanText_(payload.firma || payload.tomon || '');
  if (!firmName) return null;

  if (payload.firmaId) {
    var firmById = findByField_(rows_(SHEETS.FIRMS), 'id', cleanText_(payload.firmaId));
    if (firmById) return firmById;
  }

  return upsertFirm_({
    name: firmName,
    phone: payload.phone || '',
    note: payload.note || ''
  });
}

function setupFormatting_(ss) {
  Object.keys(SHEETS).forEach(function (key) {
    var sheet = ss.getSheetByName(SHEETS[key]);
    if (!sheet) return;
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getMaxColumns());
  });
}

function spreadsheet_() {
  var spreadsheetId = scriptProp_('SPREADSHEET_ID');
  return spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  var sheet = spreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet topilmadi: ' + name + '. setupProject() ni run qiling.');
  return sheet;
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  var currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  var needsRewrite = headers.some(function (header, index) {
    return currentHeaders[index] !== header;
  });

  if (needsRewrite) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function rows_(sheetName) {
  var sheet = sheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var headers = HEADERS[sheetName];
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(function (row) {
      return row.some(function (cell) { return cell !== ''; });
    })
    .map(function (row, index) {
      var obj = {};
      headers.forEach(function (header, colIndex) {
        obj[header] = row[colIndex];
      });
      obj._rowNumber = index + 2;
      return obj;
    });
}

function activeRows_(sheetName) {
  return rows_(sheetName).filter(function (row) {
    return String(row.active) !== 'false' && row.active !== false;
  });
}

function appendRow_(sheet, headers, object) {
  var row = headers.map(function (header) {
    return object[header] !== undefined ? object[header] : '';
  });
  sheet.appendRow(row);
}

function updateRowByNumber_(sheet, rowNumber, headers, updates) {
  var current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  var merged = headers.map(function (header, index) {
    return updates[header] !== undefined ? updates[header] : current[index];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([merged]);
}

function deleteRow_(sheet, rowNumber) {
  sheet.deleteRow(rowNumber);
}

function getRowByNumber_(sheetName, rowNumber) {
  return rows_(sheetName).filter(function (row) {
    return row._rowNumber === rowNumber;
  })[0] || null;
}

function findByField_(rows, field, value) {
  var target = String(value);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][field]) === target) return rows[i];
  }
  return null;
}

function parseBody_(e) {
  var text = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  var body = JSON.parse(text);
  if (!body.action) throw new Error('action kerak');
  return body;
}

function ensureAuthorized_(source) {
  var adminKey = scriptProp_('ADMIN_KEY');
  if (!adminKey) return;

  var given = '';
  if (source) {
    if (typeof source.parameter === 'object' && source.parameter) {
      given = source.parameter.adminKey || '';
    } else {
      given = source.adminKey || '';
    }
  }
  if (given !== adminKey) throw new Error('Unauthorized');
}

function requiredText_(value, field) {
  var text = cleanText_(value);
  if (!text) throw new Error(field + ' kerak');
  return text;
}

function cleanText_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeName_(value) {
  return cleanText_(value).toLowerCase();
}

function validateType_(value) {
  var type = cleanText_(value);
  if (type !== 'Kirim' && type !== 'Chiqim') {
    throw new Error('tur faqat Kirim yoki Chiqim bo‘lishi kerak');
  }
  return type;
}

function toBoolean_(value, defaultValue) {
  if (value === '' || value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  var text = String(value).toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}

function upsertSetting_(key, value) {
  var sheet = sheet_(SHEETS.SETTINGS);
  var rows = rows_(SHEETS.SETTINGS);
  var match = findByField_(rows, 'key', key);
  var now = new Date().toISOString();

  if (match) {
    updateRowByNumber_(sheet, match._rowNumber, HEADERS[SHEETS.SETTINGS], {
      value: value,
      updatedAt: now
    });
    return;
  }

  appendRow_(sheet, HEADERS[SHEETS.SETTINGS], {
    key: key,
    value: value,
    updatedAt: now
  });
}

function param_(e, key, fallback) {
  return e && e.parameter && e.parameter[key] ? e.parameter[key] : fallback;
}

function scriptProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function uid_(prefix) {
  return prefix + '_' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function shallowCopy_(obj) {
  var copy = {};
  Object.keys(obj).forEach(function (key) {
    if (key !== '_rowNumber') copy[key] = obj[key];
  });
  return copy;
}

function formatDateUz_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd.MM.yyyy');
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(err) {
  return json_({
    ok: false,
    error: err && err.message ? err.message : String(err)
  });
}
