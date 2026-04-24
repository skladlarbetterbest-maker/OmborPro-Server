/**
 * OmborPro v3.0 — Node.js Server
 * Ko'p tarmoqli backend, Express asosida
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const os = require('os');
const config = require('./config');

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

const app = express();

// API javoblarini cache qilmaslik (admin amallari darhol ko'rinsin)
app.set('etag', false);

// Server IP va PORT ni global o'zgartiruvchiga saqlash
app.set('localIP', localIP);
app.set('port', config.PORT);

// ── Middleware ──
app.use(cors());
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API uchun cache off
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── Static frontend ──
app.use(express.static(path.join(__dirname, 'public')));

// ── Debug: barcha API so'rovlarni ko'rish ──
app.use('/api', (req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// ── API Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bootstrap', require('./routes/bootstrap'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/warehouse', require('./routes/warehouse'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'OmborPro', version: '3.8.0', time: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ──
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`\n  ✅ OmborPro v3.8 Server ishga tushdi`);
  console.log(`  📍 http://localhost:${PORT}`);
  console.log(`  📱 Telefon uchun: http://${localIP}:${PORT}`);
  console.log(`  🕐 ${new Date().toLocaleString('uz-UZ')}\n`);
});
