export type NavigationItem = {
  id: number
  name: string
  href: string
  isAllowed?: () => boolean
  isExternal?: boolean
}

export type TResourceStatus = "completed" | "ongoing" | "none"
export type TResourcePublishStatus = "published" | "pending" | "none"

export type TResouorceListDirection = "desc" | "asc"

export type TQueryKeyMeta = Record<string, unknown>

export type WithCookies<T = unknown> = T & {
  cookie?: string | null
}

export type TResourceCount = {
  completed: number
  ongoing: number
  pending: number
  published: number
  total: number
}

export type TResourceCountWithGrowth = {
  current: number
  growth: number
}

export type TResourceStats = {
  totalViews: number
  completionRatePercent: number | null
  returnRatePercent: number | null
}
