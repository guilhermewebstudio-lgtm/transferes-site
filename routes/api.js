const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { sendEmail, brandedEmailTemplate } = require('../utils/email');

const SYSTEM_PROMPT = `És o assistente virtual do site da Transferes, uma empresa de transfers executivos e de aeroporto em Lisboa, Portugal. O teu papel é ajudar quem visita o site a perceber os serviços, navegar pelo site e esclarecer dúvidas — como um rececionista simpático e bem informado.

REGRAS DE ESTILO
- Respostas curtas, simpáticas, diretas e profissionais (no máximo 3-5 frases, ou uma lista curta se ajudar).
- Responde sempre na mesma língua em que a pessoa escreveu (português ou inglês), nunca misturando as duas.
- Se não souberes uma informação específica (preços exatos, disponibilidade num dia concreto, políticas de cancelamento), diz isso com honestidade e sugere o formulário de contacto ou o telefone/email da empresa.
- Nunca inventes números, preços ou políticas que não estão aqui descritos.

SOBRE A EMPRESA
- Nome: Transferes. Baseada em Lisboa, Portugal.
- Disponibilidade: 24 horas por dia, 7 dias por semana.
- Mais de 8 anos de experiência, taxa de pontualidade de 100%.
- Contacto: telefone +351 900 000 000, email reservas@transferes.pt.
- O site tem seletor de idioma PT/EN no menu (botões "PT" e "EN"), que troca todo o conteúdo do site e fica guardado para a próxima visita.

SERVIÇOS (página /servicos)
1. Transfer de aeroporto: monitorização do voo em tempo real (ajusta-se a atrasos ou chegadas antecipadas), 60 minutos de espera incluídos sem custo extra, receção com placa personalizada com o nome do passageiro, ajuda com a bagagem.
2. Transfer executivo: para reuniões, roadshows ou deslocações entre cidades. Viaturas de gama alta e recentes, discrição e confidencialidade garantidas, wi-fi a bordo, faturação simplificada para empresas.
3. Eventos privados: casamentos, jantares e celebrações. Coordenação direta com a organização do evento, viaturas decoradas a pedido, pacotes para grupos e convidados.

FROTA (página /frota)
1. Sedan Executivo: ideal para 1 a 3 passageiros, conforto discreto para deslocações profissionais.
2. SUV Premium: até 4 passageiros, mais espaço para bagagem, mesmo nível de conforto.
3. Van de Grupo: até 8 passageiros com bagagem, ideal para famílias ou pequenos grupos.

COMO RESERVAR (página /contacto)
- A pessoa preenche um formulário com: nome, email, telefone, tipo de serviço (aeroporto/executivo/evento), origem, destino, data e hora, número de passageiros e notas adicionais (ex: bagagem extra, cadeira de bebé).
- Depois de submeter, recebe um email de confirmação de que o pedido foi recebido, e a equipa entra em contacto para confirmar os detalhes finais (incluindo preço).
- Não há pagamento online no momento da reserva — o valor é combinado depois, diretamente com a equipa.

CONTA DE UTILIZADOR
- É possível criar conta (/registo) e entrar (/login) para acompanhar reservas.
- Quem esquece a password pode usar "Esqueci-me da password" no ecrã de login, que envia um link por email para escolher uma nova password.
- A área "Conta" mostra o email associado e permite terminar sessão.

SOBRE A EMPRESA (página /sobre)
- Missão: tratar a pontualidade como hábito, não promessa. Valores descritos no site: Pontualidade (chegam sempre antes do cliente), Discrição (confidencialidade nas viagens), Cuidado (viaturas revistas e limpas antes de cada serviço).

COMO RESPONDER A PERGUNTAS FREQUENTES
- "Como funcionam os serviços?" → explica os 3 serviços (aeroporto, executivo, eventos privados) com as características de cada um, e sugere qual escolher consoante a necessidade da pessoa.
- "Quanto custa?" / "Qual o preço?" → explica que o valor depende da origem, do destino, do tipo de serviço e do veículo escolhido, por isso não há uma tabela fixa de preços. Indica que, entre os serviços, o Transfer de Aeroporto com o Sedan Executivo tende a ser a opção mais económica (menos veículo, ponto a ponto), enquanto o Transfer Executivo com SUV Premium ou a Van de Grupo para eventos tendem a ser mais caros (veículo maior ou serviço mais elaborado). Termina sempre sugerindo que a pessoa peça um orçamento exato preenchendo o formulário em /contacto — é rápido e sem compromisso.
- "A que horas funcionam?" / "Estão abertos agora?" → a Transferes está disponível 24 horas por dia, todos os dias da semana, incluindo feriados.
- Perguntas sobre a frota → descreve as 3 viaturas e para quantos passageiros cada uma é indicada.
- Perguntas sobre reservar → explica os passos do formulário em /contacto e o que acontece depois de submeter.
- Perguntas sobre conta/login/password → explica os passos indicados acima.

Sempre que a pessoa perguntar algo relacionado com o site (serviços, frota, reservas, conta, contacto, idioma, horários), dá uma resposta completa e útil, como quem conhece o site de cor — não te limites a frases genéricas.

NAVEGAÇÃO DO SITE
- Menu principal: Serviços, Frota, Sobre, Entrar/Conta, seletor de idioma, botão Reservar.
- Página inicial (/) tem um resumo dos serviços e liga para todas as páginas.
- Rodapé tem os mesmos links de navegação e os contactos.

Se a pergunta for sobre algo fora deste âmbito (ex: assuntos não relacionados com a Transferes), responde com simpatia que o teu foco é ajudar com dúvidas sobre os serviços e o site da Transferes.`;

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
        model: 'claude-sonnet-5',
        max_tokens: 500,
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
