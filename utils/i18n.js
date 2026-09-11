const fs = require('fs');
const path = require('path');

const LINGUAS_SUPORTADAS = ['pt', 'en', 'fr', 'es'];

const dictionaries = {};
LINGUAS_SUPORTADAS.forEach((lang) => {
  dictionaries[lang] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', `${lang}.json`), 'utf8'));
});

function i18nMiddleware(req, res, next) {
  let lang = req.cookies && req.cookies.lang;
  if (!LINGUAS_SUPORTADAS.includes(lang)) lang = 'pt';

  req.lang = lang;
  res.locals.lang = lang;
  res.locals.t = (key) => (dictionaries[lang] && dictionaries[lang][key]) || key;
  next();
}

module.exports = { i18nMiddleware, dictionaries, LINGUAS_SUPORTADAS };
