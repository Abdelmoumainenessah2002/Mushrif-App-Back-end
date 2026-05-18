// phone.utils.js
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Parse & normalize phone number
 * @param {string} 
 * @param {string} 
 */
function parsePhoneNumber(input, country = 'DZ') {
  if (!input || typeof input !== 'string') return null;

  try {
    const phone = parsePhoneNumberFromString(input, country);

    if (!phone || !phone.isValid()) {
      return null;
    }

    return {
      country: phone.country,                 // DZ
      countryCode: '+' + phone.countryCallingCode, // +213
      nationalNumber: phone.nationalNumber,   // 666826326
      number: phone.number,                   // +213666826326 (E.164)
      international: phone.formatInternational(), // +213 666 82 63 26
      national: phone.formatNational(),       // 0666 82 63 26
    };

  } catch (err) {
    return null;
  }
}

/**
 * Format any phone input to E.164 (for DB storage)
 * @param {string|object} input
 * @param {string} country
 */
function formatPhoneNumber(input, country = 'DZ') {
  try {
    // إذا جاء object من parsePhoneNumber
    if (typeof input === 'object' && input.number) {
      return input.number; // already E.164
    }

    const phone = parsePhoneNumberFromString(input, country);

    if (!phone || !phone.isValid()) {
      return null;
    }

    return phone.number; // +213XXXXXXXXX

  } catch (err) {
    return null;
  }
}

module.exports = {
  parsePhoneNumber,
  formatPhoneNumber
};