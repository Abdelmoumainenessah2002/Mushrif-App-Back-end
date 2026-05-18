const { User } = require('../models/User');

const crypto = require("crypto");

function generateUID(length = 10) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charsetLength = charset.length;

  let uid = "";
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    uid += charset[randomBytes[i] % charsetLength];
  }

  return uid;
}

function buildBaseUsername(firstName, lastName) {
  const cleanFirstName = firstName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const cleanLastName = lastName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return `${cleanFirstName}.${cleanLastName}`;
}

module.exports = {
  generateUID,
  buildBaseUsername
};