import { queryOptions } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import type { WithCookies } from "../../types/common"
import type { Project } from "../../types/project"
import type { ResWithData } from "../../types/response"
import { projectKeys } from "./keys"

export function getMyProjects({ cookie }: WithCookies) {
  return queryOptions({
    queryKey: projectKeys.mine(),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Project[]>>("/me/projects", {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getProject({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Project>>(`/projects/${id}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}
