<script setup lang="ts">
/**
 * Video object tracking.
 *
 * Click an object on one frame, press Track, and SAM 2 follows it through the
 * clip. The frames are the same tasks the extractor created, so whatever is
 * tracked here is saved as ordinary annotations on those tasks - there is no
 * separate video data model.
 *
 * One index space, everywhere: masks and prompt points are keyed by the frame's
 * position in `frames`, which is the order the clip was uploaded to SAM 2 in and
 * the order the service answers in. The extractor's own `frameIndex` (0, 30, 60
 * at 1 fps) only ever travels to the API as metadata. Mixing the two meant a
 * long run wrote one frame and still reported success.
 */
import { onBeforeRouteLeave } from 'vue-router'
import { getFullApiUrl } from '~/utils/url'
import { inkForClass, UNASSIGNED_INK } from '~/utils/inks'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const projectId = computed(() => String(route.params.projectId))
const token = useCookie('auth_token')
const runtimeConfig = useRuntimeConfig()

type Frame = {
  taskId: number
  url: string
  frameIndex: number
  timestampSeconds: number
}
type TrackedObject = { objId: number; className: string | null }
type Polygon = { points: { x: number; y: number }[] }

// Tracked objects take inks from the same list the image canvas draws with, so a
// cyan mask means the same thing on both screens.

const loading = ref(true)
const error = ref<string | null>(null)
const projectName = ref('')
const classes = ref<string[]>([])

/** Frames grouped by the video they came from. */
const videos = ref<Record<string, Frame[]>>({})
const selectedVideo = ref<string | null>(null)
const frames = computed(() => (selectedVideo.value ? videos.value[selectedVideo.value] || [] : []))

const currentIndex = ref(0)
const currentFrame = computed(() => frames.value[currentIndex.value] || null)

const sessionId = ref<string | null>(null)
const sessionDevice = ref<string | null>(null)
const preparing = ref(false)
const prepareProgress = ref(0)

const objects = ref<TrackedObject[]>([])
const activeObjectId = ref(1)
/** frame position -> objId -> polygons, in original frame pixels. */
const masks = ref<Record<number, Record<number, Polygon[]>>>({})
/** Prompt points the user placed, for display: frame position -> points. */
const promptPoints = ref<Record<number, { objId: number; x: number; y: number; label: number }[]>>({})

const tracking = ref(false)
const trackedCount = ref(0)
/** Frames this run will cover - the whole clip, or the tail after "track from here". */
const trackTotal = ref(0)
const saving = ref(false)
/** Masks exist that no annotation record holds yet. */
const unsavedWork = ref(false)

const imageEl = ref<HTMLImageElement | null>(null)

/**
 * The plate takes the room the stage gives it.
 *
 * The mask overlay is an SVG pinned to the image's own box, so the wrapper has
 * to keep hugging the image; the image is capped instead. Without this the frame
 * rendered at its natural size - a 320px clip stranded in a 1200px stage, where
 * a prompt point cannot be placed accurately.
 */
const stageBox = ref<HTMLElement | null>(null)
const plateMax = ref({ width: 960, height: 620 })
let plateObserver: ResizeObserver | null = null

/**
 * The frame is scaled to the stage, up as well as down.
 *
 * Capping with max-width only ever shrinks: a 320px clip stayed 320px in a
 * 1200px stage, which is where a prompt point cannot be placed accurately.
 * Explicit width and height keep the wrapper hugging the image, so the SVG mask
 * overlay stays pinned to it.
 */
const plateStyle = computed(() => {
  const natural = naturalSize.value
  if (!natural.width || !natural.height) return { maxWidth: '100%', maxHeight: '100%' }
  const scale = Math.min(plateMax.value.width / natural.width, plateMax.value.height / natural.height)
  return {
    width: `${Math.round(natural.width * scale)}px`,
    height: `${Math.round(natural.height * scale)}px`,
    // A belt on top of the measurement: whatever the observer last reported, the
    // plate can never paint outside the stage it sits in.
    maxWidth: '100%',
    maxHeight: '100%'
  }
})

/** Honest time: measured from this run, not guessed. */
const trackStartedAt = ref(0)
const trackingLabel = computed(() => {
  if (!tracking.value) return ''
  const done = trackedCount.value
  const total = trackTotal.value || frames.value.length
  if (!done || !trackStartedAt.value) return `Tracking ${done}/${total}`
  const perFrame = (Date.now() - trackStartedAt.value) / done / 1000
  const left = Math.round(perFrame * (total - done))
  return `Tracking ${done}/${total} · about ${left < 60 ? `${left}s` : `${Math.ceil(left / 60)} min`} left`
})

/** How many frames carry each object, for the colour bar's density count. */
const framesWithObject = (objId: number) =>
  Object.values(masks.value).filter(frame => (frame?.[objId]?.length || 0) > 0).length

const naturalSize = ref({ width: 0, height: 0 })

const sam2Base = ref('')
/** Which organization's backend to proxy to; the broker verifies membership. */
const assistOrgId = ref<number | null>(null)
/** Set once the service has been shown not to answer; see the annotate screen
 *  for why nothing probes on load. */
const sam2Unreachable = ref(false)
const unreachableReason = ref('')

// ── The one notice channel ─────────────────────────────────────────────────

/**
 * The same correction slip as the image screen, for the same reason: everything
 * that happens to an annotator's work is said in one place, in ink, rather than
 * in a coloured toast that spends colour the rest of this world reserves for
 * class data.
 */
type Notice = {
  kind: 'ok' | 'error'
  text: string
  action?: { label: string; run: () => void }
}
const notice = ref<Notice | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | null = null

const say = (
  kind: Notice['kind'],
  text: string,
  options: { hold?: boolean; action?: Notice['action'] } = {}
) => {
  notice.value = { kind, text, action: options.action }
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = null
  const hold = options.hold ?? kind === 'error'
  if (!hold) noticeTimer = setTimeout(() => { notice.value = null }, kind === 'error' ? 9000 : 4500)
}

