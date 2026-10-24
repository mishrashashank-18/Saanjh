/**
 * Environment Variables Validator for Saanjh Backend
 */

const requiredVars = [
  'MONGODB_URI',
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'OTP_PEPPER',
  'GEMINI_API_KEY',
];

function validateEnv() {
  const missing = [];
  for (const v of requiredVars) {
    if (!process.env[v] || process.env[v].trim() === '') {
      missing.push(v);
    }
  }

  if (missing.length > 0) {
    const errorMsg =
      `\n======================================================\n` +
      `[Saanjh Backend Error] Missing required environment variables:\n` +
      missing.map((v) => `  - ${v}`).join('\n') +
      `\n\nPlease configure these in backend/.env before running the server.\n` +
      `Refer to backend/.env.example for required definitions.\n` +
      `======================================================\n`;

    if (process.env.NODE_ENV === 'production') {
      console.error(errorMsg);
      process.exit(1);
    } else {
      console.warn(errorMsg);
    }
  }

  return missing;
}

module.exports = {
  validateEnv,
  requiredVars,
};
