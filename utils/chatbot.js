// Chatbot baseado em correspondência de palavras-chave (scoring), sem depender de nenhuma API externa.
// Deteção de idioma: conta palavras-chave típicas de PT vs EN no texto do utilizador (accent-insensitive).

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

const LANG_HINTS = {
  pt: ['ola', 'oi', 'obrigad', 'quanto', 'custa', 'preco', 'servico', 'reserva', 'como', 'onde', 'quando', 'voce', 'tu', 'sim', 'nao', 'ajuda', 'carro', 'viagem', 'aeroporto', 'password', 'conta', 'porque', 'qual'],
  en: ['hello', 'hi', 'thanks', 'thank', 'how much', 'price', 'service', 'booking', 'book', 'how', 'where', 'when', 'you', 'yes', 'no', 'help', 'car', 'trip', 'airport', 'password', 'account', 'why', 'what', 'which']
};

function detectLang(rawText) {
  const text = normalize(rawText);
  let ptScore = 0;
  let enScore = 0;
  LANG_HINTS.pt.forEach((w) => { if (text.includes(normalize(w))) ptScore++; });
  LANG_HINTS.en.forEach((w) => { if (text.includes(normalize(w))) enScore++; });
  if (enScore > ptScore) return 'en';
  return 'pt'; // default PT em empate
}

