import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getAuthUserSessionOptions } from "~/api/user/queries"
import { mapSession, type AppSession } from "~/lib/auth/session"
import { RoleEnum, type TRole } from "~/lib/constants/role"
import type { WithCookies } from "~/types/common"
import type { ResWithData } from "~/types/response"
import type { SessionResponse } from "~/types/user"

type AuthResult = {
  session: () => AppSession | undefined
  isLoading: () => boolean
  isAuth: () => boolean
  roles: () => TRole[]
  isRoleAdmin: () => boolean
  isRoleSuperAdmin: () => boolean
  isRoleModerator: () => boolean
  isRoleFreelance: () => boolean
  isRoleAccountant: () => boolean
  query: UseQueryResult<ResWithData<SessionResponse>, AxiosError<{ error: string | string[] }, any>>
}

export function useAuth({ cookie }: WithCookies = {}): AuthResult {
  const query = useQuery(getAuthUserSessionOptions({ cookie }))

  const getSession = (): AppSession | undefined => {
    if (!query.isSuccess) return undefined
    const session = mapSession(query.data)
    return session.authenticated ? session : undefined
  }

  const getRoles = (): TRole[] => {
    return (getSession()?.roles ?? []) as TRole[]
  }

  const hasRole = (role: TRole): boolean => getRoles().includes(role)

  return {
    session: getSession,
    roles: getRoles,
    isLoading: (): boolean => query.isPending,
    isAuth: (): boolean => !!getSession(),
    isRoleAdmin: () => hasRole(RoleEnum.ADMIN) || hasRole(RoleEnum.SUPER_ADMIN),
    isRoleSuperAdmin: () => hasRole(RoleEnum.SUPER_ADMIN),
    isRoleModerator: () => hasRole(RoleEnum.MODERATOR),
    isRoleFreelance: () => hasRole(RoleEnum.FREELANCE),
    isRoleAccountant: () => hasRole(RoleEnum.ACCOUNTANT),
    query,
  }
}
