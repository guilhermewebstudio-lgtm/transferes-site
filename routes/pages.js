const express = require('express');
const router = express.Router();
const { getSetting } = require('../config/db');

router.get('/', (req, res) => {
  res.render('home', { title: 'Sr Transferes | Aeroporto & Executivo' });
});

router.get('/servicos', (req, res) => {
  res.render('servicos', { title: 'Serviços | Sr Transferes' });
});

router.get('/frota', (req, res) => {
  res.render('frota', { title: 'Frota | Sr Transferes' });
});

router.get('/sobre', (req, res) => {
  res.render('sobre', { title: 'Sobre | Sr Transferes' });
});

router.get('/contacto', (req, res) => {
  res.render('contacto', { title: 'Reservar | Sr Transferes' });
});

router.get('/precos-horarios', async (req, res) => {
  const precoEconomico = await getSetting('preco_economico', '0.90');
  const precoConforto = await getSetting('preco_conforto', '1.20');
  const precoLuxo = await getSetting('preco_luxo', '1.60');
  const precoVan = await getSetting('preco_van', '1.30');
  const horarios = await getSetting('horarios_texto', 'Estamos disponíveis 24 horas por dia, todos os dias da semana, incluindo feriados.');
  res.render('precos-horarios', {
    title: 'Preços & Horários | Sr Transferes',
    precoEconomico, precoConforto, precoLuxo, precoVan, horarios
  });
});

router.get('/simulador', (req, res) => {
  res.render('simulador', { title: 'Simulador de Preço | Sr Transferes' });
});

module.exports = router;
