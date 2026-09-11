// Chatbot baseado em correspondência de palavras-chave (scoring), sem depender de nenhuma API externa.
// Deteção de idioma: conta palavras/frases típicas de PT vs EN no texto do utilizador (accent-insensitive,
// com limites de palavra para evitar falsos positivos como "car" dentro de "cartão").

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Testa se "phrase" aparece em "text" como palavra(s) inteira(s), não como substring solta.
function containsWord(text, phrase) {
  const pattern = new RegExp('(^|[^a-z0-9])' + escapeRegex(normalize(phrase)) + '($|[^a-z0-9])');
  return pattern.test(' ' + text + ' ');
}

const LANG_HINTS = {
  pt: ['ola', 'oi', 'obrigado', 'obrigada', 'quanto', 'custa', 'preco', 'servico', 'reserva', 'como', 'onde', 'quando', 'voce', 'tu', 'sim', 'nao', 'ajuda', 'carro', 'viagem', 'aeroporto', 'conta', 'porque', 'qual', 'tens', 'tem', 'posso', 'pagar', 'cartao'],
  en: ['hello', 'hi', 'thanks', 'thank', 'how much', 'price', 'service', 'booking', 'book', 'how', 'where', 'when', 'you', 'yes', 'no', 'help', 'car', 'trip', 'airport', 'account', 'why', 'what', 'which', 'can i', 'pay']
};

function detectLang(rawText) {
  const text = normalize(rawText);
  let ptScore = 0;
  let enScore = 0;
  LANG_HINTS.pt.forEach((w) => { if (containsWord(text, w)) ptScore++; });
  LANG_HINTS.en.forEach((w) => { if (containsWord(text, w)) enScore++; });
  if (enScore > ptScore) return 'en';
  return 'pt'; // default PT em empate
}

