import { isAxiosError } from "axios"
import { RESOURCE_MESSAGES } from "../constants/error"

export type ResourceType = "job" | "proposal" | "project" | "freelancer" | "message"

export interface ErrorResponse {
  details: string
  message: string
  stack?: string
}

type RouteLikeError = {
  status: number
  data?: { message?: string }
}

function isRouteLikeError(error: unknown): error is RouteLikeError {
  if (!error || typeof error !== "object") return false

  const candidate = error as Partial<RouteLikeError>
  return typeof candidate.status === "number"
}

export function isAxiosStatus(error: unknown, status?: number[]): error is import("axios").AxiosError {
  if (!isAxiosError(error)) return false

  if (!status) return true

  return status.includes(error.response?.status as number)
}

export function mapStatus2Message(status: number, type?: ResourceType) {
  switch (status) {
    case 401:
      return RESOURCE_MESSAGES.COMMON.UNAUTHORIZED
    case 403:
      return RESOURCE_MESSAGES.COMMON.FORBIDDEN
    case 404:
      return type === "job"
        ? RESOURCE_MESSAGES.JOB.NOT_FOUND
        : type === "proposal"
          ? RESOURCE_MESSAGES.PROPOSAL.NOT_FOUND
          : type === "project"
            ? RESOURCE_MESSAGES.PROJECT.NOT_FOUND
            : type === "freelancer"
              ? RESOURCE_MESSAGES.FREELANCER.NOT_FOUND
              : type === "message"
                ? RESOURCE_MESSAGES.MESSAGE.NOT_FOUND
                : RESOURCE_MESSAGES.COMMON.NOT_FOUND
    case 400:
      return RESOURCE_MESSAGES.COMMON.INVALID_REQUEST
    case 429:
      return RESOURCE_MESSAGES.COMMON.TOO_MANY_REQUESTS
    case 503:
      return RESOURCE_MESSAGES.COMMON.MAINTENANCE
    case 500:
      return RESOURCE_MESSAGES.COMMON.SERVER_ERROR
    default:
      return RESOURCE_MESSAGES.COMMON.UNKNOWN_ERROR
  }
}

export function resolveBoundaryError(error: unknown): ErrorResponse {
  let message = "400"
  let details = "حدث خطأ غير متوقع."
  let stack: string | undefined

  if (isRouteLikeError(error)) {
    message = error.status === 404 ? "404" : "Error"
    details = error.data?.message ? error.data.message : details
  } else if (error && error instanceof Error && !isAxiosError(error)) {
    details = error.message

    if (process.env.NODE_ENV === "development") {
      stack = error.stack
    }
  } else if (error && isAxiosError(error)) {
    const status = error.response?.status || error.status || 404
    message = `${status}`
    details = mapStatus2Message(status)
  }

  return { message, details, stack }
}
