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

router.post('/simulador', async (req, res) => {
  const { origem, destino, taxaKm } = req.body;
  const taxa = parseFloat(taxaKm);

  if (!origem || !destino || !taxa) {
    return res.status(400).json({ ok: false, erro: 'Preenche a origem, o destino e a categoria.' });
  }

  try {
    const geocode = async (endereco) => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;
      const resposta = await fetch(url, { headers: { 'User-Agent': 'SRRide-Site/1.0' } });
      const dados = await resposta.json();
      if (!dados || dados.length === 0) return null;
      return { lat: parseFloat(dados[0].lat), lon: parseFloat(dados[0].lon) };
    };

    const [origemCoords, destinoCoords] = await Promise.all([geocode(origem), geocode(destino)]);

    if (!origemCoords || !destinoCoords) {
      return res.status(422).json({ ok: false, erro: 'Não conseguimos localizar um dos endereços indicados. Tenta ser mais específico (ex: incluir a cidade).' });
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lon},${origemCoords.lat};${destinoCoords.lon},${destinoCoords.lat}?overview=full&geometries=geojson&steps=true`;
    const rotaResposta = await fetch(osrmUrl);
    const rotaDados = await rotaResposta.json();

    if (!rotaDados.routes || rotaDados.routes.length === 0) {
      return res.status(422).json({ ok: false, erro: 'Não foi possível calcular uma rota de carro entre estes dois locais.' });
    }

    const distanciaKm = rotaDados.routes[0].distance / 1000;
    const duracaoMin = Math.round(rotaDados.routes[0].duration / 60);
    const preco = distanciaKm * taxa;

    // GeoJSON vem em [lon, lat]; convertemos para [lat, lon] (formato Leaflet)
    const rotaCoords = rotaDados.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);

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

    const instrucoes = [];
    rotaDados.routes[0].legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        const tipo = step.maneuver.type;
        const mod = step.maneuver.modifier;
        let texto = tipoTexto[tipo] || 'Siga';
        if (mod && modificadorTexto[mod]) texto += ' ' + modificadorTexto[mod];
        if (step.name) texto += ` para ${step.name}`;
        const distStep = step.distance >= 1000
          ? (step.distance / 1000).toFixed(1) + ' km'
          : Math.round(step.distance) + ' m';
        instrucoes.push({ texto, distancia: distStep });
      });
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
