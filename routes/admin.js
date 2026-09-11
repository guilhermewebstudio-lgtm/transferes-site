const express = require('express');
const router = express.Router();
const { pool, getSetting, setSetting } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { sendEmail, brandedEmailTemplate } = require('../utils/email');
const { calcularDistancia } = require('../utils/distancia');

router.get('/', requireAdmin, async (req, res) => {
  const reservas = await pool.query('SELECT * FROM reservas ORDER BY criado_em DESC LIMIT 100');
  const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
  const ticketsAbertos = await pool.query("SELECT COUNT(*) FROM tickets WHERE estado = 'aberto'");
  const reservasPendentes = await pool.query("SELECT COUNT(*) FROM reservas WHERE estado = 'pendente'");
  res.render('admin/dashboard', {
    title: 'Admin | SR Ride',
    reservas: reservas.rows,
    totalUsers: totalUsers.rows[0].count,
    ticketsAbertos: ticketsAbertos.rows[0].count,
    reservasPendentes: reservasPendentes.rows[0].count
  });
});

const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

router.get('/conteudo', requireAdmin, async (req, res) => {
  const [precoEconomico, precoConforto, precoLuxo, precoVan, ...valoresDias] = await Promise.all([
    getSetting('preco_economico', '0.90'),
    getSetting('preco_conforto', '1.20'),
    getSetting('preco_luxo', '1.60'),
    getSetting('preco_van', '1.30'),
    ...DIAS_SEMANA.map((dia) => getSetting(`horario_${dia}`, '24 horas'))
  ]);
  const horarios = {};
  DIAS_SEMANA.forEach((dia, i) => { horarios[dia] = valoresDias[i]; });

  res.render('admin/conteudo', {
    title: 'Conteúdo do site | Admin | SR Ride',
    precoEconomico, precoConforto, precoLuxo, precoVan, horarios,
    sucesso: false
  });
});

router.post('/conteudo', requireAdmin, async (req, res) => {
  const { precoEconomico, precoConforto, precoLuxo, precoVan } = req.body;
  const horarios = {};
  DIAS_SEMANA.forEach((dia) => { horarios[dia] = req.body[`horario_${dia}`] || '24 horas'; });

  await Promise.all([
    setSetting('preco_economico', precoEconomico || '0.90'),
    setSetting('preco_conforto', precoConforto || '1.20'),
    setSetting('preco_luxo', precoLuxo || '1.60'),
    setSetting('preco_van', precoVan || '1.30'),
    ...DIAS_SEMANA.map((dia) => setSetting(`horario_${dia}`, horarios[dia]))
  ]);

  res.render('admin/conteudo', {
    title: 'Conteúdo do site | Admin | SR Ride',
    precoEconomico, precoConforto, precoLuxo, precoVan, horarios,
    sucesso: true
  });
});

router.get('/suporte', requireAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT t.*, u.nome AS user_nome, u.email AS user_email
    FROM tickets t
    JOIN users u ON u.id = t.user_id
    ORDER BY t.atualizado_em DESC
  `);
  res.render('admin/suporte', { title: 'Suporte | Admin | SR Ride', tickets: result.rows });
});

router.post('/reservas/:id/estado', requireAdmin, async (req, res) => {
  const { estado } = req.body;
  await pool.query('UPDATE reservas SET estado = $1 WHERE id = $2', [estado, req.params.id]);
  res.redirect('/admin');
});

router.post('/reservas/:id/apagar', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM reservas WHERE id = $1', [req.params.id]);
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
Equipa SR Ride`;

  // Cálculo automático do preço com base na distância real e na taxa da categoria de frota da reserva
  let precoCalculado = '';
  let calculoInfo = null;
  try {
    const taxasPorFrota = {
      economico: parseFloat(await getSetting('preco_economico', '0.90')),
      conforto: parseFloat(await getSetting('preco_conforto', '1.20')),
      luxo: parseFloat(await getSetting('preco_luxo', '1.60')),
      van: parseFloat(await getSetting('preco_van', '1.30'))
    };
    const taxa = taxasPorFrota[reserva.tipo_frota] || taxasPorFrota.conforto;

    const resultadoDistancia = await calcularDistancia(reserva.origem, reserva.destino);
    if (resultadoDistancia) {
      const valor = resultadoDistancia.distanciaKm * taxa;
      precoCalculado = valor.toFixed(2) + '€';
      calculoInfo = {
        distanciaKm: Math.round(resultadoDistancia.distanciaKm * 10) / 10,
        taxa
      };
    }
  } catch (err) {
    console.error('Erro ao calcular preço automático:', err);
  }

  res.render('admin/responder', {
    title: 'Responder à reserva | SR Ride',
    reserva,
    assunto: `A tua reserva de transfer — ${reserva.origem} → ${reserva.destino}`,
    mensagem: mensagemDefault,
    preco: precoCalculado,
    calculoInfo,
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
      ? `<div style="margin-top:20px; padding:16px 20px; background:#1b1b1c; border:1px solid #c7cbd1; border-radius:12px;">
          <span style="color:#85888d; font-size:13px;">Valor total</span><br>
          <span style="color:#f2f3f4; font-size:22px; font-weight:800;">${preco}</span>
        </div>`
      : '';

    const html = brandedEmailTemplate({
      title: 'A tua reserva SR Ride',
      bodyHtml: mensagemHtml + precoHtml
    });

    await sendEmail({ to: reserva.email, subject: assunto, html, replyTo: process.env.ADMIN_EMAIL });
    await pool.query('UPDATE reservas SET respondida = true, respondida_em = NOW() WHERE id = $1', [reserva.id]);

    res.render('admin/responder', {
      title: 'Responder à reserva | SR Ride',
      reserva,
      assunto,
      mensagem,
      preco,
      calculoInfo: null,
      enviado: true,
      erro: null
    });
  } catch (err) {
    console.error('Erro ao enviar resposta de reserva:', err);
    res.render('admin/responder', {
      title: 'Responder à reserva | SR Ride',
      reserva,
      assunto,
      mensagem,
      preco,
      calculoInfo: null,
      enviado: false,
      erro: 'Não foi possível enviar o email. Tenta novamente.'
    });
  }
});

module.exports = router;