const runNoticeAction = () => {
  const action = notice.value?.action
  notice.value = null
  action?.run()
}

// ── Confirmation ───────────────────────────────────────────────────────────

type ConfirmPrompt = {
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
}
const confirmPrompt = ref<(ConfirmPrompt & { resolve: (ok: boolean) => void }) | null>(null)
const confirmButton = ref<HTMLButtonElement | null>(null)

const askConfirm = (prompt: ConfirmPrompt) =>
  new Promise<boolean>((resolve) => {
    confirmPrompt.value = { ...prompt, resolve }
    nextTick(() => confirmButton.value?.focus())
  })

const answerConfirm = (ok: boolean) => {
  const pending = confirmPrompt.value
  confirmPrompt.value = null
  pending?.resolve(ok)
}

// ── loading ────────────────────────────────────────────────────────────────

const api = (path: string, init: RequestInit = {}) =>
  fetch(`${runtimeConfig.public.apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.value}`,
      ...(init.headers || {})
    }
  })

const loadSam2Connection = async (organizationId: number) => {
  // The canvas talks to the broker, never to the service directly. All it needs
  // to know is whether this org has an active sam2 backend; the broker resolves
  // the service's URL and key on the server.
  try {
    const response = await api('/api/backendRelations', { headers: { orgId: String(organizationId) } })
    if (!response.ok) return
    const { data } = await response.json()
    const relation = (data || []).find(
      (r: any) => r.backendId === 'sam2' && r.isActive !== false
    )
    if (relation) {
      sam2Base.value = `${runtimeConfig.public.apiUrl}/api/assist/sam2`
      assistOrgId.value = organizationId
    }
  } catch {
    // Not fatal: absence of a connection surfaces as a notice on first use.
  }
}

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const projectResponse = await api(`/api/projects/${projectId.value}`)
    if (!projectResponse.ok) throw new Error('Could not load the project')
    const project = (await projectResponse.json()).data?.projects
    projectName.value = project?.name || `Project ${projectId.value}`
    classes.value = project?.labelConfig?.classes || []
    if (project?.organizationId) await loadSam2Connection(project.organizationId)

    const tasksResponse = await api(`/api/tasks/project/${projectId.value}`)
    if (!tasksResponse.ok) throw new Error('Could not load the tasks')
    const buckets = (await tasksResponse.json()).data || {}
    const all = [...(buckets.unassigned || []), ...(buckets.annotating || []), ...(buckets.completed || [])]

    const grouped: Record<string, Frame[]> = {}
    for (const task of all) {
      let meta: any = {}
      try {
        meta = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata || {}
      } catch {
        continue
      }
      // Only frames carry both of these; plain image uploads are skipped.
      if (!meta.extractedFrom || meta.frameIndex === undefined) continue
      ;(grouped[meta.extractedFrom] ||= []).push({
        taskId: task.id,
        url: getFullApiUrl(task.dataUrl),
        frameIndex: meta.frameIndex,
        timestampSeconds: meta.timestampSeconds ?? 0
      })
    }
    for (const key of Object.keys(grouped)) grouped[key].sort((a, b) => a.frameIndex - b.frameIndex)
    videos.value = grouped
    selectedVideo.value = Object.keys(grouped)[0] || null
  } catch (err: any) {
    error.value = err?.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}

// ── SAM 2 session ──────────────────────────────────────────────────────────

const sam2 = (path: string, init: RequestInit = {}) =>
  fetch(`${sam2Base.value}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.value}`,
      ...(assistOrgId.value != null ? { orgId: String(assistOrgId.value) } : {}),
      ...(init.headers || {})
    }
  })

/** Long runs are abortable; a 17 minute wait with no way out is not a wait. */
let prepareAbort: AbortController | null = null
let trackAbort: AbortController | null = null

/** Frame positions already written in this session, so retrying after a partial
 *  failure does not write a second record for the frames that succeeded. */
const savedPositions = ref<Set<number>>(new Set())

const resetSession = () => {
  prepareAbort?.abort()
  trackAbort?.abort()
  savedPositions.value = new Set()
  sessionId.value = null
  sessionDevice.value = null
  objects.value = []
  masks.value = {}
  promptPoints.value = {}
  trackedCount.value = 0
  currentIndex.value = 0
  unsavedWork.value = false
}

/** Upload the clip's frames so the service can build its inference state. */
const prepareSession = async () => {
  if (!sam2Base.value) {
    say('error', 'This organization has no SAM 2 connection, so frames cannot be loaded. Add one under Organization → Settings → Connections.')
    return
  }
  preparing.value = true
  prepareProgress.value = 0
  prepareAbort = new AbortController()
  const signal = prepareAbort.signal
  try {
    // One frame at a time meant 125 sequential round trips before SAM 2 saw
    // anything - the whole wait was latency, not bandwidth. Fetch a few at once
    // and write each into its own slot, so the clip's order survives the race.
    const list = frames.value
    const blobs = new Array<Blob>(list.length)
    let cursor = 0
    let fetched = 0
    const worker = async () => {
      while (true) {
        const i = cursor++
        if (i >= list.length) return
        const response = await fetch(list[i]!.url, { signal })
        if (!response.ok) throw new Error(`frame ${i + 1}: HTTP ${response.status}`)
        blobs[i] = await response.blob()
        fetched += 1
        prepareProgress.value = Math.round((fetched / list.length) * 100)
      }
    }
    await Promise.all(Array.from({ length: Math.min(8, list.length) }, worker))

    const form = new FormData()
    blobs.forEach((blob, i) => form.append('frames', blob, `${String(i).padStart(5, '0')}.jpg`))
    const response = await sam2('/video/sessions', { method: 'POST', body: form, signal })
    if (!response.ok) throw new Error(await response.text())
    const result = await response.json()
    sessionId.value = result.session_id
    sessionDevice.value = result.device
    objects.value = [{ objId: 1, className: null }]
    activeObjectId.value = 1
    say('ok', `${frames.value.length} frames are loaded. Click the object you want followed, then press Track.`, { hold: false })
  } catch (err: any) {
    if (signal.aborted) {
      say('ok', 'Frame loading stopped. Nothing was sent to SAM 2.', { hold: false })
    } else {
      const raw = err?.message || String(err)
      const unreachable = err instanceof TypeError || /failed to fetch|networkerror|load failed|upstream-unreachable/i.test(raw)
      if (unreachable) {
        // Retrying cannot succeed and re-opens the browser's local-network
        // prompt each time, so this offers no retry and turns the button off.
        sam2Unreachable.value = true
        unreachableReason.value =
          'The SAM 2 service did not answer, so this clip cannot be tracked. ' +
          'Start it, or point this organization at a reachable one under Organization → Settings → Connections.'
        say('error', unreachableReason.value)
      } else {
        say('error', `The frames could not be loaded into SAM 2: ${raw}. Nothing has been changed; try again.`, {
          action: { label: 'Try again', run: () => { prepareSession() } }
        })
      }
    }
  } finally {
    preparing.value = false
    prepareAbort = null
  }
}

