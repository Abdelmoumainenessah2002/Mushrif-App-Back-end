const { User } = require('../Models/User');

async function generateUID() {
  let uid;
  let uidExists = true;
  
  while (uidExists) {
    uid = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Check if UID exists in database
    const existingUser = await User.findOne({ uid: uid });
    if (!existingUser) {
      uidExists = false;
    }
  }
  
  return uid;
}

async function generateUsername(firstName, lastName) {
  // Convert to lowercase and remove spaces/special characters
  const cleanFirstName = firstName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const cleanLastName = lastName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Base username: firstname.lastname
  const baseUsername = `${cleanFirstName}.${cleanLastName}`;
  
  let username = baseUsername;
  let counter = 1;
  
  // Check if username exists in database
  while (await User.findOne({ username: username })) {
    username = `${baseUsername}.${counter}`;
    counter++;
  }
  
  return username;
}

module.exports = {
  generateUID,
  generateUsername
};