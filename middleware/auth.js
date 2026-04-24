/**
 * Auth middleware — JWT tekshirish
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token kerak' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Token noto\'g\'ri yoki muddati tugagan' });
  }
}

/**
 * Admin tekshirish
 */
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Faqat admin uchun' });
  }
  next();
}

/**
 * Minimum role tekshirish
 */
function minRole(minRoleName) {
  const hierarchy = { free: 0, pro: 1, 'pro+': 2, admin: 3 };
  return (req, res, next) => {
    const userLevel = hierarchy[req.user?.role] || 0;
    const requiredLevel = hierarchy[minRoleName] || 0;
    if (userLevel < requiredLevel) {
      return res.status(403).json({ ok: false, error: `Minimum ${minRoleName} talab qilinadi` });
    }
    next();
  };
}

module.exports = { authMiddleware, adminOnly, minRole };