const stopPreparing = () => prepareAbort?.abort()

// ── prompting ──────────────────────────────────────────────────────────────

/** Pointer position in original frame pixels. */
const toFramePoint = (event: MouseEvent) => {
  const img = imageEl.value
  if (!img || !naturalSize.value.width) return null
  const box = img.getBoundingClientRect()
  return {
    x: Math.round(((event.clientX - box.left) / box.width) * naturalSize.value.width),
    y: Math.round(((event.clientY - box.top) / box.height) * naturalSize.value.height)
  }
}

const addPoint = async (event: MouseEvent, label: number) => {
  event.preventDefault()
  if (!sessionId.value || tracking.value) return
  const point = toFramePoint(event)
  if (!point) return

  const position = currentIndex.value
  ;(promptPoints.value[position] ||= []).push({ objId: activeObjectId.value, ...point, label })

  const forObject = (promptPoints.value[position] || []).filter(p => p.objId === activeObjectId.value)
  try {
    const response = await sam2(`/video/sessions/${sessionId.value}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frame_idx: position,
        obj_id: activeObjectId.value,
        // The whole set is re-sent so the service's view matches what is drawn.
        clear_old_points: true,
        points: forObject.map(p => ({ x: p.x, y: p.y, label: p.label }))
      })
    })
    if (!response.ok) throw new Error(await response.text())
    applyFrameResult(position, (await response.json()).objects)
  } catch (err: any) {
    say('error', `SAM 2 did not answer that click: ${err?.message || err}. The point is still on the frame — click again, or remove the object and start it over.`)
  }
}

const applyFrameResult = (position: number, objectResults: any[]) => {
  const forFrame = { ...(masks.value[position] || {}) }
  for (const entry of objectResults) forFrame[entry.obj_id] = entry.polygons || []
  masks.value = { ...masks.value, [position]: forFrame }
  // These masks are new, so whatever was written for this frame is out of date.
  savedPositions.value.delete(position)
  unsavedWork.value = true
}

const addObject = () => {
  const objId = Math.max(0, ...objects.value.map(o => o.objId)) + 1
  objects.value.push({ objId, className: null })
  activeObjectId.value = objId
}

const removeObject = async (objId: number) => {
  const covered = framesWithObject(objId)
  if (covered) {
    const ok = await askConfirm({
      title: `Remove object ${objId}?`,
      body: `Its masks on ${covered} frame(s) are dropped, along with the points that made them. Anything already saved as an annotation stays saved.`,
      confirmLabel: 'Remove the object',
      danger: true
    })
    if (!ok) return
  }

  objects.value = objects.value.filter(o => o.objId !== objId)
  for (const position of Object.keys(masks.value)) delete masks.value[Number(position)][objId]
  for (const position of Object.keys(promptPoints.value)) {
    promptPoints.value[Number(position)] = promptPoints.value[Number(position)].filter(p => p.objId !== objId)
  }
  masks.value = { ...masks.value }
  if (activeObjectId.value === objId) activeObjectId.value = objects.value[0]?.objId ?? 1
  if (sessionId.value) {
    await sam2(`/video/sessions/${sessionId.value}/objects/${objId}`, { method: 'DELETE' }).catch(() => {})
  }
}

// ── tracking ───────────────────────────────────────────────────────────────

const promptedObjectCount = computed(() => {
  const ids = new Set<number>()
  for (const points of Object.values(promptPoints.value)) {
    for (const point of points) ids.add(point.objId)
  }
  return ids.size
})

const trackBlockedReason = computed(() => {
  if (!sessionId.value) return 'Load the clip into SAM 2 first.'
  if (!objects.value.length) return 'Add an object first.'
  if (!promptedObjectCount.value) return 'Click the object on a frame first — SAM 2 has nothing to follow yet.'
  return ''
})

/**
 * `from` limits propagation to the tail of the clip. Tracking is ~3 s a frame on
 * a CPU, so a 125-frame clip is six minutes whether or not the operator cares
 * about the first hundred frames. The service already took start_frame_idx; the
 * screen simply never offered it.
 */
const track = async (from?: number) => {
  if (!sessionId.value) return
  if (trackBlockedReason.value) {
    say('error', trackBlockedReason.value)
    return
  }
  tracking.value = true
  trackedCount.value = 0
  trackTotal.value = frames.value.length - (typeof from === 'number' && from > 0 ? from : 0)
  trackStartedAt.value = Date.now()
  trackAbort = new AbortController()
  const signal = trackAbort.signal
  try {
    const response = await sam2(`/video/sessions/${sessionId.value}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeof from === 'number' && from > 0 ? { start_frame_idx: from } : {}),
      signal
    })
    if (!response.ok || !response.body) throw new Error(await response.text())

    // NDJSON: each completed frame arrives as its own line, so masks appear as
    // they are computed rather than after the whole clip.
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        const message = JSON.parse(line)
        if (message.error) throw new Error(message.error)
        if (message.done) continue
        applyFrameResult(message.frame_idx, message.objects)
        trackedCount.value++
      }
    }
    say('ok', `Tracking finished: ${trackedCount.value} of ${trackTotal.value} frame(s) carry masks. Nothing is stored yet — press Save annotations.`, { hold: false })
  } catch (err: any) {
    if (signal.aborted) {
      say('ok', `Tracking stopped at frame ${trackedCount.value}. The masks computed so far are still on screen and can be saved.`, { hold: false })
    } else {
      say('error', `Tracking failed after ${trackedCount.value} frame(s): ${err?.message || err}. The masks computed so far are still on screen — save them, or start tracking again.`)
    }
  } finally {
    tracking.value = false
    trackAbort = null
  }
}

