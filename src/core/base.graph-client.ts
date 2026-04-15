import axios, { type AxiosInstance } from "axios";
import { Environment } from "../config/environment";

export abstract class BaseGraphClient {
  protected readonly http: AxiosInstance;
  protected readonly baseUrl: string;

  protected constructor(baseUrl: string = Environment.facebookGraphBaseUrl) {
    this.baseUrl = baseUrl;
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  protected extractMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as
        | { error?: { message?: string } }
        | Record<string, unknown>
        | undefined;

      if (apiError && typeof apiError === "object" && "error" in apiError) {
        return (apiError as { error?: { message?: string } }).error?.message || JSON.stringify(apiError);
      }

      return error.message;
    }

    return error instanceof Error ? error.message : String(error);
  }

  protected async get<T>(path: string, params: Record<string, unknown>): Promise<T> {
    const response = await this.http.get<T>(path, { params });
    return response.data;
  }

  protected async post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    const response = await this.http.post<T>(path, body, { headers });
    return response.data;
  }
}
