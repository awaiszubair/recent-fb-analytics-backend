/**
 * Custom Error Handler Middleware
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Wrong MongoDB ID error
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new AppError(message, 400);
  }

  // JWT expired error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Json Web Token is invalid, Try again!';
    err = new AppError(message, 400);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Json Web Token is expired, Try again!';
    err = new AppError(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler, AppError };