const stopTracking = () => trackAbort?.abort()

// ── saving ─────────────────────────────────────────────────────────────────

const unclassifiedObjects = computed(() => objects.value.filter(o => !o.className))

/** Frames carrying at least one polygon, by position in the clip. */
const markedPositions = computed(() =>
  Object.entries(masks.value)
    .filter(([, byObject]) => Object.values(byObject || {}).some(polygons => (polygons?.length || 0) > 0))
    .map(([position]) => Number(position))
)

const save = async () => {
  if (!classes.value.length) {
    say('error', 'This project has no label classes, and a mask with no class cannot go into the dataset. Define the classes first; the masks on screen stay where they are.', {
      action: { label: 'Open the project', run: () => router.push(`/projects/${projectId.value}`) }
    })
    return
  }
  if (unclassifiedObjects.value.length) {
    const count = unclassifiedObjects.value.length
    say('error', `${count} object(s) still have no class. Choose one for each in the Objects tray — nothing is saved until every object is named.`)
    return
  }
  if (!markedPositions.value.length) {
    say('error', 'No frame carries a mask yet, so there is nothing to save.')
    return
  }

  saving.value = true
  const written: number[] = []
  const failed: number[] = []
  let alreadySaved = 0
  try {
    for (const [position, frame] of frames.value.entries()) {
      const forFrame = masks.value[position]
      if (!forFrame) continue
      if (savedPositions.value.has(position)) {
        alreadySaved++
        continue
      }
      const annotations = []
      for (const object of objects.value) {
        for (const polygon of forFrame[object.objId] || []) {
          if (!polygon.points || polygon.points.length < 3) continue
          annotations.push({
            type: 'polygon',
            points: polygon.points,
            className: object.className,
            class: object.className
          })
        }
      }
      if (!annotations.length) continue

      try {
        const response = await api('/api/annotations', {
          method: 'POST',
          body: JSON.stringify({
            taskId: frame.taskId,
            projectId: Number(projectId.value),
            annotationData: { annotations },
            metadata: { source: 'sam2-video-tracking', frameIndex: frame.frameIndex }
          })
        })
        if (!response.ok) throw new Error(String(response.status))
        written.push(frame.taskId)
        savedPositions.value.add(position)
      } catch {
        failed.push(position + 1)
      }
    }

    if (written.length) await completeTasks(written)

    if (failed.length) {
      const list = failed.slice(0, 8).join(', ') + (failed.length > 8 ? '…' : '')
      say('error', `${written.length} frame(s) saved, ${failed.length} refused by the server (frame ${list}). The masks are all still on screen — saving again retries only the frames that failed.`, {
        action: { label: 'Try saving again', run: () => { save() } }
      })
    } else {
      unsavedWork.value = false
      say('ok', `${written.length} frame(s) saved and marked complete${alreadySaved ? `; ${alreadySaved} were already saved` : ''}.`, { hold: false })
    }
  } catch (err: any) {
    say('error', `Saving stopped: ${err?.message || err}. ${written.length} frame(s) were written before it stopped; the masks are all still on screen.`)
  } finally {
    saving.value = false
  }
}

/**
 * A frame that has been annotated is done, and the project board is the only
 * place anyone can see that. Same endpoint and body the project screen uses.
 */
const completeTasks = async (taskIds: number[]) => {
  try {
    const response = await api('/api/tasks/update', {
      method: 'PUT',
      body: JSON.stringify({ taskId: taskIds, status: 'completed' })
    })
    if (!response.ok) throw new Error(String(response.status))
  } catch (err: any) {
    say('error', `The masks were saved, but ${taskIds.length} frame(s) could not be marked complete: ${err?.message || err}. They will still show as in progress on the project board.`)
  }
}

// ── rendering helpers ──────────────────────────────────────────────────────

const polygonPoints = (polygon: Polygon) =>
  polygon.points.map(p => `${p.x},${p.y}`).join(' ')

/**
 * A class is an ink, and it is the SAME ink here as on the annotation screen.
 * Colouring by object index instead gave one class two different colours
 * depending on which screen you opened, which is what made tracking feel like
 * a separate product bolted on beside the project.
 */
const colorFor = (objId: number) => {
  const object = objects.value.find(o => o.objId === objId)
  return object?.className ? inkForClass(object.className, classes.value) : UNASSIGNED_INK
}

const frameHasMask = (position: number) =>
  Object.values(masks.value[position] || {}).some(polygons => (polygons?.length || 0) > 0)

const onImageLoad = () => {
  const img = imageEl.value
  if (img) naturalSize.value = { width: img.naturalWidth, height: img.naturalHeight }
}

const step = (delta: number) => {
  currentIndex.value = Math.min(frames.value.length - 1, Math.max(0, currentIndex.value + delta))
}

/**
 * Every action on this screen has a key, because keyboard-first is one of the
 * product's four bets and a tracking run is long enough that reaching for the
 * mouse between frames is the whole cost.
 */
