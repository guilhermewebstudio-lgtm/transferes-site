const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { pool } = require('../config/db');
const { sendEmail } = require('../utils/email');

router.get('/registo', (req, res) => {
  if (req.session.user) return res.redirect('/conta');
  res.render('auth/registo', { title: 'Criar conta | Transferes', erro: null });
});

router.post('/registo', async (req, res) => {
  const { nome, email, password } = req.body;
  if (!nome || !email || !password || password.length < 6) {
    return res.render('auth/registo', {
      title: 'Criar conta | Transferes',
      erro: 'Preenche todos os campos. A password precisa de pelo menos 6 caracteres.'
    });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.render('auth/registo', {
        title: 'Criar conta | Transferes',
        erro: 'Já existe uma conta com este email.'
      });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (nome, email, password_hash, is_admin)
       VALUES ($1,$2,$3, $4)
       RETURNING id, nome, email, is_admin`,
      [nome, email.toLowerCase(), hash, email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase()]
    );
    const user = result.rows[0];
    req.session.user = user;

    sendEmail({
      to: user.email,
      subject: 'Bem-vindo à Transferes',
      html: `<p>Olá ${user.nome},</p><p>A tua conta foi criada com sucesso. Já podes reservar transfers e acompanhar o histórico das tuas viagens.</p>`
    }).catch(() => {});

    res.redirect('/conta');
  } catch (err) {
    console.error('Erro no registo:', err);
    res.render('auth/registo', { title: 'Criar conta | Transferes', erro: 'Erro inesperado. Tenta novamente.' });
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/conta');
  res.render('auth/login', { title: 'Entrar | Transferes', erro: null, next: req.query.next || '/conta' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const next = req.body.next || '/conta';
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [(email || '').toLowerCase()]);
    const user = result.rows[0];
    if (!user) {
      return res.render('auth/login', { title: 'Entrar | Transferes', erro: 'Credenciais inválidas.', next });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render('auth/login', { title: 'Entrar | Transferes', erro: 'Credenciais inválidas.', next });
    }
    req.session.user = { id: user.id, nome: user.nome, email: user.email, is_admin: user.is_admin };
    res.redirect(user.is_admin ? '/admin' : next);
  } catch (err) {
    console.error('Erro no login:', err);
    res.render('auth/login', { title: 'Entrar | Transferes', erro: 'Erro inesperado. Tenta novamente.', next });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
