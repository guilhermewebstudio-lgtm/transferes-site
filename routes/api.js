const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendEmail, brandedEmailTemplate } = require('../utils/email');

const SYSTEM_PROMPT = `És o assistente virtual da Transferes, uma empresa de transfers executivos e de aeroporto em Lisboa, Portugal.
Respostas curtas, simpáticas e profissionais. Responde sempre na mesma língua em que o cliente escreveu (português ou inglês), nunca misturando as duas.
Informação sobre a empresa:
- Serviços: transfer de aeroporto (monitorização de voo, 60 min de espera incluídos), transfer executivo (reuniões, deslocações profissionais, discrição), eventos privados (casamentos, jantares).
- Frota: Sedan Executivo (1-3 passageiros), SUV Premium (até 4 passageiros, mais bagagem), Van de Grupo (até 8 passageiros).
- Disponibilidade 24 horas por dia, 7 dias por semana.
- Para reservar, o cliente deve preencher o formulário na página /contacto com origem, destino, data/hora e número de passageiros.
- Não sabes preços exatos — di-lo com honestidade e sugere que peçam orçamento através do formulário de contacto.
- Não inventes informações que não tens (moradas exatas, números de telefone reais, políticas de cancelamento) — sugere que confirmem diretamente através do formulário de contacto.
Mantém as respostas com no máximo 3-4 frases.`;

router.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ ok: false, erro: 'Mensagem inválida.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, erro: 'Assistente indisponível de momento.' });
  }

  try {
    const messages = Array.isArray(history)
      ? history.slice(-8).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) }))
      : [];
    messages.push({ role: 'user', content: message.slice(0, 2000) });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Erro Anthropic API:', response.status, text);
      return res.status(502).json({ ok: false, erro: 'Não consegui responder agora. Tenta novamente.' });
    }

    const data = await response.json();
    const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    res.json({ ok: true, reply: reply || 'Desculpa, não consegui perceber. Podes reformular?' });
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