const onKeyDown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return

  if (confirmPrompt.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      answerConfirm(false)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      answerConfirm(true)
    }
    return
  }

  if (event.key === 'ArrowRight') return step(1)
  if (event.key === 'ArrowLeft') return step(-1)
  if (event.key === 'Home') return (currentIndex.value = 0)
  if (event.key === 'End') return (currentIndex.value = frames.value.length - 1)

  // 1-9 picks the object those clicks belong to.
  const digit = Number(event.key)
  if (digit >= 1 && digit <= 9 && objects.value[digit - 1]) {
    activeObjectId.value = objects.value[digit - 1].objId
    return
  }

  // Modifier combinations are claimed by the browser and the OS; check them
  // first, or Cmd+A (select all) silently creates a tracked object.
  if (event.metaKey || event.ctrlKey || event.altKey) {
    if (event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (!tracking.value && !saving.value) save()
    }
    return
  }

  if (event.key === 'Escape') {
    if (tracking.value) return stopTracking()
    if (preparing.value) return stopPreparing()
    return
  }
  if (event.key.toLowerCase() === 'a' && sessionId.value && !tracking.value) return addObject()
  if (event.key.toLowerCase() === 't' && sessionId.value && !tracking.value) return track()
}

// ── Guarding unsaved work ──────────────────────────────────────────────────

const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!unsavedWork.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(async () => {
  if (!unsavedWork.value) return true
  return await askConfirm({
    title: 'Leave with unsaved masks?',
    body: `${markedPositions.value.length} frame(s) carry masks that have not been written to the dataset. Leaving now loses the whole run.`,
    confirmLabel: 'Leave and lose them',
    cancelLabel: 'Stay and save',
    danger: true
  })
})

/** Switching clips throws the session away, so it asks first once work exists. */
let revertingVideo = false
watch(selectedVideo, async (next, previous) => {
  if (revertingVideo) {
    revertingVideo = false
    return
  }
  if (!previous || !unsavedWork.value) {
    resetSession()
    return
  }
  const ok = await askConfirm({
    title: 'Switch to another clip?',
    body: `${markedPositions.value.length} frame(s) of "${previous}" carry masks that have not been saved. Switching clips ends the SAM 2 session and drops them.`,
    confirmLabel: 'Switch and drop them',
    cancelLabel: 'Stay on this clip',
    danger: true
  })
  if (!ok) {
    revertingVideo = true
    selectedVideo.value = previous
    return
  }
  resetSession()
})

