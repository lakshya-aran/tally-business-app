export default class AppError extends Error {
  /**
   * @param {string} message  Human-readable message safe to show to the client.
   * @param {number} statusCode HTTP status.
   * @param {string} [code] Machine-readable error code the client can branch on.
   * @param {unknown} [details] Extra structured info (e.g. field errors).
   */
  constructor(message, statusCode = 500, code = 'ERROR', details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(msg, details) {
    return new AppError(msg, 400, 'BAD_REQUEST', details);
  }
  static unauthorized(msg = 'Authentication required') {
    return new AppError(msg, 401, 'UNAUTHORIZED');
  }
  static forbidden(msg = 'You do not have permission to perform this action') {
    return new AppError(msg, 403, 'FORBIDDEN');
  }
  static notFound(msg = 'Resource not found') {
    return new AppError(msg, 404, 'NOT_FOUND');
  }
  static conflict(msg) {
    return new AppError(msg, 409, 'CONFLICT');
  }
}
