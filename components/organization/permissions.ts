/**
 * The eight organization permission flags, said in the words a manager uses.
 * The raw camelCase keys are the API's vocabulary, not the reader's; every
 * screen that shows a role reads its labels from here so they cannot drift.
 */

export interface PermissionFlags {
  admin: boolean
  editOrganization: boolean
  deleteOrganization: boolean
  editMembers: boolean
  editRoles: boolean
  editProjects: boolean
  createProjects: boolean
  deleteProjects: boolean
}

export type PermissionKey = keyof PermissionFlags

export const EMPTY_FLAGS: PermissionFlags = {
  admin: false,
  editOrganization: false,
  deleteOrganization: false,
  editMembers: false,
  editRoles: false,
  editProjects: false,
  createProjects: false,
  deleteProjects: false
}

export interface PermissionDescriptor {
  key: PermissionKey
  label: string
  detail: string
}

export const ADMIN_PERMISSION: PermissionDescriptor = {
  key: 'admin',
  label: 'Full administrator',
  detail: 'Grants every permission below, including deleting the organization.'
}

export const PERMISSION_GROUPS: { title: string; note: string; items: PermissionDescriptor[] }[] = [
  {
    title: 'Organization',
    note: 'Who may change the organization itself.',
    items: [
      { key: 'editOrganization', label: 'Edit organization details', detail: 'Change the name, logo, description and SAM 2 connection.' },
      { key: 'editMembers', label: 'Add and remove members', detail: 'Bring people in, take them out, change their role.' },
      { key: 'editRoles', label: 'Create and change roles', detail: 'Define what other people are allowed to do.' },
      { key: 'deleteOrganization', label: 'Delete the organization', detail: 'Permanently removes every project, task and annotation.' }
    ]
  },
  {
    title: 'Projects and work',
    note: 'Who may set up and dismantle the work itself.',
    items: [
      { key: 'createProjects', label: 'Create projects', detail: 'Start a new dataset and its label classes.' },
      { key: 'editProjects', label: 'Edit projects', detail: 'Change label classes, upload images or video, assign tasks.' },
      { key: 'deleteProjects', label: 'Delete projects', detail: 'Permanently removes a project and its annotations.' }
    ]
  }
]

export const ALL_PERMISSIONS: PermissionDescriptor[] = [
  ADMIN_PERMISSION,
  ...PERMISSION_GROUPS.flatMap(g => g.items)
]

export function permissionLabel(key: string): string {
  return ALL_PERMISSIONS.find(p => p.key === key)?.label
    ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

/**
 * Annotation itself carries no flag in the role model, so a role that looks
 * empty is not a role that can do nothing. Screens that list permissions say
 * this rather than leaving the reader to guess.
 */
export const ANNOTATION_NOTE =
  'Annotating is not a role permission yet: every member can annotate the tasks assigned to them.'

export interface RoleTemplate {
  name: string
  description: string
  summary: string
  flags: PermissionFlags
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Administrator',
    description: 'Runs the organization and everything in it.',
    summary: 'Everything, including deletion.',
    flags: { ...EMPTY_FLAGS, admin: true, editOrganization: true, deleteOrganization: true, editMembers: true, editRoles: true, editProjects: true, createProjects: true, deleteProjects: true }
  },
  {
    name: 'Project manager',
    description: 'Sets up datasets and assigns the work.',
    summary: 'Creates and edits projects, manages members. Cannot delete the organization.',
    flags: { ...EMPTY_FLAGS, editMembers: true, editProjects: true, createProjects: true }
  },
  {
    name: 'Annotator',
    description: 'Labels the tasks assigned to them.',
    summary: 'No management permissions. Annotates assigned tasks.',
    flags: { ...EMPTY_FLAGS }
  }
]

export function enabledPermissionKeys(flags: Partial<PermissionFlags> | null | undefined): PermissionKey[] {
  if (!flags) return []
  return ALL_PERMISSIONS.map(p => p.key).filter(k => flags[k] === true)
}

/** A one-line reading of a role, for tables and pickers. */
export function summarisePermissions(flags: Partial<PermissionFlags> | null | undefined): string {
  if (flags?.admin) return 'Full administrator'
  const keys = enabledPermissionKeys(flags)
  if (keys.length === 0) return 'No management permissions'
  return keys.map(permissionLabel).join(' · ')
}
