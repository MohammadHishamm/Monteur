export type TContentType = "Video Montier" | "AI" | "general"
export type TCreateTitleOptions = {
  fallback?: string
  siteName?: string
  separator?: string
}

export function createTitle(title?: string, options?: TCreateTitleOptions) {
  const { fallback, siteName, separator = "-" } = options || {}

  // Helper to check if title already contains the site name
  const containsSiteName = (text: string, name: string): boolean => {
    if (!name) return false
    const lowerText = text.toLowerCase()
    const lowerName = name.toLowerCase()
    return lowerText.includes(lowerName)
  }

  if (title) {
    // Only append site name if it's not already in the title
    if (siteName && separator && !containsSiteName(title, siteName)) {
      return `${title} ${separator} ${siteName}`
    }
    return title
  }

  if (fallback) {
    // Only append site name if it's not already in the fallback
    if (siteName && separator && !containsSiteName(fallback, siteName)) {
      return `${fallback} ${separator} ${siteName}`
    }
    return fallback
  }

  return siteName || "Montair"
}

export type TCreateDescriptionOptions = {
  maxLength?: number
  append?: string
  siteName?: string
  fallback?: string
  separator?: string
}
export function createDescription(description?: string, options?: TCreateDescriptionOptions) {
  const {
    maxLength = 255,
    fallback = "",
    separator = "-",
    siteName = "Montair",
    append,
  } = options || {}

  if (!description) {
    return `${fallback} ${separator} ${siteName}`
  }

  let finalDescription = description.trim()

  finalDescription = finalDescription.replace(/\s+/g, " ")
  finalDescription = finalDescription.replace(/<[^>]*>/g, "")

  if (finalDescription.length > maxLength) {
    finalDescription = finalDescription.slice(0, maxLength - 3) + "..."
  }

  if (append && finalDescription.length + append.length <= maxLength) {
    finalDescription = `${
      finalDescription.endsWith(".") ? finalDescription : `${finalDescription}.`
    } ${append}`
  }

  return finalDescription
}
