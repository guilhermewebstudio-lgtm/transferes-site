const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendEmail, brandedEmailTemplate } = require('../utils/email');
const { getBotReply } = require('../utils/chatbot');
const { calcularDistancia } = require('../utils/distancia');

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

router.post('/simulador', async (req, res) => {
  const { origem, destino, taxaKm } = req.body;
  const taxa = parseFloat(taxaKm);

  if (!origem || !destino || !taxa) {
    return res.status(400).json({ ok: false, erro: 'Preenche a origem, o destino e a categoria.' });
  }

  try {
    const resultado = await calcularDistancia(origem, destino, { comRota: true });

    if (!resultado) {
      return res.status(422).json({ ok: false, erro: 'Não conseguimos calcular a rota entre estes dois locais. Tenta ser mais específico (ex: incluir a cidade).' });
    }

    const { distanciaKm, duracaoMin, origemCoords, destinoCoords, rotaCoords, steps } = resultado;
    const preco = distanciaKm * taxa;

    // Construir lista de instruções passo a passo a partir dos "steps" do OSRM
    const tipoTexto = {
      depart: 'Siga',
      arrive: 'Chegada ao destino',
      turn: 'Vire',
      'new name': 'Continue',
      continue: 'Continue',
      merge: 'Junte-se à via',
      roundabout: 'Na rotunda, saia',
      rotary: 'Na rotunda, saia',
      fork: 'Na bifurcação, siga',
      'end of road': 'No final da via, vire',
      ramp: 'Siga pela rampa'
    };
    const modificadorTexto = {
      left: 'à esquerda',
      right: 'à direita',
      'slight left': 'ligeiramente à esquerda',
      'slight right': 'ligeiramente à direita',
      'sharp left': 'acentuadamente à esquerda',
      'sharp right': 'acentuadamente à direita',
      straight: 'em frente',
      uturn: 'em inversão de marcha'
    };

    const instrucoes = steps.map((step) => {
      const tipo = step.maneuver.type;
      const mod = step.maneuver.modifier;
      let texto = tipoTexto[tipo] || 'Siga';
      if (mod && modificadorTexto[mod]) texto += ' ' + modificadorTexto[mod];
      if (step.name) texto += ` para ${step.name}`;
      const distStep = step.distance >= 1000
        ? (step.distance / 1000).toFixed(1) + ' km'
        : Math.round(step.distance) + ' m';
      return { texto, distancia: distStep };
    });

    res.json({
      ok: true,
      distanciaKm: Math.round(distanciaKm * 10) / 10,
      duracaoMin,
      preco: Math.round(preco * 100) / 100,
      origem: origemCoords,
      destino: destinoCoords,
      rota: rotaCoords,
      instrucoes
    });
  } catch (err) {
    console.error('Erro no simulador de preço:', err);
    res.status(500).json({ ok: false, erro: 'Erro inesperado ao calcular. Tenta novamente.' });
  }
});


router.post('/reserva', async (req, res) => {
  const { nome, email, telefone, tipo_servico, tipo_frota, origem, destino, data_hora, passageiros, notas } = req.body;

  if (!nome || !email || !origem || !destino) {
    return res.status(400).json({ ok: false, erro: 'Preenche pelo menos nome, email, origem e destino.' });
  }

  try {
    const userId = (req.session.user && req.session.user.id) || null;
    await pool.query(
      `INSERT INTO reservas (user_id, nome, email, telefone, tipo_servico, tipo_frota, origem, destino, data_hora, passageiros, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [userId, nome, email, telefone, tipo_servico, tipo_frota, origem, destino, data_hora || null, passageiros || 1, notas]
    );

    sendEmail({
      to: email,
      subject: 'Recebemos o teu pedido de reserva — SR Ride',
      html: brandedEmailTemplate({
        title: 'Reserva recebida',
        bodyHtml: `
          <p style="margin:0 0 12px;">Olá ${nome},</p>
          <p style="margin:0 0 12px;">Recebemos o teu pedido de transfer de <strong style="color:#f2f3f4;">${origem}</strong> para <strong style="color:#f2f3f4;">${destino}</strong>. Vamos confirmar os detalhes e entrar em contacto brevemente.</p>
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
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Nome:</strong> ${nome}</p>
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Email:</strong> ${email}</p>
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Telefone:</strong> ${telefone || '-'}</p>
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Serviço:</strong> ${tipo_servico || '-'}</p>
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Frota:</strong> ${tipo_frota || '-'}</p>
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Trajeto:</strong> ${origem} → ${destino}</p>
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Data:</strong> ${data_hora || '-'}</p>
            <p style="margin:0 0 6px;"><strong style="color:#f2f3f4;">Passageiros:</strong> ${passageiros || 1}</p>
            <p style="margin:0;"><strong style="color:#f2f3f4;">Notas:</strong> ${notas || '-'}</p>
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
