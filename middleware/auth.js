function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  if (!req.session.user.is_admin) {
    return res.status(403).render('403', { title: 'Acesso negado' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
