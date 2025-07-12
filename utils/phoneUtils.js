// Helper function to parse phone number into structured format
function parsePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null;
  
  // Remove all non-digit characters except + at the beginning
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it starts with +, extract country code
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.substring(1);
    
    // Common country code patterns - you can extend this
    const countryCodePatterns = [
      { code: '1', length: 11, name: 'US/Canada' },
      { code: '213', length: 12, name: 'Algeria' },
      { code: '33', length: 11, name: 'France' },
      { code: '44', length: 12, name: 'UK' },
      { code: '49', length: 12, name: 'Germany' },
      { code: '86', length: 13, name: 'China' },
      { code: '91', length: 12, name: 'India' }
    ];
    
    // Find matching country code
    for (const pattern of countryCodePatterns) {
      if (withoutPlus.startsWith(pattern.code) && withoutPlus.length >= pattern.length - 1) {
        return {
          countryCode: '+' + pattern.code,
          localNumber: withoutPlus.substring(pattern.code.length),
          fullNumber: cleaned
        };
      }
    }
    
    // Generic parsing for other countries (assume 2-3 digit country code)
    let countryCodeLength = 2;
    if (withoutPlus.length > 10) countryCodeLength = 3;
    
    const countryCode = '+' + withoutPlus.substring(0, countryCodeLength);
    const localNumber = withoutPlus.substring(countryCodeLength);
    
    return {
      countryCode,
      localNumber,
      fullNumber: cleaned
    };
  } else {
    // No country code provided, assume local number
    return {
      countryCode: null,
      localNumber: cleaned,
      fullNumber: cleaned
    };
  }
}

// Helper function to format phone number object to string for validation
function formatPhoneNumber(phoneObj) {
  if (!phoneObj || typeof phoneObj !== 'object') return null;
  
  if (phoneObj.fullNumber) {
    return phoneObj.fullNumber;
  } else if (phoneObj.countryCode && phoneObj.localNumber) {
    return phoneObj.countryCode + phoneObj.localNumber;
  } else if (phoneObj.localNumber) {
    return phoneObj.localNumber;
  }
  
  return null;
}

module.exports = {
  parsePhoneNumber,
  formatPhoneNumber
};
