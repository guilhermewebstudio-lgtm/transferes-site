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

function containsWord(text, phrase) {
  const pattern = new RegExp('(^|[^a-z0-9])' + escapeRegex(normalize(phrase)) + '($|[^a-z0-9])');
  return pattern.test(' ' + text + ' ');
}

const LANG_HINTS = {
  pt: ['ola', 'oi', 'obrigado', 'obrigada', 'quanto', 'custa', 'preco', 'servico', 'reserva', 'como', 'onde', 'quando', 'voce', 'tu', 'sim', 'nao', 'ajuda', 'carro', 'viagem', 'aeroporto', 'conta', 'porque', 'qual', 'tens', 'tem', 'posso', 'pagar', 'cartao', 'explica'],
  en: ['hello', 'hi', 'thanks', 'thank', 'how much', 'price', 'service', 'booking', 'book', 'how', 'where', 'when', 'you', 'yes', 'no', 'help', 'car', 'trip', 'airport', 'account', 'why', 'what', 'which', 'can i', 'pay', 'explain']
};

function detectLang(rawText) {
  const text = normalize(rawText);
  let ptScore = 0;
  let enScore = 0;
  LANG_HINTS.pt.forEach((w) => { if (containsWord(text, w)) ptScore++; });
  LANG_HINTS.en.forEach((w) => { if (containsWord(text, w)) enScore++; });
  if (enScore > ptScore) return 'en';
  return 'pt';
}

