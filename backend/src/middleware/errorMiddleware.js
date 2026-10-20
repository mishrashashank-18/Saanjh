const { ZodError } = require('zod');

/**
 * Handle 404 Not Found for unmatched routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Centralized application error handling middleware
 */
function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: formattedErrors[0]?.message || 'Validation error',
      errors: formattedErrors,
    });
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    const fieldName = fields[0] || 'field';
    const friendlyName =
      fieldName === 'email'
        ? 'Email address'
        : fieldName === 'googleId'
        ? 'Google account'
        : fieldName;

    return res.status(409).json({
      success: false,
      message: `An account with this ${friendlyName.toLowerCase()} already exists. Please log in instead.`,
      field: fieldName,
    });
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    return res.status(400).json({
      success: false,
      message: errors[0]?.message || 'Invalid data provided',
      errors,
    });
  }

  // 4. Mongoose Cast Error (Invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for parameter: ${err.path}`,
    });
  }

  // 5. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid session token. Please log in again.',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please log in again.',
    });
  }

  // Default error status and message
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || 'An unexpected internal server error occurred';

  // Log true unexpected 500 internal server errors
  if (statusCode === 500) {
    console.error(`[Saanjh Internal Error 500] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
