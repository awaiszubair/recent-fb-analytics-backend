/**
 * Helper functions for uniform API responses
 */

const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    data,
  });
};

const errorResponse = (res, message = 'Error', statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && { error }),
  });
};

const paginatedResponse = (res, data, pagination, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};
