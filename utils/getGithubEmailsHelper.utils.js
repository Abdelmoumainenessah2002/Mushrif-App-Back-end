const axios = require('axios'); 

async function getGitHubPrimaryEmail(accessToken) {
  const version = '2022-11-28'
  try {
    const response = await axios.get('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': version
      }
    });

    const emails = response.data;

    // Find the primary and verified email
    const primaryObj = emails.find(e => e.primary && e.verified);

    console.log(primaryObj.email);
    
    // Fallback to just primary if verified isn't found, or the first one
    return primaryObj.email ? primaryObj.email : response.data[0]?.email;
  } catch (error) {
    console.error('Error fetching GitHub emails:', error.message);
    return null;
  }
}

module.exports = { getGitHubPrimaryEmail };