// Cada intent tem palavras-chave (accent-insensitive) e uma resposta por idioma.
const INTENTS = [
  {
    id: 'saudacao',
    keywords: ['ola', 'oi', 'boa tarde', 'bom dia', 'boa noite', 'hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    responses: {
      pt: 'Olá! Sou o assistente da Transferes. Posso ajudar com dúvidas sobre serviços, frota, preços ou como fazer uma reserva. O que precisas de saber?',
      en: "Hi there! I'm the Transferes assistant. I can help with questions about services, fleet, pricing, or how to book. What would you like to know?"
    }
  },
  {
    id: 'servicos',
    keywords: ['servico', 'servicos', 'oferecem', 'fazem', 'tipos de transfer', 'service', 'services', 'what do you offer', 'what services'],
    responses: {
      pt: 'Temos 3 serviços: <strong>Transfer de Aeroporto</strong> (monitorização do voo em tempo real, 60 min de espera incluídos), <strong>Transfer Executivo</strong> (reuniões e deslocações profissionais, discrição e wi-fi a bordo) e <strong>Eventos Privados</strong> (casamentos, jantares, com viaturas a pedido). Qual se encaixa mais na tua viagem?',
      en: 'We offer 3 services: <strong>Airport Transfer</strong> (real-time flight monitoring, 60 min wait included), <strong>Executive Transfer</strong> (business travel, discretion and on-board wi-fi), and <strong>Private Events</strong> (weddings, dinners, vehicles on request). Which fits your trip best?'
    }
  },
  {
    id: 'precos',
    keywords: ['preco', 'precos', 'custa', 'custo', 'quanto', 'valor', 'orcamento', 'price', 'prices', 'cost', 'how much', 'quote'],
    responses: {
      pt: 'O valor depende da origem, do destino e do tipo de serviço/veículo escolhido, por isso não há uma tabela fixa. Em geral, o <strong>Transfer de Aeroporto com Sedan Executivo</strong> costuma ser a opção mais económica, enquanto o <strong>Transfer Executivo com SUV</strong> ou a <strong>Van para eventos</strong> tendem a ser mais caros. A forma mais rápida de saberes o valor exato é pedires um orçamento sem compromisso no formulário de <a href="/contacto">Reservar</a>.',
      en: 'The price depends on the pickup, drop-off, and the service/vehicle chosen, so there is no fixed price list. Generally, the <strong>Airport Transfer with Sedan</strong> tends to be the most affordable, while the <strong>Executive Transfer with SUV</strong> or the <strong>Event Van</strong> tend to cost more. The fastest way to get an exact quote is to request one, with no commitment, on the <a href="/contacto">Booking</a> form.'
    }
  },
  {
    id: 'frota',
    keywords: ['frota', 'carro', 'carros', 'viatura', 'viaturas', 'suv', 'van', 'sedan', 'fleet', 'vehicle', 'vehicles', 'car'],
    responses: {
      pt: 'A nossa frota tem 3 opções: <strong>Sedan Executivo</strong> (1 a 3 passageiros), <strong>SUV Premium</strong> (até 4 passageiros, mais bagagem) e <strong>Van de Grupo</strong> (até 8 passageiros). Consulta todos os detalhes na página <a href="/frota">Frota</a>.',
      en: 'Our fleet has 3 options: <strong>Executive Sedan</strong> (1 to 3 passengers), <strong>Premium SUV</strong> (up to 4 passengers, more luggage space), and <strong>Group Van</strong> (up to 8 passengers). Check all the details on the <a href="/frota">Fleet</a> page.'
    }
  },
  {
    id: 'reservar',
    keywords: ['reservar', 'reserva', 'marcar', 'agendar', 'book', 'booking', 'reserve', 'schedule'],
    responses: {
      pt: 'É simples: vai à página <a href="/contacto">Reservar</a> e preenche nome, email, telefone, tipo de serviço, origem, destino, data/hora e número de passageiros. Depois de submeteres, recebes um email de confirmação do pedido e a equipa entra em contacto para fechar os detalhes finais (incluindo o preço).',
      en: "It's simple: go to the <a href=\"/contacto\">Booking</a> page and fill in your name, email, phone, service type, pickup, drop-off, date/time, and number of passengers. After submitting, you'll get a confirmation email and our team will reach out to finalize the details (including the price)."
    }
  },
  {
    id: 'horario',
    keywords: ['horario', 'hora', 'abertos', 'funcionam', 'disponibilidade', 'hours', 'open', 'available', 'availability', 'schedule', 'when'],
    responses: {
      pt: 'Estamos disponíveis <strong>24 horas por dia, todos os dias da semana</strong>, incluindo feriados — podes pedir um transfer a qualquer hora.',
      en: "We're available <strong>24 hours a day, every day of the week</strong>, including holidays — you can request a transfer at any time."
    }
  },
  {
    id: 'conta',
    keywords: ['conta', 'login', 'entrar', 'registar', 'registo', 'criar conta', 'account', 'sign in', 'sign up', 'register'],
    responses: {
      pt: 'Podes criar conta em <a href="/registo">Registo</a> ou entrar em <a href="/login">Entrar</a> para acompanhares as tuas reservas na página "As minhas reservas".',
      en: 'You can create an account at <a href="/registo">Sign up</a> or sign in at <a href="/login">Sign in</a> to track your bookings on the "My bookings" page.'
    }
  },
  {
    id: 'password',
    keywords: ['password', 'esqueci', 'esqueceu', 'recuperar password', 'redefinir', 'forgot password', 'reset password'],
    responses: {
      pt: 'Sem problema — no ecrã de <a href="/login">Entrar</a> clica em "Esqueci-me da password", indica o teu email e recebes um link para escolheres uma nova password.',
      en: 'No worries — on the <a href="/login">Sign in</a> screen click "Forgot password", enter your email, and you\'ll get a link to set a new password.'
    }
  },
  {
    id: 'contacto',
    keywords: ['contacto', 'contactar', 'telefone', 'email', 'falar', 'contact', 'phone', 'call', 'reach'],
    responses: {
      pt: 'Podes contactar-nos por telefone (+351 900 000 000) ou email (reservas@transferes.pt), ou preencher o formulário em <a href="/contacto">Reservar</a>.',
      en: 'You can reach us by phone (+351 900 000 000) or email (reservas@transferes.pt), or fill out the form on the <a href="/contacto">Booking</a> page.'
    }
  },
  {
    id: 'agradecimento',
    keywords: ['obrigado', 'obrigada', 'valeu', 'fixe', 'thanks', 'thank you', 'great', 'perfect'],
    responses: {
      pt: 'De nada! Se precisares de mais alguma coisa, estou por aqui. 🙂',
      en: "You're welcome! Let me know if you need anything else. 🙂"
    }
  }
];

const FALLBACK = {
  pt: 'Não tenho a certeza sobre isso, mas posso ajudar com dúvidas sobre serviços, frota, preços, como reservar, ou a tua conta. O que gostavas de saber?',
  en: "I'm not sure about that, but I can help with questions about services, fleet, pricing, how to book, or your account. What would you like to know?"
};

function getBotReply(message) {
  const lang = detectLang(message);
  const normalizedMsg = normalize(message);

  let bestIntent = null;
  let bestScore = 0;

  INTENTS.forEach((intent) => {
    let score = 0;
    intent.keywords.forEach((kw) => {
      if (normalizedMsg.includes(normalize(kw))) score++;
    });
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  });

  if (bestIntent && bestScore > 0) {
    return bestIntent.responses[lang] || bestIntent.responses.pt;
  }
  return FALLBACK[lang] || FALLBACK.pt;
}

module.exports = { getBotReply, detectLang };
