import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error & { statusCode?: number; name?: string }, _req: Request, res: Response, _next: NextFunction): Response => {
  let normalizedError = err;
  normalizedError.statusCode = normalizedError.statusCode || 500;
  normalizedError.message = normalizedError.message || "Internal Server Error";

  if (normalizedError.name === "CastError") {
    normalizedError = new AppError(`Resource not found. Invalid: ${(normalizedError as { path?: string }).path}`, 400);
  }

  if (normalizedError.name === "JsonWebTokenError") {
    normalizedError = new AppError("Json Web Token is invalid, Try again!", 400);
  }

  if (normalizedError.name === "TokenExpiredError") {
    normalizedError = new AppError("Json Web Token is expired, Try again!", 400);
  }

  return res.status(normalizedError.statusCode || 500).json({
    success: false,
    message: normalizedError.message,
    ...(process.env.NODE_ENV === "development" && { stack: normalizedError.stack }),
  });
};
