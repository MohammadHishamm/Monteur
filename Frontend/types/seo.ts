export type SeoOptions = {
  data: SeoData
  settings: SeoSettings
}

export type SeoData = {
  title: string
  description: string
  faviconURL: string | null
  imageURL: string | null
  robotsFollow: boolean
  robotsIndex: boolean
  siteName: string
  sitemapURL: string | null
}

export type SeoSettings = {
  separator: string
}

export type TUpdateSeoOptionsFormData = {
  name: string
  value?: string
  type: TSeoOption
}

export type TSeoOption = "data" | "setting"

export type TUpdateSeoTemplateFormData = {
  title?: string
  description?: string
  canonicalURL?: string
  robotsIndex?: boolean
  robotsFollow?: boolean
  openGraph?: {
    title?: string
    description?: string
    image?: string
    type?: string
    url?: string
  }
  twitterCard?: {
    card?: string
    title?: string
    description?: string
    image?: string
  }
}

export type TUpdateSeoTemplateFormDataError = Partial<
  Record<keyof TUpdateSeoTemplateFormData, string>
>

export type RawSeoTemplate = {
  id: string
  canonicalURL: string
  description: string
  openGraph: {
    description: string
    image: string
    title: string
    type: TOpenGraphType
    url: string
  }
  robotsFollow: boolean
  robotsIndex: boolean
  title: string
  twitterCard: {
    card: TTwitterCardType
    description: string
    image: string
    title: string
  }
}

export const TOpenGraphTypes = ["website", "article", "video"] as const
export type TOpenGraphType = (typeof TOpenGraphTypes)[number]

export const TTwitterCardTypes = ["summary", "summary_large_image"] as const
export type TTwitterCardType = (typeof TTwitterCardTypes)[number]

export type SeoTemplate = RawSeoTemplate & {
  pageType: TPageType
  createdAt: string
  updatedAt: string
}

export const TPageTypes = [
  "home_page",
  "jobs_page",
  "job_details_page",
  "freelancers_page",
  "freelancer_profile_page",
  "projects_page",
  "project_details_page",
  "proposals_page",
] as const

export type TPageType = (typeof TPageTypes)[number]
