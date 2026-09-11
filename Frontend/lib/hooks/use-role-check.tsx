import { RoleEnum, type TRole } from "~/lib/constants/role"
import { useAuth } from "./use-auth"

export function useRoleCheck() {
  const { roles } = useAuth()

  const hasRole = (requiredRole: TRole) => {
    const userRoles = roles()
    return userRoles?.includes(requiredRole) ?? false
  }

  const isAdmin = () => hasRole(RoleEnum.ADMIN)
  const isModerator = () => hasRole(RoleEnum.MODERATOR)
  // No PUBLISHER role in this app — freelancers use the FREELANCE role
  const isFreelance = () => hasRole(RoleEnum.FREELANCE)
  /** @deprecated use isFreelance instead */
  const isPublisher = isFreelance

  const isOnlyFreelance = () => {
    const userRoles = roles()
    return (
      userRoles?.includes(RoleEnum.FREELANCE) &&
      !userRoles?.includes(RoleEnum.ADMIN) &&
      !userRoles?.includes(RoleEnum.MODERATOR)
    )
  }
  /** @deprecated use isOnlyFreelance instead */
  const isOnlyPublisher = isOnlyFreelance

  const canAccessAdminPanel = () => isAdmin() || isModerator()

  return {
    hasRole,
    isAdmin,
    isModerator,
    isFreelance,
    isPublisher,
    isOnlyFreelance,
    isOnlyPublisher,
    canAccessAdminPanel,
  }
}
