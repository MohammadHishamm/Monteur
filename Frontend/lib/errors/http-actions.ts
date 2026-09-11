import { AxiosError } from "axios"
import { logger } from "../common"
import { RESOURCE_MESSAGES } from "../constants/error"
import { mapStatus2Message, ResourceType } from "./http"

type HttpStatusError = Error & {
  status: number
  data: {
    message: string
  }
}

function createHttpStatusError(message: string, status: number): HttpStatusError {
  const error = new Error(message) as HttpStatusError
  error.name = "HttpStatusError"
  error.status = status
  error.data = { message }
  return error
}

export function throwAxiosErrorMessage(e: unknown, status: number[] = [], message?: string) {
  const condition =
    status.length > 0
      ? e instanceof AxiosError &&
        ((e.status && status.includes(e.status)) ||
          (e.response?.status && status.includes(e.response?.status)))
      : false

  if (e instanceof AxiosError && condition) {
    throw createHttpStatusError(message ?? e.response?.data.error ?? e.message, e.status ?? 400)
  }
}

export function throwAxiosError(e: unknown, type?: ResourceType) {
  logger({ e })

  if (e instanceof AxiosError) {
    const result = {
      message: "",
      status: e.response?.status ?? 400,
    }

    switch (result.status) {
      case 401:
      case 403:
      case 404:
      case 400:
      case 429:
      case 503:
      case 500:
        result.message = mapStatus2Message(result.status, type)
        break
      default:
        result.message = e.response?.data?.error ?? RESOURCE_MESSAGES.COMMON.UNKNOWN_ERROR
    }

    throw createHttpStatusError(result.message, result.status)
  }

  throw e
}

export function redirectAxiosError(e: unknown, status: number[] = []) {
  if (e instanceof AxiosError && status.length > 0) {
    const errorStatus = e.response?.status ?? e.status

    if (errorStatus && status.includes(errorStatus)) {
      return "/"
    }
  }
}

export function redirectOrThrowAxiosError(e: unknown, status: number[] = [], path: string = "/") {
  if (e instanceof AxiosError && status.length > 0) {
    const errorStatus = e.response?.status ?? e.status
    if (errorStatus && status.includes(errorStatus)) {
      return path
    }
  }

  throw e
}
