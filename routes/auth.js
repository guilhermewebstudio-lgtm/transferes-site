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

router.get('/esqueci-password', (req, res) => {
  res.render('auth/esqueci-password', { title: 'Recuperar password | Transferes', erro: null, sucesso: null });
});

router.post('/esqueci-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT id, nome, email FROM users WHERE email = $1', [(email || '').toLowerCase()]);
    const user = result.rows[0];

    // Resposta genérica sempre igual, para não revelar se o email existe ou não
    const genericSuccess = 'Se existir uma conta com esse email, vais receber um link para redefinir a password.';

    if (user) {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora
      await pool.query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [token, expires, user.id]);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const resetLink = `${baseUrl}/redefinir-password/${token}`;

      sendEmail({
        to: user.email,
        subject: 'Redefinir a tua password — Transferes',
        html: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#101a2b;">Redefinir password</h2>
          <p>Olá ${user.nome},</p>
          <p>Recebemos um pedido para redefinir a password da tua conta Transferes. Clica no botão abaixo para escolher uma nova password. Este link expira dentro de 1 hora.</p>
          <p style="text-align:center; margin: 30px 0;">
            <a href="${resetLink}" style="background:#3d7dfb; color:#050810; padding:12px 28px; border-radius:999px; text-decoration:none; font-weight:bold;">Redefinir password</a>
          </p>
          <p style="color:#888; font-size:13px;">Se não pediste isto, ignora este email — a tua password mantém-se inalterada.</p>
        </div>`
      }).catch(() => {});
    }

    res.render('auth/esqueci-password', { title: 'Recuperar password | Transferes', erro: null, sucesso: genericSuccess });
  } catch (err) {
    console.error('Erro em esqueci-password:', err);
    res.render('auth/esqueci-password', { title: 'Recuperar password | Transferes', erro: 'Erro inesperado. Tenta novamente.', sucesso: null });
  }
});

router.get('/redefinir-password/:token', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [req.params.token]
    );
    if (result.rows.length === 0) {
      return res.render('auth/redefinir-password', { title: 'Link inválido | Transferes', token: null, erro: 'Este link é inválido ou já expirou. Pede um novo.' });
    }
    res.render('auth/redefinir-password', { title: 'Nova password | Transferes', token: req.params.token, erro: null });
  } catch (err) {
    console.error('Erro ao verificar token:', err);
    res.render('auth/redefinir-password', { title: 'Erro | Transferes', token: null, erro: 'Erro inesperado. Tenta novamente.' });
  }
});

router.post('/redefinir-password/:token', async (req, res) => {
  const { password } = req.body;
  const token = req.params.token;
  try {
    if (!password || password.length < 6) {
      return res.render('auth/redefinir-password', { title: 'Nova password | Transferes', token, erro: 'A password precisa de pelo menos 6 caracteres.' });
    }
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (result.rows.length === 0) {
      return res.render('auth/redefinir-password', { title: 'Link inválido | Transferes', token: null, erro: 'Este link é inválido ou já expirou. Pede um novo.' });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [hash, result.rows[0].id]);
    res.redirect('/login');
  } catch (err) {
    console.error('Erro ao redefinir password:', err);
    res.render('auth/redefinir-password', { title: 'Erro | Transferes', token, erro: 'Erro inesperado. Tenta novamente.' });
  }
});

module.exports = router;
