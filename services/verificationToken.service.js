const crypto = require('crypto');
const VerificationToken = require('../models/VerificationToken');

async function createVerificationToken(userId, type, expiresInMinutes = 15) {
  // Delete existing tokens of same type
  await VerificationToken.deleteMany({
    userId,
    type
  });

  const token = crypto.randomBytes(32).toString('hex');

  const expiresAt = new Date(
    Date.now() + expiresInMinutes * 60 * 1000
  );

  await VerificationToken.create({
    userId,
    token,
    type,
    expiresAt
  });

  return token;
}

module.exports = createVerificationToken;
