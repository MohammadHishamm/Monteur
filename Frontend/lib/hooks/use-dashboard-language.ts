import { usePathname } from "next/navigation"
import { RoleEnum } from "~/lib/constants/role"
import { useAuth } from "~/lib/hooks/use-auth"
import { useCurrentLanguage } from "~/lib/hooks/use-current-language"

/**
 * Hook to get the language code for dashboard API requests
 *
 * For admin and moderator: returns null to show all languages
 * For publisher: returns null to show all their own work regardless of language
 * For other users: returns current language
 *
 * This hook should only be used in dashboard routes
 */
export function useDashboardLanguage(): string | null {
  const pathname = usePathname()
  const { roles } = useAuth()
  const currentLang = useCurrentLanguage()

  // Only apply dashboard logic if we're in the dashboard
  const isDashboard = pathname.startsWith("/dashboard")

  if (!isDashboard) {
    return currentLang
  }

  const userRoles = roles()

  // Admin and moderator see all content regardless of language
  if (userRoles?.includes(RoleEnum.ADMIN) || userRoles?.includes(RoleEnum.MODERATOR)) {
    return null // null means don't filter by language
  }


  // For other users, use current language
  return currentLang
}
