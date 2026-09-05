const express = require('express');
const router = express.Router();
const { getSetting } = require('../config/db');

router.get('/', (req, res) => {
  res.render('home', { title: 'Transferes | Aeroporto & Executivo' });
});

router.get('/servicos', (req, res) => {
  res.render('servicos', { title: 'Serviços | Transferes' });
});

router.get('/frota', (req, res) => {
  res.render('frota', { title: 'Frota | Transferes' });
});

router.get('/sobre', (req, res) => {
  res.render('sobre', { title: 'Sobre | Transferes' });
});

router.get('/contacto', (req, res) => {
  res.render('contacto', { title: 'Reservar | Transferes' });
});

router.get('/precos-horarios', async (req, res) => {
  const precos = await getSetting('precos_texto', 'O valor de cada viagem depende da origem, do destino e do tipo de serviço escolhido. Peça já o seu orçamento sem compromisso através do formulário de reserva.');
  const horarios = await getSetting('horarios_texto', 'Estamos disponíveis 24 horas por dia, todos os dias da semana, incluindo feriados.');
  res.render('precos-horarios', { title: 'Preços & Horários | Transferes', precos, horarios });
});

module.exports = router;
