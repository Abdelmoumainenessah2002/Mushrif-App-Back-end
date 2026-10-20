const langs = require('../i18n');

module.exports = (key, lang = 'en', vars = {}) => {
  const shortLang = typeof lang === 'string' ? lang.slice(0, 2).toLowerCase() : 'en';
  let text = langs[lang]?.[key] || langs[shortLang]?.[key] || langs.en?.[key] || key;

  // replace variables {{var}}
  if (vars && typeof vars === 'object') {
    Object.keys(vars).forEach((k) => {
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]);
    });
  }

  return text;
};
