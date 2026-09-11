// Chatbot baseado em correspondência de palavras-chave (scoring), sem depender de nenhuma API externa.
// Deteção de idioma: conta palavras/frases típicas de PT/EN/FR/ES no texto do utilizador (accent-insensitive,
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
  pt: ['ola', 'oi', 'obrigado', 'obrigada', 'quanto', 'custa', 'preco', 'servico', 'reserva', 'como', 'onde', 'quando', 'voce', 'tu', 'sim', 'nao', 'ajuda', 'carro', 'viagem', 'aeroporto', 'conta', 'porque', 'qual', 'quais', 'tens', 'tem', 'posso', 'pagar', 'cartao', 'explica', 'sao', 'vossos', 'vossas'],
  en: ['hello', 'hi', 'thanks', 'thank', 'how much', 'price', 'service', 'booking', 'book', 'how', 'where', 'when', 'you', 'yes', 'no', 'help', 'car', 'trip', 'airport', 'account', 'why', 'what', 'which', 'can i', 'pay', 'explain'],
  fr: ['bonjour', 'salut', 'merci', 'combien', 'coute', 'prix', 'service', 'reservation', 'comment', 'ou', 'quand', 'vous', 'oui', 'non', 'aide', 'voiture', 'voyage', 'aeroport', 'compte', 'pourquoi', 'quel', 'quelle', 'puis-je', 'payer', 'explique', 'merci beaucoup', 'est', 'sont', 'avec', 'pour', 'les', 'des'],
  es: ['hola', 'gracias', 'cuanto', 'cuesta', 'precio', 'servicio', 'reserva', 'como', 'donde', 'cuando', 'usted', 'tu', 'si', 'no', 'ayuda', 'coche', 'carro', 'viaje', 'aeropuerto', 'cuenta', 'por que', 'cual', 'cuales', 'puedo', 'pagar', 'explica', 'son', 'esta', 'estan', 'horarios']
};

function detectLang(rawText) {
  const text = normalize(rawText);
  const scores = { pt: 0, en: 0, fr: 0, es: 0 };
  Object.keys(LANG_HINTS).forEach((lang) => {
    LANG_HINTS[lang].forEach((w) => { if (containsWord(text, w)) scores[lang]++; });
  });
  let best = 'pt';
  let bestScore = scores.pt;
  ['en', 'fr', 'es'].forEach((lang) => {
    if (scores[lang] > bestScore) { best = lang; bestScore = scores[lang]; }
  });
  return best;
}

