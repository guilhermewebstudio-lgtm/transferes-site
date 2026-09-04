const express = require('express');
const router = express.Router();

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

module.exports = router;
