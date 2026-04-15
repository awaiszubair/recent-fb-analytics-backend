import type { RequestHandler } from "express";
import type { Schema } from "joi";

export class ValidationMiddleware {
  static validateRequest(schema: Schema): RequestHandler {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const messages = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: messages,
        });
      }

      req.body = value;
      return next();
    };
  }
}

export const validateRequest = ValidationMiddleware.validateRequest;
