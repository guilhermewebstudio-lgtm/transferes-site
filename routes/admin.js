const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { sendEmail, brandedEmailTemplate } = require('../utils/email');

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

router.get('/reservas/:id/responder', requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM reservas WHERE id = $1', [req.params.id]);
  const reserva = result.rows[0];
  if (!reserva) return res.redirect('/admin');

  const dataFormatada = reserva.data_hora
    ? new Date(reserva.data_hora).toLocaleString('pt-PT')
    : 'a combinar';

  const mensagemDefault = `Olá ${reserva.nome},

Obrigado pelo teu pedido de transfer de ${reserva.origem} para ${reserva.destino}, agendado para ${dataFormatada}.

Confirmamos a disponibilidade para esta viagem. Abaixo encontras o valor total.

Qualquer dúvida, estamos disponíveis para ajudar.

Cumprimentos,
Equipa Transferes`;

  res.render('admin/responder', {
    title: 'Responder à reserva | Transferes',
    reserva,
    assunto: `A tua reserva de transfer — ${reserva.origem} → ${reserva.destino}`,
    mensagem: mensagemDefault,
    preco: '',
    enviado: false,
    erro: null
  });
});

router.post('/reservas/:id/responder', requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM reservas WHERE id = $1', [req.params.id]);
  const reserva = result.rows[0];
  if (!reserva) return res.redirect('/admin');

  const { assunto, mensagem, preco } = req.body;

  try {
    const mensagemHtml = String(mensagem || '')
      .split('\n')
      .map((linha) => linha.trim() === '' ? '<br>' : `<p style="margin:0 0 12px;">${linha}</p>`)
      .join('');

    const precoHtml = preco
      ? `<div style="margin-top:20px; padding:16px 20px; background:#101a2b; border:1px solid #3d7dfb; border-radius:12px;">
          <span style="color:#7c8aa3; font-size:13px;">Valor total</span><br>
          <span style="color:#eef2f8; font-size:22px; font-weight:800;">${preco}</span>
        </div>`
      : '';

    const html = brandedEmailTemplate({
      title: 'A tua reserva Transferes',
      bodyHtml: mensagemHtml + precoHtml
    });

    await sendEmail({ to: reserva.email, subject: assunto, html, replyTo: process.env.ADMIN_EMAIL });

    res.render('admin/responder', {
      title: 'Responder à reserva | Transferes',
      reserva,
      assunto,
      mensagem,
      preco,
      enviado: true,
      erro: null
    });
  } catch (err) {
    console.error('Erro ao enviar resposta de reserva:', err);
    res.render('admin/responder', {
      title: 'Responder à reserva | Transferes',
      reserva,
      assunto,
      mensagem,
      preco,
      enviado: false,
      erro: 'Não foi possível enviar o email. Tenta novamente.'
    });
  }
});

module.exports = router;
