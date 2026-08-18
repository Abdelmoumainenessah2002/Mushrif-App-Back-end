const bcrypt = require('bcryptjs');
const OTP = require('../models/OTP');


async function createOTP(userId, target, type, expiresInMinutes) {
  // 1. dekete the old OTPs of the user
  await OTP.deleteMany({ userId, type });

  // 2. Generate a random number of 6 numbers
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(otpCode);

  // 3. Hash the code before save it 
  const salt = await bcrypt.genSalt(10);
  const codeHash = await bcrypt.hash(otpCode, salt);

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // 4. Save the code
  await OTP.create({
    userId,
    target, // 'email' or 'phone'
    type,   // 'CHANGE_EMAIL' or 'LOGIN'
    codeHash,
    expiresAt
  });

  // save the hashed code in DB and return the Plain code to the user
  return otpCode;
}


// verify if the OTP code is correct
async function verifyOTP(userId, type, target, code) {
  const otpRecord = await OTP.findOne({ userId, type, target });

  if (!otpRecord) {
    return false;
  }

  const isMatch = await bcrypt.compare(code, otpRecord.codeHash);
  return isMatch;
}

module.exports = {
  createOTP,
  verifyOTP
};