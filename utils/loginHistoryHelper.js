const UAParser = require('ua-parser-js');
const axios = require('axios');

/**
 * Parse user agent string to extract browser, device, and OS information
 */
const parseUserAgent = (userAgentString) => {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();
  
  return {
    browser: {
      name: result.browser.name || 'Unknown',
      version: result.browser.version || 'Unknown',
      major: result.browser.major || 'Unknown'
    },
    device: {
      type: result.device.type || 'desktop', // defaults to desktop if not mobile/tablet
      vendor: result.device.vendor || 'Unknown',
      model: result.device.model || 'Unknown'
    },
    os: {
      name: result.os.name || 'Unknown',
      version: result.os.version || 'Unknown'
    }
  };
};

/**
 * Get location information from IP address
 * You can use various IP geolocation services:
 * - ipapi.co (free tier: 1000 requests/day)
 * - ip-api.com (free, no key required)
 * - ipgeolocation.io (requires API key)
 */
const getLocationFromIP = async (ipAddress) => {
  try {
    // Option 1: Using ip-api.com (free, no API key needed)
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,city,timezone,lat,lon`, {
      timeout: 5000
    });
    
    if (response.data.status === 'success') {
      return {
        country: response.data.country || 'Unknown',
        countryCode: response.data.countryCode || 'Unknown',
        region: response.data.region || 'Unknown',
        city: response.data.city || 'Unknown',
        timezone: response.data.timezone || 'Unknown',
        latitude: response.data.lat || null,
        longitude: response.data.lon || null
      };
    }
    
    // Return default location if status is not success
    return {
      country: 'Unknown',
      countryCode: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'Unknown',
      latitude: null,
      longitude: null
    };
  } catch (error) {
    console.error('Error fetching location data:', error.message);
    return {
      country: 'Unknown',
      countryCode: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'Unknown',
      latitude: null,
      longitude: null
    };
  }
};

/**
 * Extract client IP address from request
 * Handles proxies and load balancers
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip ||
         'Unknown';
};

/**
 * Create a complete login history entry
 */
const createLoginHistoryEntry = async (req, provider = 'local', isSuccessful = true) => {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = getClientIP(req);
  const parsedUA = parseUserAgent(userAgent);
  const location = await getLocationFromIP(ipAddress);
  
  return {
    ipAddress,
    userAgent,
    browser: parsedUA.browser,
    device: parsedUA.device,
    os: parsedUA.os,
    location,
    loginTime: new Date(),
    isSuccessful,
    provider,
    metadata: {
      isTrusted: false, // You can implement logic to determine this
      isNewLocation: false // You can implement logic to determine this
    }
  };
};

module.exports = {
  parseUserAgent,
  getLocationFromIP,
  getClientIP,
  createLoginHistoryEntry
};