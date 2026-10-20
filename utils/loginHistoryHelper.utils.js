const UAParser = require('ua-parser-js');
const axios = require('axios');
const redisService = require('../services/redis.service');

// 7-day TTL for IP Geolocation cache (604800 seconds)
const GEO_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Returns default unknown location object
 */
const getDefaultLocation = () => ({
  country: 'Unknown',
  countryCode: 'Unknown',
  region: 'Unknown',
  city: 'Unknown',
  timezone: 'Unknown',
  latitude: null,
  longitude: null
});

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
      type: result.device.type || 'desktop',
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
 * Get location information from IP address with Redis caching (7-day TTL)
 * - Cache Hit: Returns cached location in <1ms without calling external API
 * - Cache Miss: Calls ip-api.com, caches successful result in Redis for 7 days
 * - Fallback: Returns default location on external API or Redis failure
 */
const getLocationFromIP = async (ipAddress) => {
  if (!ipAddress || ipAddress === 'Unknown' || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
    return getDefaultLocation();
  }

  const cacheKey = redisService.buildKey('geo', 'ip', ipAddress);

  // 1. Check Redis Cache
  try {
    const cachedLocation = await redisService.get(cacheKey);
    if (cachedLocation && typeof cachedLocation === 'object' && cachedLocation.country) {
      return cachedLocation;
    }
  } catch (cacheErr) {
    console.warn(`[LoginHistoryHelper] Geolocation cache read error: ${cacheErr.message}`);
  }

  // 2. Cache Miss: Query External Geolocation Service
  try {
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,city,timezone,lat,lon`, {
      timeout: 5000
    });
    
    if (response.data && response.data.status === 'success') {
      const locationData = {
        country: response.data.country || 'Unknown',
        countryCode: response.data.countryCode || 'Unknown',
        region: response.data.region || 'Unknown',
        city: response.data.city || 'Unknown',
        timezone: response.data.timezone || 'Unknown',
        latitude: response.data.lat !== undefined ? response.data.lat : null,
        longitude: response.data.lon !== undefined ? response.data.lon : null
      };

      // Store in Redis with 7-day TTL (async fire-and-forget)
      redisService.set(cacheKey, locationData, GEO_CACHE_TTL_SECONDS).catch(err => {
        console.warn(`[LoginHistoryHelper] Failed to cache geolocation: ${err.message}`);
      });

      return locationData;
    }
    
    return getDefaultLocation();
  } catch (error) {
    console.error('Error fetching location data from external service:', error.message);
    return getDefaultLocation();
  }
};

/**
 * Extract client IP address from request (handles proxies and load balancers)
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
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
      isTrusted: false,
      isNewLocation: false
    }
  };
};

module.exports = {
  parseUserAgent,
  getLocationFromIP,
  getClientIP,
  createLoginHistoryEntry
};