const INTENTS = [
  {
    id: 'ajuda_generica',
    keywords: ['ajuda-me', 'ajudame', 'ajuda', 'preciso de ajuda', 'pode ajudar', 'podes ajudar', 'help me', 'i need help', 'can you help'],
    responses: {
      pt: 'Claro, diz-me em que posso ajudar! Posso explicar em detalhe:<br>• Os nossos <strong>serviços</strong> (aeroporto, executivo, eventos)<br>• As categorias da <strong>frota</strong> (económico, conforto, luxo, van)<br>• <strong>Preços</strong> e como usar o <a href="/simulador">simulador</a><br>• Como <strong>reservar</strong>, pagamentos e cancelamentos<br>• A tua <strong>conta</strong>, password ou reservas<br>• O sistema de <strong>suporte</strong><br>Escreve à vontade, por exemplo "explica-me o transfer executivo" ou "quanto custa a categoria luxo".',
      en: "Sure, tell me what you need! I can explain in detail:<br>• Our <strong>services</strong> (airport, executive, events)<br>• The <strong>fleet</strong> categories (economy, comfort, luxury, van)<br>• <strong>Pricing</strong> and how to use the <a href=\"/simulador\">simulator</a><br>• How to <strong>book</strong>, payments and cancellations<br>• Your <strong>account</strong>, password or bookings<br>• The <strong>support</strong> system<br>Just ask, e.g. \"explain the executive transfer\" or \"how much is the luxury category\"."
    }
  },
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

  /* ---------- Serviços específicos (respostas detalhadas por serviço) ---------- */
  {
    id: 'servico_aeroporto',
    keywords: ['transfer de aeroporto', 'transfer aeroporto', 'servico de aeroporto', 'explica o aeroporto', 'explica-me o aeroporto', 'airport transfer', 'explain the airport'],
    responses: {
      pt: 'O <strong>Transfer de Aeroporto</strong> foi pensado para nunca perderes tempo nem stress: acompanhamos o teu voo em tempo real, por isso atrasos ou chegadas antecipadas não alteram o ponto de encontro. Incluímos 60 minutos de espera sem custo extra, ajuda com a bagagem, e o condutor espera-te à saída do terminal com uma placa com o teu nome. É a opção mais indicada para quem chega ou parte de avião. Reserva em <a href="/contacto">Reservar</a>.',
      en: 'The <strong>Airport Transfer</strong> is designed so you never waste time or stress: we track your flight in real time, so delays or early arrivals don\'t change the pickup point. We include 60 minutes of free waiting time, luggage help, and the driver waits for you at the terminal exit with a name sign. It\'s the best option for anyone flying in or out. Book at <a href="/contacto">Booking</a>.'
    }
  },
  {
    id: 'servico_executivo',
    keywords: ['transfer executivo', 'servico executivo', 'explica o executivo', 'explica-me o executivo', 'executive transfer', 'explain the executive'],
    responses: {
      pt: 'O <strong>Transfer Executivo</strong> é pensado para reuniões, roadshows ou deslocações profissionais entre cidades. Vem com discrição total, wi-fi a bordo para trabalhares durante o trajeto, viaturas de gama alta e recentes, e faturação simplificada se reservares em nome de uma empresa. É a escolha mais popular para quem viaja a trabalho. Reserva em <a href="/contacto">Reservar</a>.',
      en: 'The <strong>Executive Transfer</strong> is designed for meetings, roadshows, or professional intercity travel. It comes with full discretion, on-board wi-fi so you can work during the ride, recent high-end vehicles, and simplified invoicing if booking under a company name. It\'s the most popular choice for business travel. Book at <a href="/contacto">Booking</a>.'
    }
  },
  {
    id: 'servico_eventos',
    keywords: ['eventos privados', 'evento privado', 'explica os eventos', 'explica-me os eventos', 'casamento', 'casamentos', 'jantar', 'private events', 'wedding', 'explain the events'],
    responses: {
      pt: 'O serviço de <strong>Eventos Privados</strong> cobre casamentos, jantares e celebrações onde o transporte também merece cuidado. Coordenamos os horários diretamente com a organização do evento, para que nada falhe, oferecemos viaturas decoradas a pedido, e temos pacotes pensados para grupos e convidados. Reserva em <a href="/contacto">Reservar</a>.',
      en: 'The <strong>Private Events</strong> service covers weddings, dinners, and celebrations where transport also deserves care. We coordinate timing directly with the event organizers so nothing goes wrong, offer vehicles decorated on request, and have packages designed for groups and guests. Book at <a href="/contacto">Booking</a>.'
    }
  },
  {
    id: 'servicos_geral',
    keywords: ['servico', 'servicos', 'oferecem', 'tipos de transfer', 'service', 'services', 'what do you offer', 'what services'],
    responses: {
      pt: 'Temos 3 tipos de serviço: <strong>Transfer de Aeroporto</strong>, <strong>Transfer Executivo</strong> e <strong>Eventos Privados</strong>. Se quiseres, pergunta-me sobre um em concreto (ex: "explica-me o transfer executivo") que dou-te todos os detalhes, ou vê tudo em <a href="/servicos">Serviços</a>.',
      en: 'We offer 3 service types: <strong>Airport Transfer</strong>, <strong>Executive Transfer</strong>, and <strong>Private Events</strong>. Ask me about a specific one (e.g. "explain the executive transfer") for full details, or see everything on the <a href="/servicos">Services</a> page.'
    }
  },

  /* ---------- Frota específica (respostas detalhadas por categoria) ---------- */
  {
    id: 'frota_economico',
    keywords: ['categoria economico', 'explica o economico', 'explica-me o economico', 'economy category', 'explain economy'],
    responses: {
      pt: 'A categoria <strong>Económico</strong> usa um sedan compacto, ideal para trajetos ponto a ponto (ex: aeroporto-hotel) com 1 a 3 passageiros. É a opção mais acessível, com preço por km mais baixo — vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Economy</strong> category uses a compact sedan, ideal for point-to-point trips (e.g. airport-hotel) with 1 to 3 passengers. It\'s the most affordable option, with the lowest price per km — check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.'
    }
  },
  {
    id: 'frota_conforto',
    keywords: ['categoria conforto', 'explica o conforto', 'explica-me o conforto', 'comfort category', 'explain comfort'],
    responses: {
      pt: 'A categoria <strong>Conforto</strong> é a mais popular para transfers executivos — viaturas espaçosas, até 3-4 passageiros, com um equilíbrio entre preço e qualidade. Vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Comfort</strong> category is the most popular for executive transfers — spacious vehicles, up to 3-4 passengers, with a good balance of price and quality. Check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.'
    }
  },
  {
    id: 'frota_luxo',
    keywords: ['categoria luxo', 'explica o luxo', 'explica-me o luxo', 'luxury category', 'explain luxury'],
    responses: {
      pt: 'A categoria <strong>Luxo</strong> usa viaturas premium para uma experiência superior — pensada para quem quer o melhor nível de conforto e apresentação, com o preço por km mais alto das 4 categorias. Vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Luxury</strong> category uses premium vehicles for a superior experience — designed for those who want the best level of comfort and presentation, with the highest price per km of the 4 categories. Check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.'
    }
  },
  {
    id: 'frota_van',
    keywords: ['categoria van', 'explica a van', 'explica-me a van', 'van category', 'explain the van'],
    responses: {
      pt: 'A <strong>Van de Grupo</strong> leva até 8 passageiros com bagagem, ideal para famílias ou pequenos grupos que viajam juntos. Vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Group Van</strong> fits up to 8 passengers with luggage, ideal for families or small groups traveling together. Check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.'
    }
  },
  {
    id: 'frota_geral',
    keywords: ['frota', 'carro', 'carros', 'viatura', 'viaturas', 'suv', 'van', 'sedan', 'fleet', 'vehicle', 'vehicles'],
    responses: {
      pt: 'A nossa frota tem 4 categorias: <strong>Económico</strong>, <strong>Conforto</strong>, <strong>Luxo</strong> e <strong>Van de Grupo</strong>. Pergunta-me sobre uma em concreto (ex: "explica-me a categoria luxo") para mais detalhes, ou vê tudo em <a href="/frota">Frota</a>.',
      en: 'Our fleet has 4 categories: <strong>Economy</strong>, <strong>Comfort</strong>, <strong>Luxury</strong>, and <strong>Group Van</strong>. Ask me about a specific one (e.g. "explain the luxury category") for more detail, or see everything on the <a href="/frota">Fleet</a> page.'
    }
  },

  {
    id: 'precos',
    keywords: ['preco', 'precos', 'custa', 'custo', 'quanto custa', 'valor', 'orcamento', 'tarifa', 'price', 'prices', 'cost', 'how much', 'quote', 'fare'],
    responses: {
      pt: 'O valor depende da origem, do destino e da categoria de frota escolhida — por isso não há uma tabela fixa. Temos 4 categorias: <strong>Económico</strong>, <strong>Conforto</strong>, <strong>Luxo</strong> e <strong>Van de Grupo</strong>, cada uma com um preço por km diferente. Podes ver os valores atuais em <a href="/precos-horarios">Preços & Horários</a>, ou usar o <a href="/simulador">Simulador</a> para calcular o preço exato da tua viagem antes de reservar.',
      en: 'The price depends on the pickup, drop-off, and the fleet category chosen — there is no fixed price list. We have 4 categories: <strong>Economy</strong>, <strong>Comfort</strong>, <strong>Luxury</strong>, and <strong>Group Van</strong>, each with a different price per km. Check current rates on the <a href="/precos-horarios">Pricing & Hours</a> page, or use the <a href="/simulador">Simulator</a> to calculate the exact price of your trip before booking.'
    }
  },
  {
    id: 'simulador',
    keywords: ['simulador', 'simular', 'calcular preco', 'calculadora', 'trajeto', 'rota', 'simulator', 'calculate', 'calculator', 'route'],
    responses: {
      pt: 'Temos um <a href="/simulador">Simulador de Preço</a> onde indicas a origem, o destino e a categoria de frota, e mostramos logo a distância, a duração estimada, o preço, o mapa com o trajeto desenhado e até instruções de condução passo a passo.',
      en: 'We have a <a href="/simulador">Price Simulator</a> where you enter the pickup, drop-off, and fleet category, and we instantly show the distance, estimated duration, price, a map with the route drawn, and even turn-by-turn driving directions.'
    }
  },
  {
    id: 'reservar',
    keywords: ['reservar', 'reserva', 'marcar', 'agendar', 'como reservo', 'book', 'booking', 'reserve', 'schedule', 'how do i book'],
    responses: {
      pt: 'É simples: vai à página <a href="/contacto">Reservar</a> e preenche nome, email, telefone, tipo de serviço (aeroporto/executivo/evento), tipo de frota (económico/conforto/luxo/van), origem, destino, data/hora, número de passageiros e notas se precisares. Depois de submeteres, recebes um email de confirmação e a equipa entra em contacto para fechar os detalhes finais, incluindo o preço.',
      en: "It's simple: go to the <a href=\"/contacto\">Booking</a> page and fill in your name, email, phone, service type, fleet type, pickup, drop-off, date/time, number of passengers, and any notes. After submitting, you'll get a confirmation email and our team will reach out to finalize the details, including the price."
    }
  },
  {
    id: 'horario',
    keywords: ['horario', 'abertos', 'funcionam', 'disponibilidade', 'hours', 'open now', 'available', 'availability', 'schedule', 'feriado'],
    responses: {
      pt: 'Estamos disponíveis <strong>24 horas por dia, todos os dias da semana</strong>, incluindo feriados — podes pedir um transfer a qualquer hora. Consulta o horário de cada dia em <a href="/precos-horarios">Preços & Horários</a>.',
      en: "We're available <strong>24 hours a day, every day of the week</strong>, including holidays. Check each day's schedule on the <a href=\"/precos-horarios\">Pricing & Hours</a> page."
    }
  },
  {
    id: 'conta',
    keywords: ['conta', 'login', 'entrar', 'registar', 'registo', 'criar conta', 'account', 'sign in', 'sign up', 'register'],
    responses: {
      pt: 'Podes criar conta em <a href="/registo">Registo</a> ou entrar em <a href="/login">Entrar</a>. Com conta, consegues ver o histórico e estado de todas as tuas reservas em <a href="/minhas-reservas">As minhas reservas</a>, e abrir pedidos de suporte.',
      en: 'You can create an account at <a href="/registo">Sign up</a> or sign in at <a href="/login">Sign in</a>. With an account, you can see the history and status of all your bookings and open support requests.'
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
    id: 'bagagem',
    keywords: ['bagagem', 'malas', 'mala', 'luggage', 'bags', 'suitcase'],
    responses: {
      pt: 'Podes indicar bagagem extra no campo "Notas adicionais" do formulário de <a href="/contacto">Reserva</a>. Se tiveres muita bagagem, a categoria <strong>Van de Grupo</strong> ou <strong>Conforto</strong> costuma ter mais espaço.',
      en: 'You can mention extra luggage in the "Additional notes" field on the <a href="/contacto">Booking</a> form. If you have a lot of luggage, the <strong>Group Van</strong> or <strong>Comfort</strong> category usually has more space.'
    }
  },
  {
    id: 'criancas',
    keywords: ['cadeira de bebe', 'crianca', 'criancas', 'bebe', 'child seat', 'baby seat', 'children', 'kids'],
    responses: {
      pt: 'Sim, podes pedir cadeira de bebé/criança — basta indicares isso no campo "Notas adicionais" ao fazeres a reserva.',
      en: 'Yes, you can request a child/baby seat — just mention it in the "Additional notes" field when booking.'
    }
  },
  {
    id: 'capacidade',
    keywords: ['quantas pessoas', 'quantos passageiros', 'capacidade', 'lugares', 'how many people', 'how many passengers', 'seats', 'capacity'],
    responses: {
      pt: 'Depende da categoria: <strong>Económico</strong> e <strong>Conforto</strong> levam confortavelmente até 3-4 passageiros, <strong>Luxo</strong> tem a mesma capacidade com mais requinte, e a <strong>Van de Grupo</strong> leva até 8 passageiros com bagagem.',
      en: 'It depends on the category: <strong>Economy</strong> and <strong>Comfort</strong> comfortably fit up to 3-4 passengers, <strong>Luxury</strong> has the same capacity with more refinement, and the <strong>Group Van</strong> fits up to 8 passengers with luggage.'
    }
  },
  {
    id: 'condutores',
    keywords: ['condutor', 'condutores', 'motorista', 'motoristas', 'quem conduz', 'driver', 'drivers', 'chauffeur'],
    responses: {
      pt: 'Os nossos condutores são escolhidos pelo profissionalismo: conhecem bem as rotas, antecipam o trânsito e mantêm sempre a discrição que um transfer executivo exige. É um dos nossos valores centrais — vê mais em <a href="/sobre">Sobre</a>.',
      en: 'Our drivers are chosen for their professionalism: they know the routes well, anticipate traffic, and always maintain discretion. See more on the <a href="/sobre">About</a> page.'
    }
  },
  {
    id: 'animais',
    keywords: ['animal', 'animais', 'cao', 'cachorro', 'gato', 'pet', 'pets', 'dog', 'cat'],
    responses: {
      pt: 'Não temos uma política fixa publicada sobre animais de estimação — a forma mais segura é indicares isso nas notas da tua reserva ou contactares-nos diretamente.',
      en: "We don't have a fixed published policy on pets — the safest way is to mention it in your booking notes or contact us directly."
    }
  },
  {
    id: 'suporte',
    keywords: ['suporte', 'ticket', 'problema', 'reclamacao', 'falar com alguem', 'support', 'complaint', 'talk to someone', 'help desk'],
    responses: {
      pt: 'Para além de mim (bot automático), também tens acesso a suporte real: com sessão iniciada, vai a <a href="/suporte">Suporte</a> e abre um novo pedido — a nossa equipa responde diretamente e recebes email quando houver resposta.',
      en: 'Besides me (automated bot), you also have access to real support: while signed in, go to <a href="/suporte">Support</a> and open a new request — our team replies directly and you get an email when there\'s a response.'
    }
  },
  {
    id: 'idioma',
    keywords: ['idioma', 'lingua', 'mudar idioma', 'change language', 'which languages'],
    responses: {
      pt: 'O site tem um seletor "PT / EN" no menu principal — clica para trocar o idioma de todo o site.',
      en: 'The site has a "PT / EN" selector in the main menu — click it to switch the whole site\'s language.'
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
      pt: 'Podes contactar-nos por telefone (+351 900 000 000) ou email (reservas@srride.pt), ou preencher o formulário em <a href="/contacto">Reservar</a>.',
      en: 'You can reach us by phone (+351 900 000 000) or email (reservas@srride.pt), or fill out the form on the <a href="/contacto">Booking</a> page.'
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
  pt: 'Não tenho a certeza sobre essa pergunta específica, mas sei tudo sobre os nossos serviços, frota, preços, o simulador, reservas, contas e suporte. Tenta perguntar de forma mais direta, por exemplo "quanto custa a categoria luxo" ou "explica-me o transfer executivo".',
  en: 'I\'m not sure about that specific question, but I know everything about our services, fleet, pricing, the simulator, bookings, accounts, and support. Try asking more directly, e.g. "how much is the luxury category" or "explain the executive transfer".'
};

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
