// Application constants

module.exports = {
  // Status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Messages
  MESSAGES: {
    SUCCESS: 'Operation successful',
    ERROR: 'An error occurred',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    INVALID_INPUT: 'Invalid input provided',
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // User roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    GUEST: 'guest',
  },
};
