const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendEmail, brandedEmailTemplate } = require('../utils/email');
const { getBotReply } = require('../utils/chatbot');

router.post('/chat', (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, erro: 'Mensagem inválida.' });
  }
  try {
    const reply = getBotReply(message);
    res.json({ ok: true, reply });
  } catch (err) {
    console.error('Erro no chatbot:', err);
    res.status(500).json({ ok: false, erro: 'Erro inesperado no assistente.' });
  }
});

router.post('/reserva', async (req, res) => {
  const { nome, email, telefone, tipo_servico, origem, destino, data_hora, passageiros, notas } = req.body;

  if (!nome || !email || !origem || !destino) {
    return res.status(400).json({ ok: false, erro: 'Preenche pelo menos nome, email, origem e destino.' });
  }

  try {
    const userId = (req.session.user && req.session.user.id) || null;
    await pool.query(
      `INSERT INTO reservas (user_id, nome, email, telefone, tipo_servico, origem, destino, data_hora, passageiros, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [userId, nome, email, telefone, tipo_servico, origem, destino, data_hora || null, passageiros || 1, notas]
    );

    sendEmail({
      to: email,
      subject: 'Recebemos o teu pedido de reserva — Transferes',
      html: brandedEmailTemplate({
        title: 'Reserva recebida',
        bodyHtml: `
          <p style="margin:0 0 12px;">Olá ${nome},</p>
          <p style="margin:0 0 12px;">Recebemos o teu pedido de transfer de <strong style="color:#eef2f8;">${origem}</strong> para <strong style="color:#eef2f8;">${destino}</strong>. Vamos confirmar os detalhes e entrar em contacto brevemente.</p>
        `
      })
    }).catch(() => {});

    if (process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Nova reserva: ${nome}`,
        html: brandedEmailTemplate({
          title: 'Nova reserva recebida',
          bodyHtml: `
            <p style="margin:0 0 6px;"><strong style="color:#eef2f8;">Nome:</strong> ${nome}</p>
            <p style="margin:0 0 6px;"><strong style="color:#eef2f8;">Email:</strong> ${email}</p>
            <p style="margin:0 0 6px;"><strong style="color:#eef2f8;">Telefone:</strong> ${telefone || '-'}</p>
            <p style="margin:0 0 6px;"><strong style="color:#eef2f8;">Serviço:</strong> ${tipo_servico || '-'}</p>
            <p style="margin:0 0 6px;"><strong style="color:#eef2f8;">Trajeto:</strong> ${origem} → ${destino}</p>
            <p style="margin:0 0 6px;"><strong style="color:#eef2f8;">Data:</strong> ${data_hora || '-'}</p>
            <p style="margin:0 0 6px;"><strong style="color:#eef2f8;">Passageiros:</strong> ${passageiros || 1}</p>
            <p style="margin:0;"><strong style="color:#eef2f8;">Notas:</strong> ${notas || '-'}</p>
          `
        }),
        replyTo: email
      }).catch(() => {});
    }

    res.json({ ok: true, mensagem: 'Pedido de reserva recebido. Entraremos em contacto brevemente.' });
  } catch (err) {
    console.error('Erro ao gravar reserva:', err);
    res.status(500).json({ ok: false, erro: 'Não foi possível processar o pedido. Tenta novamente.' });
  }
});

module.exports = router;