onMounted(() => {
  loadData()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('beforeunload', onBeforeUnload)
  if (stageBox.value && typeof ResizeObserver !== 'undefined') {
    plateObserver = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      plateMax.value = {
        width: Math.max(240, Math.round(box.width - 64)),
        height: Math.max(180, Math.round(box.height - 64))
      }
    })
    plateObserver.observe(stageBox.value)
  }
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  plateObserver?.disconnect()
  prepareAbort?.abort()
  trackAbort?.abort()
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden">
    <header class="docket h-11 flex-none gap-0 px-3">
      <NuxtLink :to="`/projects/${projectId}`" class="control flex items-center gap-1.5 py-1 pr-3 text-stock-600 hover:text-stock-950">
        <UIcon name="i-lucide-arrow-left" class="size-3.5" /> Back
      </NuxtLink>

      <span class="flex items-center gap-2 border-l border-stock-400 pl-3 pr-4">
        <img src="~/assets/images/penguin.png" alt="" class="h-5 w-auto" />
        <span class="text-[13px] font-semibold tracking-tight">Labeloo</span>
      </span>

      <dl class="furniture flex min-w-0 items-center gap-5 border-l border-stock-400 pl-4 text-stock-600">
        <div class="docket-field hidden min-w-0 md:flex"><dt>Project</dt><dd class="truncate normal-case tracking-normal">{{ projectName }}</dd></div>
        <div class="docket-field"><dt>Press</dt><dd>{{ sessionDevice || (sam2Base ? 'SAM 2' : 'None') }}</dd></div>
        <div v-if="markedPositions.length" class="docket-field hidden xl:flex">
          <dt>Marked</dt>
          <dd>{{ markedPositions.length }}{{ unsavedWork ? ' unsaved' : '' }}</dd>
        </div>
      </dl>

      <select
        v-if="Object.keys(videos).length > 1"
        v-model="selectedVideo"
        aria-label="Clip"
        class="control ml-4 max-w-[13rem] appearance-none truncate rounded-none border border-stock-400 bg-stock-100 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22%23141414%22 stroke-width=%221.5%22><path d=%22M1 2l5 5 5-5%22/></svg>')] bg-[length:9px_6px] bg-[position:right_0.55rem_center] bg-no-repeat py-1 pl-2 pr-6 text-stock-950"
      >
        <option v-for="(list, name) in videos" :key="name" :value="name">{{ name }} · {{ list.length }}</option>
      </select>

      <div class="ml-auto flex items-center gap-2 pl-4">
        <template v-if="!sessionId">
          <button
            type="button"
            class="ink-button"
            :disabled="preparing || !frames.length || sam2Unreachable"
            :title="sam2Unreachable ? unreachableReason : 'Send this clip to SAM 2'"
            @click="prepareSession"
          >
            <UIcon v-if="preparing" name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
            {{ preparing ? `Uploading frames ${prepareProgress}%` : 'Load frames into SAM 2' }}
          </button>
          <button v-if="preparing" type="button" class="ink-button ink-button--outline" @click="stopPreparing">Stop</button>
        </template>
        <template v-else>
          <button
            v-if="!tracking"
            type="button"
            class="ink-button"
            :disabled="Boolean(trackBlockedReason)"
            :title="trackBlockedReason || 'Follow every prompted object through the clip (T)'"
            @click="track()"
          >
            Track objects
          </button>
          <!-- Only worth offering once there is a tail to skip. -->
          <button
            v-if="!tracking && currentIndex > 0"
            type="button"
            class="ink-button ink-button--outline"
            :disabled="Boolean(trackBlockedReason)"
            :title="trackBlockedReason || `Track only frames ${currentIndex + 1}-${frames.length}, skipping the ${currentIndex} before this one`"
            @click="track(currentIndex)"
          >
            From frame {{ currentIndex + 1 }}
          </button>
          <template v-else>
            <span class="furniture flex items-center gap-2 border border-stock-400 px-2.5 py-2 text-stock-700">
              <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
              {{ trackingLabel }}
            </span>
            <button type="button" class="ink-button ink-button--outline" @click="stopTracking">Stop tracking</button>
          </template>
          <button type="button" class="ink-button ink-button--outline" :disabled="tracking || saving || !markedPositions.length" @click="save">
            {{ saving ? 'Saving' : 'Save annotations' }}
          </button>
        </template>
      </div>
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center bg-stage-300">
      <p class="furniture text-stage-900">Loading run</p>
    </div>

    <div v-else-if="error" class="flex flex-1 items-center justify-center bg-stage-300 p-8">
      <div class="max-w-sm border border-correct-500 bg-stock-100 p-5">
        <p class="furniture text-correct-500">Run failed to load</p>
        <p class="mt-2 text-[13px] leading-snug text-stock-700">{{ error }}</p>
        <div class="mt-4 flex gap-2">
          <button type="button" class="ink-button" @click="loadData">Try again</button>
          <NuxtLink :to="`/projects/${projectId}`" class="ink-button ink-button--outline">Back to the project</NuxtLink>
        </div>
      </div>
    </div>

    <div v-else-if="!frames.length" class="flex flex-1 items-center justify-center bg-stage-300 p-8">
      <div class="max-w-md border border-stock-400 bg-stock-100 p-6 text-center">
        <p class="furniture text-stock-600">No frames yet</p>
        <p class="mt-2 text-[13px] leading-snug text-stock-700">
          Video tracking works on frames a video has been split into. Upload one under
          <NuxtLink :to="`/projects/${projectId}`" class="underline decoration-stock-400 hover:decoration-stock-950">Upload Data</NuxtLink>,
          pick a frame rate, and come back.
        </p>
      </div>
    </div>

    <!-- Both halves of the loaded run live in one branch: a second sibling
         `v-else` is not a branch at all, and the layout below it never rendered.
         Same reasoning as the image screen for the width gate itself - a
         tracking run needs a pointer and a plate big enough to place a point on. -->
    <template v-else>
      <div class="flex flex-1 items-center justify-center bg-stage-300 p-8 lg:hidden">
        <div class="max-w-sm border border-stock-400 bg-stock-100 p-6 text-center">
          <p class="furniture text-stock-600">Needs a wider window</p>
          <p class="mt-2 text-[13px] leading-snug text-stock-700">
            Placing a point on a moving object needs a pointer and room for the frame.
            Open this run on a wider screen with a mouse or trackpad.
          </p>
          <NuxtLink :to="`/projects/${projectId}`" class="ink-button mt-5 inline-flex justify-center">
            Back to the project
          </NuxtLink>
        </div>
      </div>

      <div class="hidden min-h-0 flex-1 lg:flex">
        <!-- The ink tray for a run: the order of work first, then one entry per
             tracked object. -->
        <aside class="flex w-56 flex-none flex-col overflow-y-auto border-r border-stock-400 bg-stock-100">
          <div v-if="!sessionId" class="border-b border-stock-400 px-3 py-3">
            <p class="furniture text-stock-600">How a run goes</p>
            <ol class="mt-2 space-y-2 text-[12px] leading-snug text-stock-700">
              <li><span class="furniture text-stock-950">1</span> Load this clip's frames into SAM 2.</li>
              <li><span class="furniture text-stock-950">2</span> Left click the object on any frame. Right click a part to leave it out.</li>
              <li><span class="furniture text-stock-950">3</span> Press Track, then save when it finishes.</li>
            </ol>
            <p v-if="!sam2Base" class="mt-3 text-[12px] leading-snug text-correct-500">
              No SAM 2 connection is configured for this organization, so step 1 will fail.
            </p>
          </div>

          <div class="flex items-center justify-between px-3 pt-3">
            <p class="furniture text-stock-600">Objects</p>
            <button
              type="button"
              class="control border border-stock-400 px-1.5 py-1 text-stock-700 enabled:hover:border-stock-950 enabled:hover:text-stock-950 disabled:text-stock-450 disabled:cursor-not-allowed"
              :disabled="!sessionId || tracking"
              @click="addObject"
            >+ Add</button>
          </div>

          <p v-if="!sessionId" class="px-3 pt-3 text-[12px] leading-snug text-stock-600">
            Objects appear once the clip is loaded.
          </p>

          <ul v-else class="mt-2 space-y-1.5 px-3">
            <li
              v-for="(object, index) in objects"
              :key="object.objId"
              class="border"
              :class="object.objId === activeObjectId ? 'border-stock-950' : 'border-stock-400'"
            >
              <div class="flex w-full items-stretch">
                <button
                  type="button"
                  class="flex flex-1 items-center gap-2 px-2 py-1.5 text-left"
                  :aria-pressed="object.objId === activeObjectId"
                  @click="activeObjectId = object.objId"
                >
                  <span class="swatch" :style="{ backgroundColor: colorFor(object.objId) }" />
                  <span class="flex-1 text-[13px] leading-none">Object {{ object.objId }}</span>
                  <kbd v-if="index < 9" class="furniture text-stock-600">{{ index + 1 }}</kbd>
                </button>
                <button
                  type="button"
                  class="control border-l border-stock-400 px-2 text-correct-500 hover:text-correct-600"
                  :aria-label="`Remove object ${object.objId}`"
                  @click="removeObject(object.objId)"
                >Del</button>
              </div>
              <select
                v-if="classes.length"
                v-model="object.className"
                :aria-label="`Class for object ${object.objId}`"
                class="w-full appearance-none rounded-none border-t border-stock-400 bg-transparent bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22%23141414%22 stroke-width=%221.5%22><path d=%22M1 2l5 5 5-5%22/></svg>')] bg-[length:9px_6px] bg-[position:right_0.5rem_center] bg-no-repeat px-2 py-1.5 pr-6 text-[12px] text-stock-950"
              >
                <option :value="null">— choose a class —</option>
                <option v-for="name in classes" :key="name" :value="name">{{ name }}</option>
              </select>
            </li>
          </ul>

          <p v-if="sessionId && !classes.length" class="px-3 pt-3 text-[12px] leading-snug text-correct-500">
            This project has no classes, so nothing tracked here can be saved. Define them in the
            project first.
          </p>

          <div class="flex-1" />

          <div class="border-t border-stock-400 px-3 py-3">
            <p v-if="tracking" class="furniture text-stock-600">
              {{ trackingLabel }}
            </p>
            <div v-if="tracking" class="mt-2 h-1 w-full bg-stock-300">
              <div class="h-full bg-stock-950 transition-[width] duration-200 ease-out" :style="{ width: `${(trackedCount / (trackTotal || frames.length)) * 100}%` }" />
            </div>
            <template v-else>
              <p class="furniture text-stock-600">
                {{ markedPositions.length }}/{{ frames.length }} frames marked
              </p>
              <p v-if="unclassifiedObjects.length && classes.length" class="furniture mt-2 text-correct-500">
                {{ unclassifiedObjects.length }} object(s) need an ink
              </p>
              <p v-else-if="unsavedWork" class="furniture mt-2 text-correct-500">Not saved yet</p>
              <p v-else-if="trackBlockedReason && sessionId" class="mt-2 text-[12px] leading-snug text-stock-600">
                {{ trackBlockedReason }}
              </p>
            </template>
          </div>
        </aside>

        <!-- The stage. Same neutral grey as the image screen, for the same reason. -->
        <!-- min-h-0 on both: without it a flex child grows to its content instead
             of to its share of the column, so the measured stage was taller than
             the visible one and the plate was scaled past the edges. -->
        <main class="on-stage flex min-h-0 min-w-0 flex-1 flex-col bg-stage-300">
          <div ref="stageBox" class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8">
            <!--
              While frames upload, the plate is visible but inert: clicks are
              dropped because there is no session yet. A percentage inside a
              button label did not say that, so the screen read as broken. This
              says what is happening, how far along it is, and what cannot be
              done yet - and it covers the plate, so the dead clicks never happen.
            -->
            <div v-if="preparing" class="absolute inset-0 z-20 flex items-center justify-center bg-stage-300/90 p-8">
              <div class="w-full max-w-sm border border-stock-400 bg-stock-100 p-6">
                <p class="furniture flex items-center gap-2 text-stock-600">
                  <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
                  Loading the clip into SAM 2
                </p>

                <p class="mt-3 text-[15px] leading-snug text-stock-950">
                  {{ Math.round((prepareProgress / 100) * frames.length) }} of {{ frames.length }} frames sent
                </p>

                <div class="mt-4 h-1 w-full bg-stock-300" role="progressbar" :aria-valuenow="prepareProgress" aria-valuemin="0" aria-valuemax="100">
                  <div class="h-full bg-stock-950 transition-[width] duration-200 ease-out" :style="{ width: `${prepareProgress}%` }" />
                </div>
                <p class="furniture mt-2 text-right text-stock-600">{{ prepareProgress }}%</p>

                <p class="mt-4 text-[13px] leading-snug text-stock-700">
                  The service builds its inference state from the whole clip before it can
                  follow anything, so the frame cannot be clicked until this finishes.
                </p>

                <button type="button" class="ink-button ink-button--outline mt-5 w-full justify-center" @click="stopPreparing">
                  Stop loading
                </button>
              </div>
            </div>
            <!-- max-h/max-w on the wrapper, not only on the image: the image's own
                 percentage max resolves against this box, so without a bound here
                 a tall frame paints past the stage whatever the observer measured. -->
            <div v-if="currentFrame" class="relative flex max-h-full max-w-full select-none">
              <img
                ref="imageEl"
                :src="currentFrame.url"
                class="block h-auto w-auto object-contain"
                :style="plateStyle"
                :class="sessionId ? 'cursor-crosshair' : 'cursor-default'"
                :alt="`Frame ${currentIndex + 1} of ${frames.length}`"
                draggable="false"
                @load="onImageLoad"
                @mousedown.left="addPoint($event, 1)"
                @contextmenu="addPoint($event, 0)"
              />
              <svg
                v-if="naturalSize.width"
                class="pointer-events-none absolute inset-0 h-full w-full"
                :viewBox="`0 0 ${naturalSize.width} ${naturalSize.height}`"
                preserveAspectRatio="none"
              >
                <template v-for="(polygons, objId) in masks[currentIndex] || {}" :key="objId">
                  <!-- The world's one authored moment: a mask does not fade in, it
                       prints - wiped on from the leading edge the way a sheet leaves
                       a press. Keyed on the frame so each frame prints as it lands. -->
                  <polygon
                    v-for="(polygon, i) in polygons"
                    :key="`${currentIndex}-${objId}-${i}`"
                    class="ink-down"
                    :points="polygonPoints(polygon)"
                    :stroke="colorFor(Number(objId))"
                    :fill="colorFor(Number(objId))"
                    fill-opacity="0.2"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke"
                  />
                </template>
                <circle
                  v-for="(point, i) in promptPoints[currentIndex] || []"
                  :key="`p${i}`"
                  :cx="point.x"
                  :cy="point.y"
                  r="5"
                  :fill="point.label ? colorFor(point.objId) : '#C4302B'"
                  stroke="#F4F2EC"
                  stroke-width="1.5"
                  vector-effect="non-scaling-stroke"
                />
              </svg>

              <!-- Registration crosses, held just off the plate's corners. -->
              <span class="regmark text-stock-100" style="left: -20px; top: -20px" />
              <span class="regmark text-stock-100" style="right: -20px; top: -20px" />
              <span class="regmark text-stock-100" style="left: -20px; bottom: -20px" />
              <span class="regmark text-stock-100" style="right: -20px; bottom: -20px" />
            </div>
          </div>

          <!-- The colour bar, as on the image screen: one swatch per tracked object,
               its key, and how many frames carry it. -->
          <div v-if="objects.length || classes.length" class="flex-none border-t border-stage-600 bg-stage-800 px-3 pt-2">
            <div class="flex items-center gap-4 overflow-x-auto pb-2">
              <span class="furniture flex-none text-stage-100">{{ objects.length ? 'Inks in this run' : 'Project classes' }}</span>
              <ul v-if="!objects.length" class="flex items-center gap-3">
                <li v-for="name in classes" :key="name" class="flex flex-none items-center gap-2 px-2 py-1">
                  <span class="swatch" :style="{ backgroundColor: inkForClass(name, classes) }" />
                  <span class="text-[12px] leading-none text-stock-100">{{ name }}</span>
                </li>
              </ul>
              <ul v-else class="flex items-center gap-3">
                <li
                  v-for="(object, index) in objects"
                  :key="object.objId"
                  class="flex flex-none items-center gap-2 border px-2 py-1"
                  :class="object.objId === activeObjectId ? 'border-stock-100' : 'border-transparent'"
                >
                  <kbd v-if="index < 9" class="furniture flex size-4 items-center justify-center border border-stage-100 text-stage-100">{{ index + 1 }}</kbd>
                  <span class="swatch" :style="{ backgroundColor: colorFor(object.objId) }" />
                  <span class="text-[12px] leading-none text-stock-100">{{ object.className || `Object ${object.objId}` }}</span>
                  <span class="furniture tabular-nums" :class="framesWithObject(object.objId) ? 'text-stock-100' : 'text-stage-100'">×{{ framesWithObject(object.objId) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- The strip. Every frame in order, its second, and whether ink is down. -->
          <div class="flex-none border-t border-stage-600 bg-stage-800 px-3 py-2">
            <div class="furniture mb-2 flex items-center gap-4 text-stage-100">
              <span>Frame <span class="text-stock-100">{{ currentIndex + 1 }}</span> / {{ frames.length }}</span>
              <span v-if="currentFrame" class="text-stock-100">{{ currentFrame.timestampSeconds.toFixed(2) }}s</span>
              <span class="ml-auto">← → frame · 1-9 object · A add · T track · Esc stop · ⌘S save</span>
            </div>
            <div class="flex gap-1 overflow-x-auto pb-1">
              <button
                v-for="(frame, index) in frames"
                :key="frame.taskId"
                type="button"
                class="relative flex-none border"
                :class="index === currentIndex ? 'border-stock-100' : 'border-transparent opacity-60 hover:opacity-100'"
                :aria-label="`Frame ${index + 1}, ${frame.timestampSeconds.toFixed(2)} seconds${frameHasMask(index) ? ', marked' : ''}`"
                :aria-current="index === currentIndex ? 'true' : undefined"
                @click="currentIndex = index"
              >
                <!-- A lazy image has zero width until it loads, which collapsed every
                   thumbnail past the first on a long clip. The box is reserved up
                   front and the image fills it. -->
              <img
                :src="frame.url"
                alt=""
                class="h-12 w-[4.25rem] bg-stage-600 object-cover"
                loading="lazy"
                decoding="async"
                draggable="false"
              />
                <span v-if="frameHasMask(index)" class="absolute inset-x-0 bottom-0 h-[3px] bg-ink-g" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </template>

    <!-- Every destructive step stops here first and names what goes. -->
    <div
      v-if="confirmPrompt"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-stage-900/50 p-6"
      @click.self="answerConfirm(false)"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="confirmPrompt.title"
        class="w-full max-w-sm border border-stock-950 bg-stock-100"
      >
        <p class="furniture border-b border-stock-400 px-4 py-2.5" :class="confirmPrompt.danger ? 'text-correct-500' : 'text-stock-600'">
          {{ confirmPrompt.danger ? 'This cannot be undone' : 'Confirm' }}
        </p>
        <div class="px-4 py-4">
          <p class="text-[15px] font-semibold leading-snug">{{ confirmPrompt.title }}</p>
          <p class="mt-2 text-[13px] leading-snug text-stock-700">{{ confirmPrompt.body }}</p>
        </div>
        <div class="flex justify-end gap-2 border-t border-stock-400 px-4 py-3">
          <button type="button" class="ink-button ink-button--outline" @click="answerConfirm(false)">
            {{ confirmPrompt.cancelLabel || 'Keep working' }}
          </button>
          <button ref="confirmButton" type="button" class="ink-button" @click="answerConfirm(true)">
            {{ confirmPrompt.confirmLabel }}
          </button>
        </div>
      </div>
    </div>

    <!-- The same correction slip as the image screen: one aria-live channel for
         everything that happens to the annotator's work. -->
    <div class="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div role="status" aria-live="polite" class="w-full max-w-md">
        <div
          v-if="notice"
          class="pointer-events-auto border bg-stock-100 px-4 py-2.5"
          :class="notice.kind === 'error' ? 'border-correct-500' : 'border-stock-950'"
        >
          <p class="furniture" :class="notice.kind === 'error' ? 'text-correct-500' : 'text-stock-600'">
            {{ notice.kind === 'error' ? 'Needs attention' : 'Done' }}
          </p>
          <p class="mt-1 text-[13px] leading-snug text-stock-800">{{ notice.text }}</p>
          <div v-if="notice.kind === 'error'" class="mt-2.5 flex gap-2">
            <button v-if="notice.action" type="button" class="ink-button" @click="runNoticeAction">{{ notice.action.label }}</button>
            <button type="button" class="control px-1 py-1 text-stock-600 hover:text-stock-950" @click="notice = null">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
