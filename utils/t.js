const langs = require('../i18n');

module.exports = (key, lang = 'en', vars = {}) => {
  let text = langs[lang]?.[key] || langs.en[key] || key;

  // replace variables {{var}}
  Object.keys(vars).forEach((k) => {
    text = text.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]);
  });

  return text;
};
