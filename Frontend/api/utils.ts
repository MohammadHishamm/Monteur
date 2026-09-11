import { axios } from "../lib/api/axios";

/**
 * Thin wrapper around axios for simple fetch calls.
 * Throws an Error with a descriptive message on non-2xx responses.
 */
export async function apiFetch<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const res = await axios.request<T>({
    url: path,
    method: options?.method ?? "GET",
    data: options?.body,
  })
  return res.data
}
