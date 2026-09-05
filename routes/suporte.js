const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { sendEmail, brandedEmailTemplate } = require('../utils/email');

// Lista de tickets do utilizador (ou todos, se for admin a aceder por aqui — mas admins usam /admin/suporte)
router.get('/suporte', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM tickets WHERE user_id = $1 ORDER BY atualizado_em DESC',
    [req.session.user.id]
  );
  res.render('suporte/lista', { title: 'Suporte | Transferes', tickets: result.rows });
});

router.get('/suporte/novo', requireAuth, (req, res) => {
  res.render('suporte/novo', { title: 'Novo pedido de suporte | Transferes', erro: null });
});

router.post('/suporte/novo', requireAuth, async (req, res) => {
  const { assunto, mensagem } = req.body;
  if (!assunto || !mensagem) {
    return res.render('suporte/novo', { title: 'Novo pedido de suporte | Transferes', erro: 'Preenche o assunto e a mensagem.' });
  }
  try {
    const ticketResult = await pool.query(
      'INSERT INTO tickets (user_id, assunto) VALUES ($1, $2) RETURNING id',
      [req.session.user.id, assunto]
    );
    const ticketId = ticketResult.rows[0].id;
    await pool.query(
      'INSERT INTO ticket_mensagens (ticket_id, autor, mensagem) VALUES ($1, $2, $3)',
      [ticketId, 'user', mensagem]
    );

    if (process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Novo ticket de suporte: ${assunto}`,
        html: brandedEmailTemplate({
          title: 'Novo pedido de suporte',
          bodyHtml: `<p style="margin:0 0 10px;"><strong style="color:#eef2f8;">De:</strong> ${req.session.user.nome} (${req.session.user.email})</p>
                     <p style="margin:0 0 10px;"><strong style="color:#eef2f8;">Assunto:</strong> ${assunto}</p>
                     <p style="margin:0;">${mensagem}</p>`
        })
      }).catch(() => {});
    }

    res.redirect(`/suporte/${ticketId}`);
  } catch (err) {
    console.error('Erro ao criar ticket:', err);
    res.render('suporte/novo', { title: 'Novo pedido de suporte | Transferes', erro: 'Erro inesperado. Tenta novamente.' });
  }
});

router.get('/suporte/:id', requireAuth, async (req, res) => {
  const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
  const ticket = ticketResult.rows[0];
  if (!ticket) return res.redirect('/suporte');

  const isOwner = ticket.user_id === req.session.user.id;
  const isAdmin = req.session.user.is_admin;
  if (!isOwner && !isAdmin) return res.redirect('/suporte');

  const mensagens = await pool.query(
    'SELECT * FROM ticket_mensagens WHERE ticket_id = $1 ORDER BY criado_em ASC',
    [ticket.id]
  );

  res.render('suporte/ticket', {
    title: `Ticket #${ticket.id} | Transferes`,
    ticket,
    mensagens: mensagens.rows,
    voltarLink: isAdmin && !isOwner ? '/admin/suporte' : '/suporte'
  });
});

router.post('/suporte/:id/responder', requireAuth, async (req, res) => {
  const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
  const ticket = ticketResult.rows[0];
  if (!ticket) return res.redirect('/suporte');

  const isOwner = ticket.user_id === req.session.user.id;
  const isAdmin = req.session.user.is_admin;
  if (!isOwner && !isAdmin) return res.redirect('/suporte');

  const { mensagem } = req.body;
  if (mensagem && mensagem.trim()) {
    const autor = isAdmin && !isOwner ? 'admin' : (isAdmin ? 'admin' : 'user');
    await pool.query(
      'INSERT INTO ticket_mensagens (ticket_id, autor, mensagem) VALUES ($1, $2, $3)',
      [ticket.id, autor, mensagem]
    );
    await pool.query('UPDATE tickets SET atualizado_em = NOW() WHERE id = $1', [ticket.id]);

    // Notifica a outra parte por email
    if (autor === 'admin') {
      const userResult = await pool.query('SELECT email, nome FROM users WHERE id = $1', [ticket.user_id]);
      const destinatario = userResult.rows[0];
      if (destinatario) {
        sendEmail({
          to: destinatario.email,
          subject: `Nova resposta no teu ticket: ${ticket.assunto}`,
          html: brandedEmailTemplate({
            title: 'Nova resposta da equipa',
            bodyHtml: `<p style="margin:0 0 10px;">Respondemos ao teu ticket "<strong style="color:#eef2f8;">${ticket.assunto}</strong>":</p><p style="margin:0;">${mensagem}</p>`
          })
        }).catch(() => {});
      }
    } else if (process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Nova resposta do cliente no ticket #${ticket.id}`,
        html: brandedEmailTemplate({
          title: 'Nova resposta do cliente',
          bodyHtml: `<p style="margin:0 0 10px;"><strong style="color:#eef2f8;">Assunto:</strong> ${ticket.assunto}</p><p style="margin:0;">${mensagem}</p>`
        })
      }).catch(() => {});
    }
  }
  res.redirect(`/suporte/${ticket.id}`);
});

router.post('/suporte/:id/estado', requireAuth, async (req, res) => {
  if (!req.session.user.is_admin) return res.redirect('/suporte');
  const { estado } = req.body;
  await pool.query('UPDATE tickets SET estado = $1, atualizado_em = NOW() WHERE id = $2', [estado, req.params.id]);
  res.redirect(`/suporte/${req.params.id}`);
});

router.post('/suporte/:id/apagar', requireAuth, async (req, res) => {
  if (!req.session.user.is_admin) return res.redirect('/suporte');
  await pool.query('DELETE FROM tickets WHERE id = $1', [req.params.id]);
  res.redirect('/admin/suporte');
});

module.exports = router;
