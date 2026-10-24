/**
 * Centralized Error Handling Middleware for Saanjh
 */

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  // If response already committed, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod Validation Errors
  if (err.name === 'ZodError') {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: formattedErrors[0]?.message || 'Input validation failed. Please check your details.',
      errors: formattedErrors,
    });
  }

  // Handle Mongoose Duplicate Key Error (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_ENTRY',
      message: `An account with this ${field} already exists.`,
      field,
    });
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: messages[0] || 'Validation error',
      errors: messages,
    });
  }

  // Handle Rate Limiter Errors (429)
  if (err.statusCode === 429 || err.status === 429) {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      retryAfter: err.retryAfter,
      message: err.message || 'Too many requests. Please take a calm moment and try again shortly.',
    });
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    code: err.code || 'SERVER_ERROR',
    message:
      statusCode === 500 && isProduction
        ? 'Something unexpected happened on our end. Please try again in a few moments.'
        : err.message || 'Internal server error',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
