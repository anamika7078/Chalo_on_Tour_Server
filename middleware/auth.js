const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Token is not valid' });
    if (!user.isActive) return res.status(401).json({ message: 'Account is deactivated' });
    req.user = { id: user._id.toString(), role: user.role, email: user.email, agency: user.agency ? user.agency.toString() : null };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied.' });
  next();
};

/** Allows both superadmin and staff (CRM access). */
const checkModulePermission = () => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.role === 'superadmin' || req.user.role === 'staff') return next();
  return res.status(403).json({ message: 'Access denied.' });
};

/** Only superadmin (for delete, upload, payment edit, assign, create). */
const requireSuperadmin = () => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.role === 'superadmin') return next();
  return res.status(403).json({ message: 'Access denied. Superadmin only.' });
};

const validateEntryPermission = (doc, user, action) => ({ allowed: true });
const validateAgencyIsolation = (doc, user) => ({ allowed: true });

module.exports = { auth, authorize, checkModulePermission, requireSuperadmin, validateEntryPermission, validateAgencyIsolation };
