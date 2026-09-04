const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.post('/reserva', async (req, res) => {
  const { nome, email, telefone, tipo_servico, origem, destino, data_hora, passageiros, notas } = req.body;

  if (!nome || !email || !origem || !destino) {
    return res.status(400).json({ ok: false, erro: 'Preenche pelo menos nome, email, origem e destino.' });
  }

  try {
    await pool.query(
      `INSERT INTO reservas (nome, email, telefone, tipo_servico, origem, destino, data_hora, passageiros, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [nome, email, telefone, tipo_servico, origem, destino, data_hora || null, passageiros || 1, notas]
    );
    res.json({ ok: true, mensagem: 'Pedido de reserva recebido. Entraremos em contacto brevemente.' });
  } catch (err) {
    console.error('Erro ao gravar reserva:', err);
    res.status(500).json({ ok: false, erro: 'Não foi possível processar o pedido. Tenta novamente.' });
  }
});

module.exports = router;
