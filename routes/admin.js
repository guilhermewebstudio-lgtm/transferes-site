const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, async (req, res) => {
  const reservas = await pool.query('SELECT * FROM reservas ORDER BY criado_em DESC LIMIT 100');
  const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
  res.render('admin/dashboard', {
    title: 'Admin | Transferes',
    reservas: reservas.rows,
    totalUsers: totalUsers.rows[0].count
  });
});

router.post('/reservas/:id/estado', requireAdmin, async (req, res) => {
  const { estado } = req.body;
  await pool.query('UPDATE reservas SET estado = $1 WHERE id = $2', [estado, req.params.id]);
  res.redirect('/admin');
});

module.exports = router;
