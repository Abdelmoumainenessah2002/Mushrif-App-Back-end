// phone.utils.js
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * تحويل والتحقق من أي نمرة في العالم
 * @param {string} fullNumber - النمرة كاملة بالـ + (مثال: +213761234567 أو +14155552671)
 */
function parseGlobalPhoneNumber(fullNumber) {
  if (!fullNumber || typeof fullNumber !== 'string') return null;
  
  let cleanInput = fullNumber.trim();
  
  // نضمنوا برك بلي تبدا بالـ + باش المكتبة تعرف ديريكت واش من بلاد
  if (!cleanInput.startsWith('+')) {
    cleanInput = '+' + cleanInput;
  }

  try {
    // المكتبة هنا ماراحش نعطوها 'DZ'، راح تقرأ الـ + وتعرف البلاد وحدها تلقائياً!
    const phone = parsePhoneNumberFromString(cleanInput);

    if (!phone || !phone.isValid()) {
      return null; // إذا النمرة مشكوك فيها في بلادها، نرجعو null
    }

    return {
      countryCode: '+' + phone.countryCallingCode, // مثل: +1 أو +213
      localNumber: phone.nationalNumber,           // النمرة المحلية الصافية حسب معايير بلادها
      fullNumber: phone.number                     // الفورما العالمية الموحدة E.164
    };

    console.log("Parsed phone number:", {
      countryCode: '+' + phone.countryCallingCode,
      localNumber: phone.nationalNumber,
      fullNumber: phone.number
    });

  } catch (err) {
    return null;
  }
}


/**
 * ✅ Validate + Normalize + Anti-tampering
 * @param {Object} phoneNumber
 */
function validateAndNormalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return { error: "PHONE_REQUIRED" };
  }

  const { countryCode, localNumber, fullNumber } = phoneNumber;

  if (!countryCode || !localNumber || !fullNumber) {
    return { error: "PHONE_FIELDS_REQUIRED" };
  }

  // rebuild الرقم من parts
  const reconstructed = `${countryCode}${localNumber}`;

  // parsing
  const parsedFromParts = parseGlobalPhoneNumber(reconstructed);
  const parsedFromFull = parseGlobalPhoneNumber(fullNumber);

  // invalid format
  if (!parsedFromParts || !parsedFromFull) {
    return { error: "INVALID_PHONE_NUMBER" };
  }

  // ❌ mismatch بين full و parts
  if (parsedFromParts.fullNumber !== parsedFromFull.fullNumber) {
    return { error: "INVALID_PHONE_NUMBER" };
  }

  // ✅ النتيجة النظيفة
  return {
    value: parsedFromParts
  };
}

module.exports = {
  parseGlobalPhoneNumber,
  validateAndNormalizePhoneNumber
};