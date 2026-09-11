import type { SeoOptions, SeoTemplate } from "../../types/seo"
import { createDescription, createTitle } from "../seo"

export type TUseMetadata = {
  title?: string
  description?: string
  options?: SeoOptions
  template?: SeoTemplate
}

export function useMetadata({ title, description, options, template }: TUseMetadata) {
  const _siteName = !template ? options?.data.siteName : undefined
  const _title = createTitle(template?.title || title, {
    fallback: options?.data.title,
    siteName: _siteName,
    separator: options?.settings.separator,
  })
  const _description = createDescription(template?.description || description, {
    siteName: _siteName,
    fallback: options?.data.description,
    separator: options?.settings.separator,
  })

  return { title: _title, description: _description }
}
