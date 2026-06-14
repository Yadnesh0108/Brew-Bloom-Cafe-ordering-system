// ═══════════════════════════════════════════════════════════
//  Admin authorization middleware
// ═══════════════════════════════════════════════════════════

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
}

module.exports = isAdmin;
