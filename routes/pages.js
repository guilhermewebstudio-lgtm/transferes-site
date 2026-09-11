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
  const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const [precoEconomico, precoConforto, precoLuxo, precoVan, ...valoresDias] = await Promise.all([
    getSetting('preco_economico', '0.90'),
    getSetting('preco_conforto', '1.20'),
    getSetting('preco_luxo', '1.60'),
    getSetting('preco_van', '1.30'),
    ...dias.map((dia) => getSetting(`horario_${dia}`, '24 horas'))
  ]);
  const horarios = {};
  dias.forEach((dia, i) => { horarios[dia] = valoresDias[i]; });

  res.render('precos-horarios', {
    title: 'Preços & Horários | SR Ride',
    precoEconomico, precoConforto, precoLuxo, precoVan, horarios
  });
});

router.get('/simulador', (req, res) => {
  res.render('simulador', { title: 'Simulador de Preço | SR Ride' });
});

module.exports = router;
