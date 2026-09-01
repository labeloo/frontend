import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useCookie, useState } from '#app'

/**
 * The sidebar, the page header, the task pool and the assignment slider all
 * want the same two facts (the project's name and its organization). Before
 * this they each issued their own GET /api/projects/:id on every visit, and
 * the sidebar threw the name away. One record, fetched once, shared.
 */

export interface ProjectRecord {
  id: number
  name: string
  description?: string
  projectType: number
  labelConfig?: { classes: string[] }
  organizationId: number
  createdAt: number
  updatedAt: number
}

interface ProjectResponse {
  data: {
    projects: ProjectRecord
    project_relations: unknown
  }
}

export interface OrganizationUser {
  id: number
  email: string
  isActive: boolean
  role: string
  createdAt: number
}

const projectRequests = new Map<string, Promise<ProjectRecord | null>>()
const userRequests = new Map<string, Promise<OrganizationUser[]>>()

export function useProjectRecord(projectId: MaybeRefOrGetter<string | undefined>) {
  const token = useCookie('auth_token')
  const records = useState<Record<string, ProjectRecord>>('project-records', () => ({}))
  const failures = useState<Record<string, string>>('project-record-errors', () => ({}))

  const id = computed(() => {
    const value = toValue(projectId)
    return value === undefined || value === null ? '' : String(value)
  })

  const project = computed<ProjectRecord | null>(() => (id.value ? records.value[id.value] ?? null : null))
  const organizationId = computed<number | null>(() => project.value?.organizationId ?? null)
  const projectName = computed(() => project.value?.name?.trim() || '')
  const classCount = computed(() => project.value?.labelConfig?.classes?.length ?? 0)
  const loadError = computed<string | null>(() => (id.value ? failures.value[id.value] ?? null : null))

  // Every consumer of this record already ran client-side only; keeping the
  // fetch off the server keeps the auth cookie the single source of identity.
  const load = async (force = false): Promise<ProjectRecord | null> => {
    const key = id.value
    if (!import.meta.client || !key || !token.value) return null
    if (!force && records.value[key]) return records.value[key] as ProjectRecord

    const pending = projectRequests.get(key)
    if (pending && !force) return pending

    const request = (async () => {
      try {
        const response = await $fetch<ProjectResponse>(
          `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${key}`,
          { headers: { Authorization: `Bearer ${token.value}` } }
        )
        const record = response?.data?.projects
        if (!record) throw new Error('This project was not found. It may have been deleted.')
        records.value = { ...records.value, [key]: record }
        const { [key]: _cleared, ...rest } = failures.value
        failures.value = rest
        return record
      } catch (err) {
        failures.value = {
          ...failures.value,
          [key]: err instanceof Error ? err.message : 'Could not load this project.'
        }
        return null
      } finally {
        projectRequests.delete(key)
      }
    })()

    projectRequests.set(key, request)
    return request
  }

  return { project, projectName, organizationId, classCount, loadError, load }
}

export function useOrganizationUsers(organizationId: MaybeRefOrGetter<number | null | undefined>) {
  const token = useCookie('auth_token')
  const byOrg = useState<Record<string, OrganizationUser[]>>('organization-users', () => ({}))
  const failures = useState<Record<string, string>>('organization-users-errors', () => ({}))

  const orgKey = computed(() => {
    const value = toValue(organizationId)
    return value === null || value === undefined ? '' : String(value)
  })

  const users = computed<OrganizationUser[]>(() => (orgKey.value ? byOrg.value[orgKey.value] ?? [] : []))
  const activeUsers = computed(() => users.value.filter(user => user.isActive))
  const loadError = computed<string | null>(() => (orgKey.value ? failures.value[orgKey.value] ?? null : null))

  /** Task rows carry a user id; every screen that shows one wants the address. */
  const emailFor = (userId: number | null | undefined) => {
    if (!userId) return ''
    return users.value.find(user => user.id === userId)?.email || ''
  }

  const load = async (force = false): Promise<OrganizationUser[]> => {
    const key = orgKey.value
    if (!import.meta.client || !key || !token.value) return []
    if (!force && byOrg.value[key]) return byOrg.value[key] as OrganizationUser[]

    const pending = userRequests.get(key)
    if (pending && !force) return pending

    const request = (async () => {
      try {
        const response = await $fetch<{ data: OrganizationUser[] }>(
          import.meta.env.NUXT_PUBLIC_API_URL + '/api/organizationRelations/users',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token.value}`,
              orgId: key
            }
          }
        )
        const list = Array.isArray(response?.data) ? response.data : []
        byOrg.value = { ...byOrg.value, [key]: list }
        const { [key]: _cleared, ...rest } = failures.value
        failures.value = rest
        return list
      } catch (err) {
        failures.value = {
          ...failures.value,
          [key]: err instanceof Error ? err.message : 'Could not load the member list.'
        }
        return []
      } finally {
        userRequests.delete(key)
      }
    })()

    userRequests.set(key, request)
    return request
  }

  return { users, activeUsers, emailFor, loadError, load }
}