// Cada intent tem palavras-chave (accent-insensitive, por palavra/frase inteira) e uma resposta por idioma.
const INTENTS = [
  {
    id: 'cancelamento',
    keywords: ['cancelar', 'cancelo', 'cancelamento', 'desmarcar', 'desmarcar reserva', 'cancel', 'cancellation'],
    responses: {
      pt: 'Se precisares de cancelar ou alterar uma reserva, contacta-nos diretamente por telefone, email, ou abre um pedido em <a href="/suporte">Suporte</a> (se tiveres conta) indicando os detalhes da reserva — a equipa trata do resto.',
      en: 'If you need to cancel or change a booking, contact us directly by phone, email, or open a request at <a href="/suporte">Support</a> (if you have an account) with the booking details — our team will take care of the rest.'
    }
  },
  {
    id: 'minhas_reservas',
    keywords: ['minhas reservas', 'as minhas reservas', 'estado da reserva', 'ja responderam', 'my bookings', 'my booking', 'booking status', 'have you replied', 'check my booking'],
    responses: {
      pt: 'Com sessão iniciada, vai a <a href="/minhas-reservas">As minhas reservas</a> para veres o estado de cada pedido (Pendente, Confirmada, Concluída ou Cancelada) e se a equipa já respondeu — nesse caso, verás uma mensagem a dizer para consultares o teu email.',
      en: 'While signed in, go to <a href="/minhas-reservas">My bookings</a> to see the status of each request (Pending, Confirmed, Completed, or Cancelled) and whether our team has replied — if so, you\'ll see a message telling you to check your email.'
    }
  },
  {
    id: 'saudacao',
    keywords: ['ola', 'oi', 'boa tarde', 'bom dia', 'boa noite', 'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'tudo bem'],
    responses: {
      pt: 'Olá! Sou o assistente da SR Ride. Posso ajudar com dúvidas sobre serviços, frota, preços, reservas, a tua conta ou o funcionamento do site. O que precisas de saber?',
      en: "Hi there! I'm the SR Ride assistant. I can help with questions about services, fleet, pricing, bookings, your account, or how the site works. What would you like to know?"
    }
  },
  {
    id: 'empresa',
    keywords: ['quem sao', 'quem e a sr ride', 'sobre a empresa', 'que empresa', 'historia da empresa', 'who are you', 'about the company', 'what is sr ride', 'company history'],
    responses: {
      pt: 'A SR Ride é uma empresa de transfers executivos e de aeroporto sediada em Lisboa, com mais de 8 anos de experiência e 100% de pontualidade. Os nossos valores centrais são Pontualidade, Discrição e Cuidado — trabalhamos com empresas, agências de viagens e particulares. Sabes mais na página <a href="/sobre">Sobre</a>.',
      en: 'SR Ride is an executive and airport transfer company based in Lisbon, with over 8 years of experience and a 100% on-time record. Our core values are Punctuality, Discretion, and Care — we work with companies, travel agencies, and individuals. Learn more on the <a href="/sobre">About</a> page.'
    }
  },
  {
    id: 'pagamento',
    keywords: ['pagamento', 'pagar', 'cartao', 'dinheiro', 'mbway', 'payment', 'credit card', 'cash', 'pay'],
    responses: {
      pt: 'Não há pagamento online no momento da reserva — o valor final é combinado diretamente com a equipa depois de recebermos o teu pedido, antes da viagem acontecer.',
      en: "There's no online payment when booking — the final amount is arranged directly with our team after we receive your request, before the trip happens."
    }
  },
  {
    id: 'servicos',
    keywords: ['servico', 'servicos', 'oferecem', 'tipos de transfer', 'service', 'services', 'what do you offer', 'what services'],
    responses: {
      pt: 'Temos 3 tipos de serviço: <strong>Transfer de Aeroporto</strong> (monitorização do voo em tempo real, 60 min de espera incluídos, receção com placa personalizada), <strong>Transfer Executivo</strong> (reuniões e deslocações profissionais, discrição, wi-fi a bordo, faturação simplificada) e <strong>Eventos Privados</strong> (casamentos, jantares, viaturas decoradas a pedido). Vê tudo em <a href="/servicos">Serviços</a>.',
      en: 'We offer 3 service types: <strong>Airport Transfer</strong> (real-time flight monitoring, 60 min wait included, personalized name sign), <strong>Executive Transfer</strong> (business travel, discretion, on-board wi-fi, simplified invoicing), and <strong>Private Events</strong> (weddings, dinners, vehicles decorated on request). See it all on the <a href="/servicos">Services</a> page.'
    }
  },
  {
    id: 'precos',
    keywords: ['preco', 'precos', 'custa', 'custo', 'quanto custa', 'valor', 'orcamento', 'tarifa', 'price', 'prices', 'cost', 'how much', 'quote', 'fare'],
    responses: {
      pt: 'O valor depende da origem, do destino e da categoria de frota escolhida — por isso não há uma tabela fixa. Temos 4 categorias de frota: <strong>Económico</strong>, <strong>Conforto</strong>, <strong>Luxo</strong> e <strong>Van de Grupo</strong>, cada uma com um preço por km diferente (o Económico é o mais barato, o Luxo o mais caro). Podes ver os valores atuais em <a href="/precos-horarios">Preços & Horários</a>, ou usar o <a href="/simulador">Simulador</a> para calcular o preço exato da tua viagem antes de reservar.',
      en: 'The price depends on the pickup, drop-off, and the fleet category chosen — there is no fixed price list. We have 4 fleet categories: <strong>Economy</strong>, <strong>Comfort</strong>, <strong>Luxury</strong>, and <strong>Group Van</strong>, each with a different price per km (Economy is the cheapest, Luxury the most expensive). Check current rates on the <a href="/precos-horarios">Pricing & Hours</a> page, or use the <a href="/simulador">Simulator</a> to calculate the exact price of your trip before booking.'
    }
  },
  {
    id: 'frota',
    keywords: ['frota', 'carro', 'carros', 'viatura', 'viaturas', 'suv', 'van', 'sedan', 'economico', 'conforto', 'luxo', 'fleet', 'vehicle', 'vehicles', 'economy', 'comfort', 'luxury'],
    responses: {
      pt: 'A nossa frota tem 4 categorias: <strong>Económico</strong> (Sedan compacto, ideal ponto a ponto), <strong>Conforto</strong> (a escolha mais popular para transfers executivos, até 3-4 passageiros), <strong>Luxo</strong> (viaturas premium para uma experiência superior) e <strong>Van de Grupo</strong> (até 8 passageiros com bagagem). Detalhes em <a href="/frota">Frota</a>.',
      en: 'Our fleet has 4 categories: <strong>Economy</strong> (compact sedan, ideal point-to-point), <strong>Comfort</strong> (the most popular choice for executive transfers, up to 3-4 passengers), <strong>Luxury</strong> (premium vehicles for a superior experience), and <strong>Group Van</strong> (up to 8 passengers with luggage). Details on the <a href="/frota">Fleet</a> page.'
    }
  },
  {
    id: 'simulador',
    keywords: ['simulador', 'simular', 'calcular preco', 'calculadora', 'trajeto', 'rota', 'simulator', 'calculate', 'calculator', 'route'],
    responses: {
      pt: 'Temos um <a href="/simulador">Simulador de Preço</a> onde indicas a origem, o destino e a categoria de frota, e mostramos logo a distância, a duração estimada, o preço, o mapa com o trajeto desenhado e até instruções de condução passo a passo. É a forma mais rápida de saberes quanto custa a tua viagem antes de reservar.',
      en: 'We have a <a href="/simulador">Price Simulator</a> where you enter the pickup, drop-off, and fleet category, and we instantly show the distance, estimated duration, price, a map with the route drawn, and even turn-by-turn driving directions. It\'s the fastest way to know how much your trip costs before booking.'
    }
  },
  {
    id: 'reservar',
    keywords: ['reservar', 'reserva', 'marcar', 'agendar', 'como reservo', 'book', 'booking', 'reserve', 'schedule', 'how do i book'],
    responses: {
      pt: 'É simples: vai à página <a href="/contacto">Reservar</a> e preenche nome, email, telefone, tipo de serviço (aeroporto/executivo/evento), tipo de frota (económico/conforto/luxo/van), origem, destino, data/hora, número de passageiros e notas se precisares. Depois de submeteres, recebes um email de confirmação do pedido e a equipa entra em contacto para fechar os detalhes finais, incluindo o preço.',
      en: "It's simple: go to the <a href=\"/contacto\">Booking</a> page and fill in your name, email, phone, service type (airport/executive/event), fleet type (economy/comfort/luxury/van), pickup, drop-off, date/time, number of passengers, and any notes. After submitting, you'll get a confirmation email and our team will reach out to finalize the details, including the price."
    }
  },
  {
    id: 'horario',
    keywords: ['horario', 'abertos', 'funcionam', 'disponibilidade', 'hours', 'open now', 'available', 'availability', 'schedule', 'feriado'],
    responses: {
      pt: 'Estamos disponíveis <strong>24 horas por dia, todos os dias da semana</strong>, incluindo feriados — podes pedir um transfer a qualquer hora. Mais detalhes em <a href="/precos-horarios">Preços & Horários</a>.',
      en: "We're available <strong>24 hours a day, every day of the week</strong>, including holidays — you can request a transfer at any time. More details on the <a href=\"/precos-horarios\">Pricing & Hours</a> page."
    }
  },
  {
    id: 'conta',
    keywords: ['conta', 'login', 'entrar', 'registar', 'registo', 'criar conta', 'account', 'sign in', 'sign up', 'register'],
    responses: {
      pt: 'Podes criar conta em <a href="/registo">Registo</a> ou entrar em <a href="/login">Entrar</a>. Com conta, consegues ver o histórico e estado de todas as tuas reservas em <a href="/minhas-reservas">As minhas reservas</a>, e abrir pedidos de suporte.',
      en: 'You can create an account at <a href="/registo">Sign up</a> or sign in at <a href="/login">Sign in</a>. With an account, you can see the history and status of all your bookings at <a href="/minhas-reservas">My bookings</a>, and open support requests.'
    }
  },
  {
    id: 'password',
    keywords: ['password', 'esqueci', 'esqueceu', 'recuperar password', 'redefinir', 'forgot password', 'reset password'],
    responses: {
      pt: 'Sem problema — no ecrã de <a href="/login">Entrar</a> clica em "Esqueci-me da password", indica o teu email e recebes um link (válido 1 hora) para escolheres uma nova password.',
      en: 'No worries — on the <a href="/login">Sign in</a> screen click "Forgot password", enter your email, and you\'ll get a link (valid for 1 hour) to set a new password.'
    }
  },
  {
    id: 'suporte',
    keywords: ['suporte', 'ticket', 'problema', 'reclamacao', 'falar com alguem', 'support', 'complaint', 'talk to someone', 'help desk'],
    responses: {
      pt: 'Para além de mim (bot automático), também tens acesso a suporte real: com sessão iniciada, vai a <a href="/suporte">Suporte</a> e abre um novo pedido — é como um chat de tickets, onde a nossa equipa te responde diretamente e recebes email quando houver resposta.',
      en: 'Besides me (automated bot), you also have access to real support: while signed in, go to <a href="/suporte">Support</a> and open a new request — it works like a ticket chat, where our team replies directly and you get an email when there\'s a response.'
    }
  },
  {
    id: 'idioma',
    keywords: ['idioma', 'lingua', 'mudar idioma', 'change language', 'which languages'],
    responses: {
      pt: 'O site tem um seletor "PT / EN" no menu principal — clica para trocar o idioma de todo o site. A preferência fica guardada para a próxima visita.',
      en: 'The site has a "PT / EN" selector in the main menu — click it to switch the whole site\'s language. Your preference is saved for next time.'
    }
  },
  {
    id: 'redes_sociais',
    keywords: ['instagram', 'tiktok', 'redes sociais', 'facebook', 'social media'],
    responses: {
      pt: 'Estamos a preparar as nossas redes sociais (Instagram e TikTok) — os ícones já estão no site, junto ao chat, e em breve vão levar diretamente às nossas contas.',
      en: "We're setting up our social media (Instagram and TikTok) — the icons are already on the site, next to the chat, and will soon link directly to our accounts."
    }
  },
  {
    id: 'contacto',
    keywords: ['contacto', 'contactar', 'telefone', 'email da empresa', 'falar convosco', 'contact us', 'phone number', 'reach you', 'call you'],
    responses: {
      pt: 'Podes contactar-nos por telefone (+351 900 000 000) ou email (reservas@srride.pt), ou preencher o formulário em <a href="/contacto">Reservar</a> — é a forma mais rápida de recebermos um pedido completo.',
      en: 'You can reach us by phone (+351 900 000 000) or email (reservas@srride.pt), or fill out the form on the <a href="/contacto">Booking</a> page — that\'s the fastest way for us to get a complete request.'
    }
  },
  {
    id: 'bagagem',
    keywords: ['bagagem', 'malas', 'mala', 'luggage', 'bags', 'suitcase'],
    responses: {
      pt: 'Podes indicar bagagem extra no campo "Notas adicionais" do formulário de <a href="/contacto">Reserva</a>. Se tiveres muita bagagem, a categoria <strong>Van de Grupo</strong> ou <strong>SUV/Conforto</strong> costuma ter mais espaço — di-lo na reserva para garantirmos o veículo certo.',
      en: 'You can mention extra luggage in the "Additional notes" field on the <a href="/contacto">Booking</a> form. If you have a lot of luggage, the <strong>Group Van</strong> or <strong>Comfort</strong> category usually has more space — mention it when booking so we can assign the right vehicle.'
    }
  },
  {
    id: 'criancas',
    keywords: ['cadeira de bebe', 'crianca', 'criancas', 'bebe', 'child seat', 'baby seat', 'children', 'kids'],
    responses: {
      pt: 'Sim, podes pedir cadeira de bebé/criança — basta indicares isso no campo "Notas adicionais" ao fazeres a reserva, para a equipa preparar tudo antecipadamente.',
      en: 'Yes, you can request a child/baby seat — just mention it in the "Additional notes" field when booking, so our team can prepare it in advance.'
    }
  },
  {
    id: 'capacidade',
    keywords: ['quantas pessoas', 'quantos passageiros', 'capacidade', 'lugares', 'how many people', 'how many passengers', 'seats', 'capacity'],
    responses: {
      pt: 'Depende da categoria: <strong>Económico</strong> e <strong>Conforto</strong> levam confortavelmente até 3-4 passageiros, <strong>Luxo</strong> é pensado para viagens mais exclusivas com o mesmo número, e a <strong>Van de Grupo</strong> leva até 8 passageiros com bagagem. Vê mais em <a href="/frota">Frota</a>.',
      en: 'It depends on the category: <strong>Economy</strong> and <strong>Comfort</strong> comfortably fit up to 3-4 passengers, <strong>Luxury</strong> is designed for more exclusive trips with the same capacity, and the <strong>Group Van</strong> fits up to 8 passengers with luggage. See more on the <a href="/frota">Fleet</a> page.'
    }
  },
  {
    id: 'condutores',
    keywords: ['condutor', 'condutores', 'motorista', 'motoristas', 'quem conduz', 'driver', 'drivers', 'chauffeur'],
    responses: {
      pt: 'Os nossos condutores são escolhidos pelo profissionalismo: conhecem bem as rotas, antecipam o trânsito e mantêm sempre a discrição que um transfer executivo exige. É um dos nossos valores centrais — vê mais em <a href="/sobre">Sobre</a>.',
      en: 'Our drivers are chosen for their professionalism: they know the routes well, anticipate traffic, and always maintain the discretion an executive transfer requires. It\'s one of our core values — see more on the <a href="/sobre">About</a> page.'
    }
  },
  {
    id: 'animais',
    keywords: ['animal', 'animais', 'cao', 'cachorro', 'gato', 'pet', 'pets', 'dog', 'cat'],
    responses: {
      pt: 'Não temos uma política fixa publicada sobre animais de estimação — a forma mais segura é indicares isso nas notas da tua reserva ou contactares-nos diretamente, para confirmarmos com antecedência.',
      en: "We don't have a fixed published policy on pets — the safest way is to mention it in your booking notes or contact us directly, so we can confirm in advance."
    }
  },
  {
    id: 'agradecimento',
    keywords: ['obrigado', 'obrigada', 'valeu', 'thanks', 'thank you'],
    responses: {
      pt: 'De nada! Se precisares de mais alguma coisa, estou por aqui. 🙂',
      en: "You're welcome! Let me know if you need anything else. 🙂"
    }
  },
  {
    id: 'despedida',
    keywords: ['adeus', 'ate logo', 'tchau', 'bye', 'goodbye', 'see you'],
    responses: {
      pt: 'Até já! Boa viagem com a SR Ride. 👋',
      en: 'See you soon! Have a great trip with SR Ride. 👋'
    }
  }
];

const FALLBACK = {
  pt: 'Não tenho a certeza sobre isso, mas posso ajudar com dúvidas sobre serviços, frota, preços, o simulador, como reservar, a tua conta ou suporte. O que gostavas de saber?',
  en: "I'm not sure about that, but I can help with questions about services, fleet, pricing, the simulator, how to book, your account, or support. What would you like to know?"
};

// A pontuação soma o comprimento das frases-chave encontradas (não a contagem),
// para que frases mais específicas e longas pesem mais do que palavras genéricas curtas.
function getBotReply(message) {
  const lang = detectLang(message);
  const normalizedMsg = normalize(message);

  let bestIntent = null;
  let bestScore = 0;

  INTENTS.forEach((intent) => {
    let score = 0;
    intent.keywords.forEach((kw) => {
      if (containsWord(normalizedMsg, kw)) score += normalize(kw).length;
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
