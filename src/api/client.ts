import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import type { ApiResponse, AppError } from "@/api/types";
import { ApiClientError } from "@/utils/error";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || undefined;

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
});

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return Boolean(
    value &&
    typeof value === "object" &&
    "success" in value &&
    "code" in value &&
    "message" in value &&
    "timestamp" in value,
  );
}

function toAppError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    const response = axiosError.response;

    if (response?.data && isApiResponse(response.data)) {
      return {
        code: response.data.code || "REQUEST_ERROR",
        message: response.data.message,
        status: response.status,
        timestamp: response.data.timestamp,
        raw: response.data,
      };
    }

    return {
      code: response ? `HTTP_${response.status}` : "NETWORK_ERROR",
      message: axiosError.message,
      status: response?.status,
      raw: error,
    };
  }

  if (error instanceof Error) {
    return {
      code: "CLIENT_ERROR",
      message: error.message,
      raw: error,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Unknown request error",
    raw: error,
  };
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T>>(config);

    if (!isApiResponse(response.data)) {
      return response.data as T;
    }

    if (!response.data.success) {
      throw new ApiClientError({
        code: response.data.code,
        message: response.data.message,
        status: response.status,
        timestamp: response.data.timestamp,
        raw: response.data,
      });
    }

    return response.data.data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(toAppError(error));
  }
}
