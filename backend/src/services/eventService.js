const ResponseEvents = require('../models/ResponseEvents');

/**
 * Append-only response events recorder for ML training and audit tracking.
 * Never throws to prevent disrupting core user flows.
 */
async function logResponseEvent({ userId, stage, field, value, previousValue = null, source = 'user_input' }) {
  try {
    if (!userId || !stage || !field) return;
    await ResponseEvents.create({
      userId,
      stage,
      field,
      value,
      previousValue,
      source,
    });
  } catch (err) {
    console.error('[ResponseEvents] Failed to log event:', err.message);
  }
}

module.exports = {
  logResponseEvent,
};
