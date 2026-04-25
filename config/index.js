/**
 * Config — Muhit o'zgaruvchilari va sozlamalar
 */
module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'ombor-pro-secret-key-2026',
  JWT_EXPIRES: '24h',
  DATA_DIR: require('path').join(__dirname, '..', 'data'),
  ADMIN_KEY: process.env.ADMIN_KEY || ''
};
