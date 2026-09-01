/**
 * One list of project types, read by the setup page and by every project
 * section, so the same project cannot be printed under two different names on
 * two screens.
 *
 * Only 1 and 2 exist in the API's `project_type` table, and the column is a
 * foreign key, so those are the only two a new project may be given. 3 stays
 * here to name older rows rather than print them as "Unknown".
 */
export interface ProjectTypeOption {
  value: number
  label: string
  description: string
  selectable: boolean
}

export const PROJECT_TYPES: ProjectTypeOption[] = [
  {
    value: 1,
    label: 'Classification',
    description: 'One label for a whole image. The annotator picks a class, not a shape.',
    selectable: true
  },
  {
    value: 2,
    label: 'Object Detection',
    description: 'A shape around each object, inked by its class. Boxes, polygons and SAM 2.',
    selectable: true
  },
  {
    value: 3,
    label: 'Data Analysis',
    description: 'Kept for projects created before this type was withdrawn.',
    selectable: false
  }
]

export const SELECTABLE_PROJECT_TYPES = PROJECT_TYPES.filter(type => type.selectable)

export const projectTypeName = (value?: number | null) =>
  PROJECT_TYPES.find(type => type.value === value)?.label ?? 'Not set'

export const projectTypeOption = (value?: number | null) =>
  PROJECT_TYPES.find(type => type.value === value)