const INTENTS = [
  {
    id: 'ajuda_generica',
    keywords: ['ajuda-me', 'ajudame', 'ajuda', 'preciso de ajuda', 'pode ajudar', 'podes ajudar', 'help me', 'i need help', 'can you help', 'aide-moi', 'aide', 'j\'ai besoin d\'aide', 'pouvez-vous aider', 'ayudame', 'ayuda', 'necesito ayuda', 'puedes ayudar'],
    responses: {
      pt: 'Claro, diz-me em que posso ajudar! Posso explicar em detalhe:<br>• Os nossos <strong>serviços</strong> (aeroporto, executivo, eventos)<br>• As categorias da <strong>frota</strong> (económico, conforto, luxo, van)<br>• <strong>Preços</strong> e como usar o <a href="/simulador">simulador</a><br>• Como <strong>reservar</strong>, pagamentos e cancelamentos<br>• A tua <strong>conta</strong>, password ou reservas<br>• O sistema de <strong>suporte</strong><br>Escreve à vontade, por exemplo "explica-me o transfer executivo" ou "quanto custa a categoria luxo".',
      en: "Sure, tell me what you need! I can explain in detail:<br>• Our <strong>services</strong> (airport, executive, events)<br>• The <strong>fleet</strong> categories (economy, comfort, luxury, van)<br>• <strong>Pricing</strong> and how to use the <a href=\"/simulador\">simulator</a><br>• How to <strong>book</strong>, payments and cancellations<br>• Your <strong>account</strong>, password or bookings<br>• The <strong>support</strong> system<br>Just ask, e.g. \"explain the executive transfer\" or \"how much is the luxury category\".",
      fr: 'Bien sûr, dites-moi comment je peux aider ! Je peux expliquer en détail :<br>• Nos <strong>services</strong> (aéroport, exécutif, événements)<br>• Les catégories de <strong>flotte</strong> (économique, confort, luxe, van)<br>• Les <strong>tarifs</strong> et comment utiliser le <a href="/simulador">simulateur</a><br>• Comment <strong>réserver</strong>, paiements et annulations<br>• Votre <strong>compte</strong>, mot de passe ou réservations<br>• Le système de <strong>support</strong><br>Demandez librement, par exemple "expliquez-moi le transfert exécutif" ou "combien coûte la catégorie luxe".',
      es: 'Claro, dime en qué puedo ayudar. Puedo explicar en detalle:<br>• Nuestros <strong>servicios</strong> (aeropuerto, ejecutivo, eventos)<br>• Las categorías de <strong>flota</strong> (económico, confort, lujo, furgoneta)<br>• <strong>Precios</strong> y cómo usar el <a href="/simulador">simulador</a><br>• Cómo <strong>reservar</strong>, pagos y cancelaciones<br>• Tu <strong>cuenta</strong>, contraseña o reservas<br>• El sistema de <strong>soporte</strong><br>Pregunta con confianza, por ejemplo "explícame el traslado ejecutivo" o "cuánto cuesta la categoría lujo".'
    }
  },
  {
    id: 'cancelamento',
    keywords: ['cancelar', 'cancelo', 'cancelamento', 'desmarcar', 'cancel', 'cancellation', 'annuler', 'annulation', 'cancelacion'],
    responses: {
      pt: 'Se precisares de cancelar ou alterar uma reserva, contacta-nos diretamente por telefone, email, ou abre um pedido em <a href="/suporte">Suporte</a> (se tiveres conta) indicando os detalhes da reserva — a equipa trata do resto.',
      en: 'If you need to cancel or change a booking, contact us directly by phone, email, or open a request at <a href="/suporte">Support</a> (if you have an account) with the booking details — our team will take care of the rest.',
      fr: 'Si vous devez annuler ou modifier une réservation, contactez-nous directement par téléphone, email, ou ouvrez une demande dans <a href="/suporte">Support</a> (si vous avez un compte) avec les détails de la réservation — notre équipe s\'occupe du reste.',
      es: 'Si necesitas cancelar o cambiar una reserva, contáctanos directamente por teléfono, email, o abre una solicitud en <a href="/suporte">Soporte</a> (si tienes cuenta) con los detalles de la reserva — nuestro equipo se encarga del resto.'
    }
  },
  {
    id: 'minhas_reservas',
    keywords: ['minhas reservas', 'as minhas reservas', 'estado da reserva', 'ja responderam', 'my bookings', 'my booking', 'booking status', 'mes reservations', 'statut de la reservation', 'mis reservas', 'estado de la reserva'],
    responses: {
      pt: 'Com sessão iniciada, vai a <a href="/minhas-reservas">As minhas reservas</a> para veres o estado de cada pedido (Pendente, Confirmada, Concluída ou Cancelada) e se a equipa já respondeu.',
      en: 'While signed in, go to <a href="/minhas-reservas">My bookings</a> to see the status of each request (Pending, Confirmed, Completed, or Cancelled) and whether our team has replied.',
      fr: 'Une fois connecté, allez sur <a href="/minhas-reservas">Mes réservations</a> pour voir le statut de chaque demande (En attente, Confirmée, Terminée ou Annulée) et si l\'équipe a déjà répondu.',
      es: 'Con sesión iniciada, ve a <a href="/minhas-reservas">Mis reservas</a> para ver el estado de cada solicitud (Pendiente, Confirmada, Completada o Cancelada) y si el equipo ya ha respondido.'
    }
  },
  {
    id: 'saudacao',
    keywords: ['ola', 'oi', 'boa tarde', 'bom dia', 'boa noite', 'hello', 'hi', 'hey', 'good morning', 'bonjour', 'salut', 'bonsoir', 'hola', 'buenas'],
    responses: {
      pt: 'Olá! Sou o assistente da SR Ride. Posso ajudar com dúvidas sobre serviços, frota, preços, reservas, a tua conta ou o funcionamento do site. O que precisas de saber?',
      en: "Hi there! I'm the SR Ride assistant. I can help with questions about services, fleet, pricing, bookings, your account, or how the site works. What would you like to know?",
      fr: "Bonjour ! Je suis l'assistant SR Ride. Je peux vous aider avec des questions sur les services, la flotte, les tarifs, les réservations, votre compte ou le fonctionnement du site. Que souhaitez-vous savoir ?",
      es: '¡Hola! Soy el asistente de SR Ride. Puedo ayudarte con dudas sobre servicios, flota, precios, reservas, tu cuenta o el funcionamiento del sitio. ¿Qué te gustaría saber?'
    }
  },
  {
    id: 'empresa',
    keywords: ['quem sao', 'sobre a empresa', 'que empresa', 'who are you', 'about the company', 'qui etes-vous', 'a propos de l\'entreprise', 'quienes son', 'sobre la empresa'],
    responses: {
      pt: 'A SR Ride é uma empresa de transfers executivos e de aeroporto sediada em Lisboa, com mais de 8 anos de experiência e 100% de pontualidade. Sabes mais na página <a href="/sobre">Sobre</a>.',
      en: 'SR Ride is an executive and airport transfer company based in Lisbon, with over 8 years of experience and a 100% on-time record. Learn more on the <a href="/sobre">About</a> page.',
      fr: 'SR Ride est une entreprise de transferts exécutifs et aéroport basée à Lisbonne, avec plus de 8 ans d\'expérience et 100% de ponctualité. En savoir plus sur la page <a href="/sobre">À propos</a>.',
      es: 'SR Ride es una empresa de traslados ejecutivos y de aeropuerto con sede en Lisboa, con más de 8 años de experiencia y 100% de puntualidad. Más información en la página <a href="/sobre">Nosotros</a>.'
    }
  },
  {
    id: 'pagamento',
    keywords: ['pagamento', 'pagar', 'cartao', 'dinheiro', 'payment', 'credit card', 'cash', 'pay', 'paiement', 'payer', 'especes', 'pago', 'tarjeta', 'efectivo'],
    responses: {
      pt: 'Não há pagamento online no momento da reserva — o valor final é combinado diretamente com a equipa depois de recebermos o teu pedido.',
      en: "There's no online payment when booking — the final amount is arranged directly with our team after we receive your request.",
      fr: "Il n'y a pas de paiement en ligne lors de la réservation — le montant final est convenu directement avec l'équipe après réception de votre demande.",
      es: 'No hay pago en línea al reservar — el importe final se acuerda directamente con el equipo después de recibir tu solicitud.'
    }
  },
  {
    id: 'servico_aeroporto',
    keywords: ['transfer de aeroporto', 'transfer aeroporto', 'explica o aeroporto', 'airport transfer', 'explain the airport', 'transfert aeroport', 'expliquez l\'aeroport', 'traslado de aeropuerto', 'explica el aeropuerto'],
    responses: {
      pt: 'O <strong>Transfer de Aeroporto</strong> acompanha o teu voo em tempo real, inclui 60 minutos de espera sem custo extra, ajuda com a bagagem, e o condutor espera-te à saída do terminal com uma placa com o teu nome. Reserva em <a href="/contacto">Reservar</a>.',
      en: 'The <strong>Airport Transfer</strong> tracks your flight in real time, includes 60 minutes of free waiting time, luggage help, and the driver waits for you at the terminal exit with a name sign. Book at <a href="/contacto">Booking</a>.',
      fr: 'Le <strong>Transfert Aéroport</strong> suit votre vol en temps réel, inclut 60 minutes d\'attente gratuite, une aide avec les bagages, et le chauffeur vous attend à la sortie du terminal avec une pancarte à votre nom. Réservez sur <a href="/contacto">Réserver</a>.',
      es: 'El <strong>Traslado de Aeropuerto</strong> sigue tu vuelo en tiempo real, incluye 60 minutos de espera gratuita, ayuda con el equipaje, y el conductor te espera a la salida de la terminal con un cartel con tu nombre. Reserva en <a href="/contacto">Reservar</a>.'
    }
  },
  {
    id: 'servico_executivo',
    keywords: ['transfer executivo', 'explica o executivo', 'executive transfer', 'explain the executive', 'transfert executif', 'expliquez l\'executif', 'traslado ejecutivo', 'explica el ejecutivo'],
    responses: {
      pt: 'O <strong>Transfer Executivo</strong> é pensado para reuniões e deslocações profissionais: discrição total, wi-fi a bordo, viaturas de gama alta, e faturação simplificada para empresas. Reserva em <a href="/contacto">Reservar</a>.',
      en: 'The <strong>Executive Transfer</strong> is designed for meetings and business travel: full discretion, on-board wi-fi, high-end vehicles, and simplified invoicing for companies. Book at <a href="/contacto">Booking</a>.',
      fr: 'Le <strong>Transfert Exécutif</strong> est pensé pour les réunions et déplacements professionnels : discrétion totale, wi-fi à bord, véhicules haut de gamme, et facturation simplifiée pour les entreprises. Réservez sur <a href="/contacto">Réserver</a>.',
      es: 'El <strong>Traslado Ejecutivo</strong> está pensado para reuniones y viajes de negocio: discreción total, wi-fi a bordo, vehículos de gama alta, y facturación simplificada para empresas. Reserva en <a href="/contacto">Reservar</a>.'
    }
  },
  {
    id: 'servico_eventos',
    keywords: ['eventos privados', 'evento privado', 'explica os eventos', 'casamento', 'private events', 'wedding', 'evenements prives', 'mariage', 'eventos privados', 'boda'],
    responses: {
      pt: 'O serviço de <strong>Eventos Privados</strong> cobre casamentos, jantares e celebrações. Coordenamos os horários com a organização do evento, viaturas decoradas a pedido, e pacotes para grupos. Reserva em <a href="/contacto">Reservar</a>.',
      en: 'The <strong>Private Events</strong> service covers weddings, dinners, and celebrations. We coordinate timing with the event organizers, offer decorated vehicles on request, and have packages for groups. Book at <a href="/contacto">Booking</a>.',
      fr: 'Le service <strong>Événements Privés</strong> couvre mariages, dîners et célébrations. Nous coordonnons les horaires avec l\'organisation de l\'événement, véhicules décorés sur demande, et forfaits pour groupes. Réservez sur <a href="/contacto">Réserver</a>.',
      es: 'El servicio de <strong>Eventos Privados</strong> cubre bodas, cenas y celebraciones. Coordinamos los horarios con la organización del evento, vehículos decorados bajo petición, y paquetes para grupos. Reserva en <a href="/contacto">Reservar</a>.'
    }
  },
  {
    id: 'servicos_geral',
    keywords: ['servico', 'servicos', 'oferecem', 'tipos de transfer', 'service', 'services', 'what do you offer', 'que proposez-vous', 'servicio', 'que ofrecen'],
    responses: {
      pt: 'Temos 3 tipos de serviço: <strong>Transfer de Aeroporto</strong>, <strong>Transfer Executivo</strong> e <strong>Eventos Privados</strong>. Pergunta sobre um em concreto para mais detalhe, ou vê tudo em <a href="/servicos">Serviços</a>.',
      en: 'We offer 3 service types: <strong>Airport Transfer</strong>, <strong>Executive Transfer</strong>, and <strong>Private Events</strong>. Ask about a specific one for more detail, or see everything on the <a href="/servicos">Services</a> page.',
      fr: 'Nous proposons 3 types de services : <strong>Transfert Aéroport</strong>, <strong>Transfert Exécutif</strong> et <strong>Événements Privés</strong>. Demandez sur l\'un en particulier pour plus de détails, ou voyez tout sur la page <a href="/servicos">Services</a>.',
      es: 'Ofrecemos 3 tipos de servicio: <strong>Traslado de Aeropuerto</strong>, <strong>Traslado Ejecutivo</strong> y <strong>Eventos Privados</strong>. Pregunta por uno en concreto para más detalle, o ve todo en la página <a href="/servicos">Servicios</a>.'
    }
  },
  {
    id: 'frota_economico',
    keywords: ['categoria economico', 'explica o economico', 'economy category', 'explain economy', 'categorie economique', 'categoria economico', 'economico'],
    responses: {
      pt: 'A categoria <strong>Económico</strong> usa um sedan compacto, ideal para 1 a 3 passageiros. É a opção mais acessível — vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Economy</strong> category uses a compact sedan, ideal for 1 to 3 passengers. It\'s the most affordable option — check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.',
      fr: 'La catégorie <strong>Économique</strong> utilise une berline compacte, idéale pour 1 à 3 passagers. C\'est l\'option la plus abordable — voir le tarif actuel sur la page <a href="/precos-horarios">Tarifs & Horaires</a>.',
      es: 'La categoría <strong>Económico</strong> usa un sedán compacto, ideal para 1 a 3 pasajeros. Es la opción más asequible — consulta el precio actual en <a href="/precos-horarios">Precios & Horarios</a>.'
    }
  },
  {
    id: 'frota_conforto',
    keywords: ['categoria conforto', 'explica o conforto', 'comfort category', 'explain comfort', 'categorie confort', 'categoria confort'],
    responses: {
      pt: 'A categoria <strong>Conforto</strong> é a mais popular para transfers executivos — espaçosa, até 3-4 passageiros. Vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Comfort</strong> category is the most popular for executive transfers — spacious, up to 3-4 passengers. Check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.',
      fr: 'La catégorie <strong>Confort</strong> est la plus populaire pour les transferts exécutifs — spacieuse, jusqu\'à 3-4 passagers. Voir le tarif actuel sur <a href="/precos-horarios">Tarifs & Horaires</a>.',
      es: 'La categoría <strong>Confort</strong> es la más popular para traslados ejecutivos — espaciosa, hasta 3-4 pasajeros. Consulta el precio actual en <a href="/precos-horarios">Precios & Horarios</a>.'
    }
  },
  {
    id: 'frota_luxo',
    keywords: ['categoria luxo', 'explica o luxo', 'luxury category', 'explain luxury', 'categorie luxe', 'categoria lujo'],
    responses: {
      pt: 'A categoria <strong>Luxo</strong> usa viaturas premium para uma experiência superior, com o preço por km mais alto. Vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Luxury</strong> category uses premium vehicles for a superior experience, with the highest price per km. Check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.',
      fr: 'La catégorie <strong>Luxe</strong> utilise des véhicules premium pour une expérience supérieure, avec le prix au km le plus élevé. Voir le tarif actuel sur <a href="/precos-horarios">Tarifs & Horaires</a>.',
      es: 'La categoría <strong>Lujo</strong> usa vehículos premium para una experiencia superior, con el precio por km más alto. Consulta el precio actual en <a href="/precos-horarios">Precios & Horarios</a>.'
    }
  },
  {
    id: 'frota_van',
    keywords: ['categoria van', 'explica a van', 'van category', 'explain the van', 'categorie van', 'furgoneta'],
    responses: {
      pt: 'A <strong>Van de Grupo</strong> leva até 8 passageiros com bagagem, ideal para famílias ou pequenos grupos. Vê o valor atual em <a href="/precos-horarios">Preços & Horários</a>.',
      en: 'The <strong>Group Van</strong> fits up to 8 passengers with luggage, ideal for families or small groups. Check the current rate on the <a href="/precos-horarios">Pricing & Hours</a> page.',
      fr: 'Le <strong>Van de Groupe</strong> accueille jusqu\'à 8 passagers avec bagages, idéal pour familles ou petits groupes. Voir le tarif actuel sur <a href="/precos-horarios">Tarifs & Horaires</a>.',
      es: 'La <strong>Furgoneta de Grupo</strong> lleva hasta 8 pasajeros con equipaje, ideal para familias o grupos pequeños. Consulta el precio actual en <a href="/precos-horarios">Precios & Horarios</a>.'
    }
  },
  {
    id: 'frota_geral',
    keywords: ['frota', 'carro', 'carros', 'viatura', 'suv', 'van', 'sedan', 'fleet', 'vehicle', 'flotte', 'vehicule', 'flota', 'vehiculo'],
    responses: {
      pt: 'A nossa frota tem 4 categorias: <strong>Económico</strong>, <strong>Conforto</strong>, <strong>Luxo</strong> e <strong>Van de Grupo</strong>. Pergunta sobre uma em concreto, ou vê tudo em <a href="/frota">Frota</a>.',
      en: 'Our fleet has 4 categories: <strong>Economy</strong>, <strong>Comfort</strong>, <strong>Luxury</strong>, and <strong>Group Van</strong>. Ask about a specific one, or see everything on the <a href="/frota">Fleet</a> page.',
      fr: 'Notre flotte compte 4 catégories : <strong>Économique</strong>, <strong>Confort</strong>, <strong>Luxe</strong> et <strong>Van de Groupe</strong>. Demandez sur l\'une en particulier, ou voyez tout sur <a href="/frota">Flotte</a>.',
      es: 'Nuestra flota tiene 4 categorías: <strong>Económico</strong>, <strong>Confort</strong>, <strong>Lujo</strong> y <strong>Furgoneta de Grupo</strong>. Pregunta por una en concreto, o ve todo en <a href="/frota">Flota</a>.'
    }
  },
  {
    id: 'precos',
    keywords: ['preco', 'precos', 'custa', 'quanto custa', 'valor', 'orcamento', 'price', 'prices', 'cost', 'how much', 'prix', 'combien coute', 'devis', 'precio', 'cuanto cuesta', 'presupuesto'],
    responses: {
      pt: 'O valor depende da origem, do destino e da categoria escolhida. Vê os valores atuais em <a href="/precos-horarios">Preços & Horários</a>, ou usa o <a href="/simulador">Simulador</a> para calcular o preço exato da tua viagem.',
      en: 'The price depends on the pickup, drop-off, and category chosen. Check current rates on the <a href="/precos-horarios">Pricing & Hours</a> page, or use the <a href="/simulador">Simulator</a> to calculate the exact price.',
      fr: 'Le prix dépend du départ, de l\'arrivée et de la catégorie choisie. Consultez les tarifs actuels sur <a href="/precos-horarios">Tarifs & Horaires</a>, ou utilisez le <a href="/simulador">Simulateur</a> pour calculer le prix exact.',
      es: 'El precio depende del origen, el destino y la categoría elegida. Consulta los precios actuales en <a href="/precos-horarios">Precios & Horarios</a>, o usa el <a href="/simulador">Simulador</a> para calcular el precio exacto.'
    }
  },
  {
    id: 'simulador',
    keywords: ['simulador', 'simular', 'calcular preco', 'calculadora', 'trajeto', 'rota', 'simulator', 'calculate', 'route', 'simulateur', 'calculer', 'itineraire', 'calcular precio', 'ruta'],
    responses: {
      pt: 'Temos um <a href="/simulador">Simulador de Preço</a> onde indicas a origem, o destino e a categoria, e mostramos a distância, a duração, o preço e o mapa com o trajeto.',
      en: 'We have a <a href="/simulador">Price Simulator</a> where you enter the pickup, drop-off, and category, and we show the distance, duration, price and a map with the route.',
      fr: 'Nous avons un <a href="/simulador">Simulateur de Prix</a> où vous indiquez le départ, l\'arrivée et la catégorie, et nous affichons la distance, la durée, le prix et une carte avec l\'itinéraire.',
      es: 'Tenemos un <a href="/simulador">Simulador de Precio</a> donde indicas el origen, el destino y la categoría, y mostramos la distancia, la duración, el precio y el mapa con la ruta.'
    }
  },
  {
    id: 'reservar',
    keywords: ['reservar', 'reserva', 'marcar', 'agendar', 'como reservo', 'book', 'booking', 'reserve', 'how do i book', 'reserver', 'comment reserver', 'reservar', 'como reservo'],
    responses: {
      pt: 'É simples: vai à página <a href="/contacto">Reservar</a> e preenche os teus dados, tipo de serviço, tipo de frota, origem, destino e data. Recebes um email de confirmação e a equipa entra em contacto.',
      en: "It's simple: go to the <a href=\"/contacto\">Booking</a> page and fill in your details, service type, fleet type, pickup, drop-off and date. You'll get a confirmation email and our team will reach out.",
      fr: 'C\'est simple : allez sur la page <a href="/contacto">Réserver</a> et remplissez vos coordonnées, type de service, type de flotte, départ, arrivée et date. Vous recevrez un email de confirmation.',
      es: 'Es sencillo: ve a la página <a href="/contacto">Reservar</a> y rellena tus datos, tipo de servicio, tipo de flota, origen, destino y fecha. Recibirás un email de confirmación.'
    }
  },
  {
    id: 'horario',
    keywords: ['horario', 'horarios', 'abertos', 'funcionam', 'disponibilidade', 'hours', 'open now', 'available', 'horaires', 'ouvert', 'disponible', 'abierto', 'disponibilidad'],
    responses: {
      pt: 'Estamos disponíveis <strong>24 horas por dia, todos os dias da semana</strong>. Consulta o horário de cada dia em <a href="/precos-horarios">Preços & Horários</a>.',
      en: "We're available <strong>24 hours a day, every day of the week</strong>. Check each day's schedule on the <a href=\"/precos-horarios\">Pricing & Hours</a> page.",
      fr: 'Nous sommes disponibles <strong>24h/24, tous les jours de la semaine</strong>. Consultez l\'horaire de chaque jour sur <a href="/precos-horarios">Tarifs & Horaires</a>.',
      es: 'Estamos disponibles <strong>24 horas al día, todos los días de la semana</strong>. Consulta el horario de cada día en <a href="/precos-horarios">Precios & Horarios</a>.'
    }
  },
  {
    id: 'conta',
    keywords: ['conta', 'login', 'entrar', 'registar', 'registo', 'criar conta', 'account', 'sign in', 'sign up', 'compte', 'connexion', 's\'inscrire', 'cuenta', 'iniciar sesion', 'registrarse'],
    responses: {
      pt: 'Podes criar conta em <a href="/registo">Registo</a> ou entrar em <a href="/login">Entrar</a>. Com conta, vês o histórico das tuas reservas e abres pedidos de suporte.',
      en: 'You can create an account at <a href="/registo">Sign up</a> or sign in at <a href="/login">Sign in</a>. With an account, you can see your booking history and open support requests.',
      fr: 'Vous pouvez créer un compte sur <a href="/registo">Inscription</a> ou vous connecter sur <a href="/login">Connexion</a>. Avec un compte, vous voyez l\'historique de vos réservations.',
      es: 'Puedes crear una cuenta en <a href="/registo">Registro</a> o iniciar sesión en <a href="/login">Entrar</a>. Con cuenta, ves el historial de tus reservas y abres solicitudes de soporte.'
    }
  },
  {
    id: 'password',
    keywords: ['password', 'esqueci', 'recuperar password', 'redefinir', 'forgot password', 'reset password', 'mot de passe oublie', 'reinitialiser', 'olvide contrasena', 'restablecer'],
    responses: {
      pt: 'No ecrã de <a href="/login">Entrar</a> clica em "Esqueci-me da password", indica o teu email e recebes um link (válido 1 hora) para escolheres uma nova.',
      en: 'On the <a href="/login">Sign in</a> screen click "Forgot password", enter your email, and you\'ll get a link (valid for 1 hour) to set a new one.',
      fr: 'Sur l\'écran <a href="/login">Connexion</a>, cliquez sur "Mot de passe oublié", indiquez votre email et vous recevrez un lien (valable 1 heure) pour en choisir un nouveau.',
      es: 'En la pantalla de <a href="/login">Entrar</a> haz clic en "Olvidé mi contraseña", indica tu email y recibirás un enlace (válido 1 hora) para elegir una nueva.'
    }
  },
  {
    id: 'bagagem',
    keywords: ['bagagem', 'malas', 'luggage', 'bags', 'bagages', 'valises', 'equipaje', 'maletas'],
    responses: {
      pt: 'Podes indicar bagagem extra nas "Notas adicionais" da reserva. Se tiveres muita bagagem, a categoria <strong>Van</strong> ou <strong>Conforto</strong> costuma ter mais espaço.',
      en: 'You can mention extra luggage in the "Additional notes" field. If you have a lot of luggage, the <strong>Van</strong> or <strong>Comfort</strong> category usually has more space.',
      fr: 'Vous pouvez mentionner des bagages supplémentaires dans les "Notes additionnelles". Si vous avez beaucoup de bagages, la catégorie <strong>Van</strong> ou <strong>Confort</strong> a généralement plus d\'espace.',
      es: 'Puedes indicar equipaje extra en las "Notas adicionales". Si tienes mucho equipaje, la categoría <strong>Furgoneta</strong> o <strong>Confort</strong> suele tener más espacio.'
    }
  },
  {
    id: 'criancas',
    keywords: ['cadeira de bebe', 'crianca', 'bebe', 'child seat', 'baby seat', 'siege bebe', 'enfant', 'silla de bebe', 'nino'],
    responses: {
      pt: 'Sim, podes pedir cadeira de bebé/criança — basta indicares isso nas "Notas adicionais" ao fazeres a reserva.',
      en: 'Yes, you can request a child/baby seat — just mention it in the "Additional notes" field when booking.',
      fr: 'Oui, vous pouvez demander un siège bébé/enfant — mentionnez-le simplement dans les "Notes additionnelles" lors de la réservation.',
      es: 'Sí, puedes pedir silla de bebé/niño — solo indícalo en las "Notas adicionales" al hacer la reserva.'
    }
  },
  {
    id: 'capacidade',
    keywords: ['quantas pessoas', 'quantos passageiros', 'capacidade', 'how many people', 'how many passengers', 'seats', 'capacity', 'combien de personnes', 'places', 'cuantas personas', 'capacidad'],
    responses: {
      pt: '<strong>Económico</strong> e <strong>Conforto</strong> levam até 3-4 passageiros, <strong>Luxo</strong> tem a mesma capacidade com mais requinte, e a <strong>Van</strong> leva até 8 passageiros.',
      en: '<strong>Economy</strong> and <strong>Comfort</strong> fit up to 3-4 passengers, <strong>Luxury</strong> has the same capacity with more refinement, and the <strong>Van</strong> fits up to 8 passengers.',
      fr: '<strong>Économique</strong> et <strong>Confort</strong> accueillent jusqu\'à 3-4 passagers, <strong>Luxe</strong> a la même capacité avec plus de raffinement, et le <strong>Van</strong> accueille jusqu\'à 8 passagers.',
      es: '<strong>Económico</strong> y <strong>Confort</strong> llevan hasta 3-4 pasajeros, <strong>Lujo</strong> tiene la misma capacidad con más refinamiento, y la <strong>Furgoneta</strong> lleva hasta 8 pasajeros.'
    }
  },
  {
    id: 'condutores',
    keywords: ['condutor', 'motorista', 'quem conduz', 'driver', 'drivers', 'chauffeur', 'qui conduit', 'conductor', 'quien conduce'],
    responses: {
      pt: 'Os nossos condutores são escolhidos pelo profissionalismo: conhecem as rotas, antecipam o trânsito e mantêm a discrição que um transfer executivo exige.',
      en: 'Our drivers are chosen for their professionalism: they know the routes, anticipate traffic, and maintain the discretion an executive transfer requires.',
      fr: 'Nos chauffeurs sont choisis pour leur professionnalisme : ils connaissent les itinéraires, anticipent la circulation et maintiennent la discrétion requise.',
      es: 'Nuestros conductores se eligen por su profesionalidad: conocen las rutas, se anticipan al tráfico y mantienen la discreción que exige un traslado ejecutivo.'
    }
  },
  {
    id: 'animais',
    keywords: ['animal', 'cao', 'gato', 'pet', 'pets', 'dog', 'cat', 'animaux', 'chien', 'chat', 'mascota', 'perro'],
    responses: {
      pt: 'Não temos uma política fixa publicada sobre animais de estimação — a forma mais segura é indicares isso nas notas da reserva ou contactares-nos diretamente.',
      en: "We don't have a fixed published policy on pets — the safest way is to mention it in your booking notes or contact us directly.",
      fr: "Nous n'avons pas de politique fixe publiée sur les animaux de compagnie — le plus sûr est de le mentionner dans vos notes ou de nous contacter directement.",
      es: 'No tenemos una política fija publicada sobre mascotas — lo más seguro es indicarlo en las notas de la reserva o contactarnos directamente.'
    }
  },
  {
    id: 'suporte',
    keywords: ['suporte', 'ticket', 'problema', 'reclamacao', 'falar com alguem', 'support', 'complaint', 'assistance', 'reclamation', 'soporte', 'reclamo'],
    responses: {
      pt: 'Além de mim, também tens suporte real: com sessão iniciada, vai a <a href="/suporte">Suporte</a> e abre um pedido — a equipa responde diretamente e recebes email quando houver resposta.',
      en: 'Besides me, you also have real support: while signed in, go to <a href="/suporte">Support</a> and open a request — our team replies directly and you get an email when there\'s a response.',
      fr: 'En plus de moi, vous avez aussi un support réel : une fois connecté, allez sur <a href="/suporte">Support</a> et ouvrez une demande — notre équipe répond directement.',
      es: 'Además de mí, también tienes soporte real: con sesión iniciada, ve a <a href="/suporte">Soporte</a> y abre una solicitud — el equipo responde directamente.'
    }
  },
  {
    id: 'idioma',
    keywords: ['idioma', 'lingua', 'mudar idioma', 'change language', 'langue', 'changer de langue', 'idioma', 'cambiar idioma'],
    responses: {
      pt: 'O site tem um seletor "PT / EN / FR / ES" no menu — clica para trocar o idioma de todo o site.',
      en: 'The site has a "PT / EN / FR / ES" selector in the menu — click it to switch the whole site\'s language.',
      fr: 'Le site a un sélecteur "PT / EN / FR / ES" dans le menu — cliquez pour changer la langue de tout le site.',
      es: 'El sitio tiene un selector "PT / EN / FR / ES" en el menú — haz clic para cambiar el idioma de todo el sitio.'
    }
  },
  {
    id: 'redes_sociais',
    keywords: ['instagram', 'tiktok', 'redes sociais', 'social media', 'reseaux sociaux', 'redes sociales'],
    responses: {
      pt: 'Estamos a preparar as nossas redes sociais — os ícones já estão no site, junto ao chat, e em breve vão levar às nossas contas.',
      en: "We're setting up our social media — the icons are already on the site, next to the chat, and will soon link to our accounts.",
      fr: 'Nous préparons nos réseaux sociaux — les icônes sont déjà sur le site, près du chat, et mèneront bientôt à nos comptes.',
      es: 'Estamos preparando nuestras redes sociales — los iconos ya están en el sitio, junto al chat, y pronto llevarán a nuestras cuentas.'
    }
  },
  {
    id: 'contacto',
    keywords: ['contacto', 'contactar', 'telefone', 'contact us', 'phone number', 'contactez-nous', 'telephone', 'contacto', 'telefono'],
    responses: {
      pt: 'Podes contactar-nos por telefone (+351 900 000 000) ou email (reservas@srride.pt), ou preencher o formulário em <a href="/contacto">Reservar</a>.',
      en: 'You can reach us by phone (+351 900 000 000) or email (reservas@srride.pt), or fill out the form on the <a href="/contacto">Booking</a> page.',
      fr: 'Vous pouvez nous contacter par téléphone (+351 900 000 000) ou email (reservas@srride.pt), ou remplir le formulaire sur <a href="/contacto">Réserver</a>.',
      es: 'Puedes contactarnos por teléfono (+351 900 000 000) o email (reservas@srride.pt), o rellenar el formulario en <a href="/contacto">Reservar</a>.'
    }
  },
  {
    id: 'agradecimento',
    keywords: ['obrigado', 'obrigada', 'thanks', 'thank you', 'merci', 'gracias'],
    responses: {
      pt: 'De nada! Se precisares de mais alguma coisa, estou por aqui. 🙂',
      en: "You're welcome! Let me know if you need anything else. 🙂",
      fr: 'De rien ! Si vous avez besoin d\'autre chose, je suis là. 🙂',
      es: '¡De nada! Si necesitas algo más, aquí estoy. 🙂'
    }
  },
  {
    id: 'despedida',
    keywords: ['adeus', 'ate logo', 'bye', 'goodbye', 'au revoir', 'a bientot', 'adios', 'hasta luego'],
    responses: {
      pt: 'Até já! Boa viagem com a SR Ride. 👋',
      en: 'See you soon! Have a great trip with SR Ride. 👋',
      fr: 'À bientôt ! Bon voyage avec SR Ride. 👋',
      es: '¡Hasta pronto! Buen viaje con SR Ride. 👋'
    }
  }
];

const FALLBACK = {
  pt: 'Não tenho a certeza sobre essa pergunta específica, mas sei tudo sobre os nossos serviços, frota, preços, o simulador, reservas, contas e suporte. Tenta perguntar de forma mais direta.',
  en: 'I\'m not sure about that specific question, but I know everything about our services, fleet, pricing, the simulator, bookings, accounts, and support. Try asking more directly.',
  fr: 'Je ne suis pas sûr de cette question précise, mais je connais tout sur nos services, notre flotte, nos tarifs, le simulateur, les réservations, les comptes et le support. Essayez de poser une question plus directe.',
  es: 'No estoy seguro de esa pregunta específica, pero sé todo sobre nuestros servicios, flota, precios, el simulador, reservas, cuentas y soporte. Intenta preguntar de forma más directa.'
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
