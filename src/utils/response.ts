import type { Response } from "express";
import type { ApiResponse, PaginationMeta } from "../types/http";

export class ResponseHelper {
  static successResponse<T>(res: Response<ApiResponse<T>>, data: T, message = "Success", statusCode = 200): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static sendResponse<T>(res: Response<ApiResponse<T>>, statusCode: number, message: string, data: T): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static errorResponse(res: Response<ApiResponse<null>>, message = "Error", statusCode = 500, error: unknown | null = null): Response<ApiResponse<null>> {
    return res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? error : undefined,
      data: null,
    });
  }

  static paginatedResponse<T>(res: Response<ApiResponse<T[]>>, data: T[], pagination: PaginationMeta, message = "Success", statusCode = 200): Response<ApiResponse<T[]>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination,
    });
  }
}

export const successResponse = ResponseHelper.successResponse;
export const sendResponse = ResponseHelper.sendResponse;
export const errorResponse = ResponseHelper.errorResponse;
export const paginatedResponse = ResponseHelper.paginatedResponse;
