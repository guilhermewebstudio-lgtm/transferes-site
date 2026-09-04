const fs = require('fs');
const path = require('path');

const dictionaries = {
  pt: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'pt.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'en.json'), 'utf8'))
};

function i18nMiddleware(req, res, next) {
  let lang = req.cookies && req.cookies.lang;
  if (lang !== 'pt' && lang !== 'en') lang = 'pt';

  req.lang = lang;
  res.locals.lang = lang;
  res.locals.t = (key) => (dictionaries[lang] && dictionaries[lang][key]) || key;
  next();
}

module.exports = { i18nMiddleware, dictionaries };
