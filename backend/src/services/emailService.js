/**
 * Brevo (Sendinblue) Transactional Email Service for Saanjh
 * Uses Brevo v3 REST API (no SMTP)
 */

async function sendVerificationEmail({ email, fullName, code }) {
  // In test environment, bypass actual HTTP dispatch to Brevo
  if (process.env.NODE_ENV === 'test') {
    return { success: true, testMode: true };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'support@saanjh.com';
  const senderName = 'Saanjh';

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_brevo_api_key_here') {
    // Brevo is not configured
    console.warn('[EmailService] Brevo API key is not configured. Email cannot be dispatched.');
    throw new Error("Couldn't send the code, try again");
  }

  const subject = `${code} is your Saanjh verification code`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your Saanjh Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdf8f3; margin: 0; padding: 40px 20px; color: #2b3a3d; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px 36px; border: 1px solid #ebd9c8; box-shadow: 0 10px 30px rgba(45,30,20,0.06); }
    .logo { font-size: 28px; font-weight: 700; color: #0f2a2e; margin-bottom: 24px; display: inline-block; text-decoration: none; font-family: Georgia, serif; }
    .logo span { color: #e27650; }
    h1 { font-family: Georgia, serif; font-size: 24px; color: #0f2a2e; margin: 0 0 14px; font-weight: 600; }
    p { font-size: 15px; line-height: 1.6; color: #5d534b; margin: 0 0 20px; }
    .code-box { background: #faeae0; border: 1px solid #ebd9c8; border-radius: 16px; padding: 22px; text-align: center; margin: 28px 0; }
    .code { font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #e27650; font-family: monospace; display: block; }
    .footer { font-size: 13px; color: #8c827a; margin-top: 32px; border-top: 1px solid #f2e9e1; padding-top: 20px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <a href="#" class="logo">Saanjh<span>.</span></a>
    <h1>Verify your email</h1>
    <p>Hello ${fullName || 'there'},</p>
    <p>Welcome to Saanjh. Use the 6-digit code below to verify your email address and continue setting up your profile.</p>
    
    <div class="code-box">
      <span class="code">${code}</span>
    </div>

    <p>This code <strong>expires in 10 minutes</strong>. For your security, never share this code with anyone.</p>
    <p>If you didn't request this verification code, you can safely ignore this email.</p>

    <div class="footer">
      <p>With care,<br>The Saanjh Team</p>
      <p>© ${new Date().getFullYear()} Saanjh. Calm, meaningful connections.</p>
    </div>
  </div>
</body>
</html>
`;

  const textContent = `Hello ${fullName || 'there'},

Welcome to Saanjh. Your verification code is: ${code}

This code expires in 10 minutes. If you did not request this, please ignore this email.

With care,
The Saanjh Team`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email,
            name: fullName || 'Saanjh Member',
          },
        ],
        subject,
        htmlContent,
        textContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Mask any secrets in logs
      console.error(`[EmailService] Brevo API request failed with status ${response.status}: ${errorText.substring(0, 150)}`);
      throw new Error("Couldn't send the code, try again");
    }

    return { success: true };
  } catch (error) {
    if (error.message !== "Couldn't send the code, try again") {
      console.error('[EmailService] Network or unexpected error calling Brevo:', error.message);
    }
    throw new Error("Couldn't send the code, try again");
  }
}

module.exports = {
  sendVerificationEmail,
};
