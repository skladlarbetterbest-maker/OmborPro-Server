/**
 * Logger — strukturali log tizimi (console + ixtiyoriy fayl)
 * Render.com loglarida aniq belgi va tag ko'rinadi.
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_TO_FILE = process.env.LOG_TO_FILE === '1';

if (LOG_TO_FILE) {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}
}

function ts() {
  return new Date().toISOString();
}

function write(level, tag, msg, meta) {
  const line = `[${ts()}] [${level}] [${tag}] ${msg}` +
    (meta ? ' ' + safeJson(meta) : '');
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);

  if (LOG_TO_FILE) {
    try {
      const file = path.join(LOG_DIR, `${new Date().toISOString().slice(0,10)}.log`);
      fs.appendFile(file, line + '\n', () => {});
    } catch (e) {}
  }
}

function safeJson(obj) {
  try { return JSON.stringify(obj); } catch (e) { return String(obj); }
}

function logger(tag) {
  return {
    info:  (msg, meta) => write('INFO',  tag, msg, meta),
    warn:  (msg, meta) => write('WARN',  tag, msg, meta),
    error: (msg, meta) => write('ERROR', tag, msg, meta),
    debug: (msg, meta) => { if (process.env.DEBUG) write('DEBUG', tag, msg, meta); },
  };
}

module.exports = logger;
module.exports.default = logger;
