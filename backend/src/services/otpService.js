const crypto = require('crypto');
const EmailOtp = require('../models/EmailOtp');

function getPepper() {
  return process.env.OTP_PEPPER || 'saanjh_dev_otp_pepper_secret_fallback_key_32chars';
}

function hashCode(code) {
  const pepper = getPepper();
  return crypto.createHmac('sha256', pepper).update(code.trim()).digest('hex');
}

/**
 * Generates a cryptographically secure 6-digit OTP
 */
function generateCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Compares candidate code hash to stored hash using timingSafeEqual
 */
function verifyHash(candidateCode, storedHash) {
  const candidateHash = hashCode(candidateCode);
  const candidateBuffer = Buffer.from(candidateHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}

/**
 * Creates and stores a new OTP for the user, enforcing 60s cooldown and 5/hour limit
 */
async function createOtp({ userId, email }, options = {}) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  // 1. Rate check: Cooldown of 60 seconds from most recent code
  if (!options.skipCooldown) {
    const latestOtp = await EmailOtp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (latestOtp) {
      const elapsedMs = now.getTime() - new Date(latestOtp.createdAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        const err = new Error(`Please wait ${waitSeconds}s before requesting a new code.`);
        err.statusCode = 429;
        err.retryAfter = waitSeconds;
        throw err;
      }
    }
  }

  // 2. Hourly check: max 5 sends per hour per email
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const hourlyCount = await EmailOtp.countDocuments({
    email: normalizedEmail,
    createdAt: { $gte: oneHourAgo },
  });

  if (hourlyCount >= 5) {
    const err = new Error('You have requested too many verification codes. Please try again after an hour.');
    err.statusCode = 429;
    throw err;
  }

  // 3. Invalidate any existing active OTPs for this email / userId
  await EmailOtp.deleteMany({ email: normalizedEmail });

  // 4. Generate fresh 6-digit code and hash
  const rawCode = generateCode();
  const codeHash = hashCode(rawCode);
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes TTL

  await EmailOtp.create({
    userId,
    email: normalizedEmail,
    codeHash,
    expiresAt,
    attempts: 0,
    createdAt: now,
  });

  // Return the raw code ONLY to be sent via email (never returned in API response)
  return { rawCode, expiresAt };
}

/**
 * Validates candidate OTP for the user
 * Returns { valid: boolean, message?: string }
 */
async function verifyOtp({ email, code }) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  const otpRecord = await EmailOtp.findOne({
    email: normalizedEmail,
    expiresAt: { $gt: now },
  });

  if (!otpRecord) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Verification code is invalid or has expired. Please request a new code.',
    };
  }

  // Check attempt count
  if (otpRecord.attempts >= 5) {
    await EmailOtp.deleteOne({ _id: otpRecord._id });
    return {
      valid: false,
      statusCode: 400,
      message: 'Too many incorrect attempts. This code has been invalidated. Please request a new one.',
    };
  }

  const isMatch = verifyHash(code, otpRecord.codeHash);

  if (!isMatch) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 5) {
      await EmailOtp.deleteOne({ _id: otpRecord._id });
      return {
        valid: false,
        statusCode: 400,
        message: 'Too many incorrect attempts. This code has been invalidated. Please request a new one.',
      };
    }
    await otpRecord.save();
    const remaining = 5 - otpRecord.attempts;
    return {
      valid: false,
      statusCode: 400,
      message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Correct code! Remove OTP record to prevent reuse
  await EmailOtp.deleteOne({ _id: otpRecord._id });

  return {
    valid: true,
    userId: otpRecord.userId,
  };
}

module.exports = {
  createOtp,
  verifyOtp,
};
