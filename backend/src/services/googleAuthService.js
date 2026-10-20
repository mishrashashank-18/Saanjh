const { OAuth2Client } = require('google-auth-library');

let oauth2ClientInstance = null;

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.trim() === '') {
    return null;
  }
  if (!oauth2ClientInstance) {
    oauth2ClientInstance = new OAuth2Client(clientId);
  }
  return oauth2ClientInstance;
}

/**
 * Verifies a Google ID token received from Google Identity Services on the frontend.
 * @param {string} token - The raw Google ID token string
 * @returns {Promise<{ googleId: string, email: string, emailVerified: boolean, fullName: string, profilePhoto: string }>}
 */
async function verifyGoogleIdToken(token) {
  if (!token) {
    const error = new Error('Google token is required');
    error.statusCode = 400;
    throw error;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.trim() === '') {
    const error = new Error(
      'Google Login is not configured on the server yet. Please add GOOGLE_CLIENT_ID to backend/.env.'
    );
    error.statusCode = 503;
    throw error;
  }

  const client = getOAuthClient();

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      const error = new Error('Invalid Google token payload');
      error.statusCode = 401;
      throw error;
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      emailVerified: Boolean(payload.email_verified),
      fullName: payload.name || payload.given_name || 'Saanjh Member',
      profilePhoto: payload.picture || '',
    };
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    const error = new Error(`Failed to verify Google token: ${err.message}`);
    error.statusCode = 401;
    throw error;
  }
}

module.exports = {
  verifyGoogleIdToken,
};
