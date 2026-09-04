const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendEmail } = require('../utils/email');

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
      html: `<p>Olá ${nome},</p><p>Recebemos o teu pedido de transfer de <strong>${origem}</strong> para <strong>${destino}</strong>. Vamos confirmar os detalhes e entrar em contacto brevemente.</p>`
    }).catch(() => {});

    if (process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Nova reserva: ${nome}`,
        html: `<p>Nova reserva recebida.</p><p><strong>Nome:</strong> ${nome}<br><strong>Email:</strong> ${email}<br><strong>Telefone:</strong> ${telefone || '-'}<br><strong>Serviço:</strong> ${tipo_servico || '-'}<br><strong>Trajeto:</strong> ${origem} → ${destino}<br><strong>Data:</strong> ${data_hora || '-'}<br><strong>Passageiros:</strong> ${passageiros || 1}<br><strong>Notas:</strong> ${notas || '-'}</p>`,
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
