/**
 * A task's identity lives in its metadata blob, not in its row id. A pool of
 * three hundred frames pulled from one clip is three hundred identical boxes
 * unless the clip name, the frame number and the timestamp are read back out.
 */

export interface TaskLike {
  id: number
  dataUrl: string
  dataType: string
  status: 'unassigned' | 'annotating' | 'completed'
  assignedTo: number | null
  metadata: string
  createdAt: number
  updatedAt: number
}

export interface TaskMetadata {
  originalFileName?: string
  extractedFrom?: string
  frameIndex?: number
  timestampSeconds?: number
  [key: string]: unknown
}

export const parseTaskMetadata = (metadata: unknown): TaskMetadata => {
  if (!metadata) return {}
  if (typeof metadata === 'object') return metadata as TaskMetadata
  try {
    const parsed = JSON.parse(metadata as string)
    return parsed && typeof parsed === 'object' ? (parsed as TaskMetadata) : {}
  } catch {
    return {}
  }
}

/** The clip a frame came from, or '' for a plain upload. */
export const taskClip = (task: Pick<TaskLike, 'metadata'>): string =>
  parseTaskMetadata(task.metadata).extractedFrom || ''

export const taskFrameIndex = (task: Pick<TaskLike, 'metadata'>): number | null => {
  const index = parseTaskMetadata(task.metadata).frameIndex
  return typeof index === 'number' ? index : null
}

export const formatClipTime = (seconds: number | undefined): string => {
  if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return ''
  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  const tenths = Math.floor((seconds - whole) * 10)
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}.${tenths}`
}

/** The line a person reads first: a file name, or a clip plus frame number. */
export const taskName = (task: Pick<TaskLike, 'id' | 'metadata'>): string => {
  const meta = parseTaskMetadata(task.metadata)
  if (meta.extractedFrom && typeof meta.frameIndex === 'number') {
    return `${meta.extractedFrom} · frame ${String(meta.frameIndex).padStart(4, '0')}`
  }
  return meta.originalFileName || `Sheet ${task.id}`
}

/** A short second line, only when it adds a fact the name does not carry. */
export const taskDetail = (task: Pick<TaskLike, 'metadata'>): string => {
  const meta = parseTaskMetadata(task.metadata)
  if (meta.extractedFrom && typeof meta.timestampSeconds === 'number') {
    return formatClipTime(meta.timestampSeconds)
  }
  return ''
}

/** Frames in clip order first, then everything else by id, so a pool reads. */
export const sortTasksForPool = <T extends TaskLike>(tasks: T[]): T[] =>
  [...tasks].sort((a, b) => {
    const clipA = taskClip(a)
    const clipB = taskClip(b)
    if (clipA !== clipB) return clipA.localeCompare(clipB)
    const frameA = taskFrameIndex(a)
    const frameB = taskFrameIndex(b)
    if (frameA !== null && frameB !== null) return frameA - frameB
    return a.id - b.id
  })

export interface TaskGroup<T extends TaskLike> {
  key: string
  clip: string
  tasks: T[]
}

/**
 * Group a pool by source clip. A single group is returned unlabelled, so a
 * project of plain images never grows a header it does not need.
 */
export const groupTasksByClip = <T extends TaskLike>(tasks: T[]): TaskGroup<T>[] => {
  const sorted = sortTasksForPool(tasks)
  const groups: TaskGroup<T>[] = []
  for (const task of sorted) {
    const clip = taskClip(task)
    const last = groups[groups.length - 1]
    if (last && last.clip === clip) {
      last.tasks.push(task)
    } else {
      groups.push({ key: clip || '__loose__', clip, tasks: [task] })
    }
  }
  return groups
}

export const formatTaskDate = (timestamp: number): string => {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
