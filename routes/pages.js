const express = require('express');
const router = express.Router();
const { getSetting } = require('../config/db');

router.get('/', (req, res) => {
  res.render('home', { title: 'SR Ride | Aeroporto & Executivo' });
});

router.get('/servicos', (req, res) => {
  res.render('servicos', { title: 'Serviços | SR Ride' });
});

router.get('/frota', (req, res) => {
  res.render('frota', { title: 'Frota | SR Ride' });
});

router.get('/sobre', (req, res) => {
  res.render('sobre', { title: 'Sobre | SR Ride' });
});

router.get('/contacto', (req, res) => {
  res.render('contacto', { title: 'Reservar | SR Ride' });
});

router.get('/precos-horarios', async (req, res) => {
  const precoEconomico = await getSetting('preco_economico', '0.90');
  const precoConforto = await getSetting('preco_conforto', '1.20');
  const precoLuxo = await getSetting('preco_luxo', '1.60');
  const precoVan = await getSetting('preco_van', '1.30');
  const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const horarios = {};
  for (const dia of dias) {
    horarios[dia] = await getSetting(`horario_${dia}`, '24 horas');
  }
  res.render('precos-horarios', {
    title: 'Preços & Horários | SR Ride',
    precoEconomico, precoConforto, precoLuxo, precoVan, horarios
  });
});

router.get('/simulador', (req, res) => {
  res.render('simulador', { title: 'Simulador de Preço | SR Ride' });
});

module.exports = router;
