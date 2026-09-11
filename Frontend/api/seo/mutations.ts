import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import { matchQueryKey } from "../../lib/api/react-query"
import type { TUpdateSeoOptionsFormData, TUpdateSeoTemplateFormData } from "../../types/seo"
import { seoKeys } from "./keys"

export function useUpdateSeoOption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TUpdateSeoOptionsFormData) => {
      const res = await axios.put<void>(`/seo/options`, data)

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) => {
          return matchQueryKey(queryHash, [
            seoKeys.all(),
          ])
        },
      })
    },
  })
}

export function useUpdateSeoTemplate(templateID?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data?: TUpdateSeoTemplateFormData) => {
      if (!templateID || !data) {
        return
      }

      await axios.put(`/seo/templates/${templateID}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) => {
          return matchQueryKey(queryHash, [
            seoKeys.all(),
          ])
        },
      })
    },
  })
}
