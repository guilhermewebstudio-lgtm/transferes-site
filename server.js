require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const path = require('path');
const { pool, initDb } = require('./config/db');
const { i18nMiddleware } = require('./utils/i18n');

const app = express();
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(i18nMiddleware);

app.use(session({
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'dev-secret-troca-isto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;
  next();
});

const { requireAuth } = require('./middleware/auth');

app.use('/', require('./routes/pages'));
app.use('/', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

app.get('/conta', requireAuth, (req, res) => {
  res.render('conta', { title: 'A minha conta | Transferes', user: req.session.user });
});

app.get('/lang/:code', (req, res) => {
  const code = req.params.code === 'en' ? 'en' : 'pt';
  res.cookie('lang', code, { maxAge: 1000 * 60 * 60 * 24 * 365, sameSite: 'lax' });
  const back = req.get('Referer') || '/';
  res.redirect(back);
});

app.get('/api/health', (req, res) => res.status(200).send('ok'));

app.use((req, res) => {
  res.status(404).render('404', { title: 'Página não encontrada' });
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
  })
  .catch((err) => {
    console.error('Falha ao iniciar a base de dados:', err);
    app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT} (sem confirmação de DB)`));
  });
