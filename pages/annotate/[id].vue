<template>
  <div class="flex h-screen flex-col overflow-hidden">
    <!-- The docket: the strip of facts printed along a sheet's edge. Everything
         identifying this plate reads in one line, so the stage below it is free. -->
    <header class="docket h-11 flex-none gap-0 px-3">
      <button
        type="button"
        class="control flex items-center gap-1.5 py-1 pr-3 text-stock-600 hover:text-stock-950"
        @click="navigateBack"
      >
        <UIcon name="i-lucide-arrow-left" class="size-3.5" /> Back
      </button>

      <NuxtLink to="/homepage" class="flex items-center gap-2 border-l border-stock-400 pl-3 pr-4">
        <img src="~/assets/images/penguin.png" alt="" class="h-5 w-auto" />
        <span class="text-[13px] font-semibold tracking-tight">Labeloo</span>
      </NuxtLink>

      <!--
        Only what changes while you work. Project, status and press were printed
        here AND in the sheet panel on the right, word for word - six pairs where
        three carry information. A docket that repeats the reference panel is not
        a summary, it is noise with a border.
      -->
      <dl class="furniture flex min-w-0 items-center gap-5 border-l border-stock-400 pl-4 text-stock-600">
        <div class="docket-field"><dt>Sheet</dt><dd>#{{ taskId }}</dd></div>
        <div v-if="queueLabel" class="docket-field hidden md:flex"><dt>Queue</dt><dd>{{ queueLabel }}</dd></div>
        <div class="docket-field"><dt>Marks</dt><dd>{{ markCountLabel }}</dd></div>
        <div v-if="unclassedMarks.length" class="docket-field">
          <dt class="text-correct-500">No ink</dt>
          <dd class="text-correct-500">{{ unclassedMarks.length }}</dd>
        </div>
      </dl>

      <div class="ml-auto flex items-center gap-2 pl-4">
        <button
          type="button"
          class="control flex items-center gap-1.5 px-2 py-1.5 text-stock-600 hover:text-stock-950 xl:hidden"
          :aria-expanded="showRecords"
          @click="showRecords = !showRecords"
        >
          <UIcon name="i-lucide-layers" class="size-3.5" /> Records ({{ annotations.length }})
        </button>
        <button
          type="button"
          class="control hidden items-center gap-1.5 px-2 py-1.5 text-stock-600 hover:text-stock-950 xl:flex"
          @click="reloadSheet"
        >
          <UIcon name="i-lucide-rotate-cw" class="size-3.5" /> Reload sheet
        </button>
        <button
          v-if="prevTaskId"
          type="button"
          class="control flex items-center gap-1.5 border border-stock-400 px-2 py-1.5 text-stock-700 hover:border-stock-950 hover:text-stock-950"
          aria-label="Previous sheet in your queue"
          title="Previous sheet in your queue"
          @click="goToTask(prevTaskId)"
        >
          <UIcon name="i-lucide-chevron-left" class="size-3.5" /> Prev
        </button>
        <button
          type="button"
          class="ink-button"
          :disabled="canvasAnnotations.length === 0 || savingAnnotation || savingAndNext"
          :title="canvasAnnotations.length === 0 ? 'Nothing on the plate to save yet' : 'Save the marks and stay on this sheet (⌘S)'"
          @click="saveAnnotation()"
        >
          <UIcon v-if="savingAnnotation" name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
          <UIcon v-else name="i-lucide-check" class="size-3.5" />
          Save marks
        </button>
        <button
          type="button"
          class="ink-button ink-button--outline"
          :disabled="savingAnnotation || savingAndNext"
          :title="taskData?.nextTaskId ? 'Save, mark this sheet complete, open the next one (⌘↵)' : 'Save and mark this sheet complete (⌘↵)'"
          @click="saveCompleteAndNext"
        >
          <UIcon v-if="savingAndNext" name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
          {{ taskData?.nextTaskId ? 'Save, complete & next' : 'Save & complete' }}
          <UIcon v-if="taskData?.nextTaskId" name="i-lucide-arrow-right" class="size-3.5" />
        </button>
      </div>
    </header>

    <!--
      This is not a smaller version of the tool below 1024px, it is an unusable
      one: judging an edge to the pixel needs a pointer and room for the plate.
      The gate is width here because CSS cannot branch a layout on pointer type
      without JS; `coarse-pointer` (set on mount) refuses a touch-only device of
      any width, which is the rule the copy actually states.
    -->
    <div class="flex flex-1 items-center justify-center bg-stage-300 p-8 lg:hidden" :class="coarsePointer ? '!flex' : ''">
      <div class="max-w-sm border border-stock-400 bg-stock-100 p-6 text-center">
        <p class="furniture text-stock-600">Needs a wider window</p>
        <p class="mt-2 text-[13px] leading-snug text-stock-700">
          Marking a plate to the pixel needs a mouse or trackpad and room for the image.
          Open this sheet on a wider screen with a pointer.
        </p>
        <button type="button" class="ink-button mt-5 inline-flex justify-center" @click="navigateBack">
          Back to the project
        </button>
      </div>
    </div>

    <div class="hidden min-h-0 flex-1 lg:flex" :class="coarsePointer ? '!hidden' : ''">
      <AnnotationToolbar
        v-if="isImageTask"
        :current-tool="currentTool"
        :is-annotating="isAnnotating"
        :annotation-count="canvasAnnotations.length"
        :has-selection="selectedAnnotationIndex !== null"
        :can-undo="historyIndex > 0"
        :can-redo="historyIndex < annotationHistory.length - 1"
        :zoom-level="zoomPercent"
        :image-size="plateLabel"
        :assist-available="assistAvailable"
        :assist-reason="assistReason"
        @tool-selected="selectTool"
        @complete-annotation="completeAnnotation"
        @cancel-annotation="cancelAnnotation"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @reset-zoom="resetZoom"
        @fit-to-screen="fitToScreen"
        @undo="undo"
        @redo="redo"
        @delete-selected="deleteSelectedAnnotation"
        @duplicate-selected="duplicateSelectedAnnotation"
        @clear-all="clearAllAnnotations"
        @export-annotations="exportAnnotations"
      />

      <!-- The stage. Calibrated neutral grey, because a white surround blows out
           a photograph's shadows and a black one glares off its highlights. -->
      <main class="on-stage relative flex min-w-0 flex-1 flex-col bg-stage-300">
        <div v-if="loading" class="flex flex-1 items-center justify-center">
          <p class="furniture text-stage-900">Loading sheet #{{ taskId }}</p>
        </div>

        <div v-else-if="error" class="flex flex-1 items-center justify-center p-8">
          <div class="max-w-sm border border-correct-500 bg-stock-100 p-5">
            <p class="furniture text-correct-500">Sheet failed to load</p>
            <p class="mt-2 text-[13px] leading-snug text-stock-700">{{ error }}</p>
            <p class="mt-2 text-[13px] leading-snug text-stock-600">
              Nothing has been changed on the server. Try again, or move on and come back to this sheet later.
            </p>
            <div class="mt-4 flex gap-2">
              <button type="button" class="ink-button" @click="loadData">Try again</button>
              <button
                v-if="taskData?.nextTaskId"
                type="button"
                class="ink-button ink-button--outline"
                @click="goToTask(taskData.nextTaskId)"
              >
                Skip to the next sheet
              </button>
            </div>
          </div>
        </div>

        <template v-else-if="taskData">
          <!-- A task that is not an image reaches this screen too; say what it is
               and offer a way on, rather than showing a canvas with no tray. -->
          <div v-if="!isImageTask" class="flex flex-1 items-center justify-center p-8">
            <div class="max-w-md border border-stock-400 bg-stock-100 p-6">
              <p class="furniture text-stock-600">Not an image sheet</p>
              <p class="mt-2 text-[13px] leading-snug text-stock-700">
                This task carries <span class="font-mono">{{ parseDataType(taskData.dataType) || 'no readable type' }}</span>,
                and this screen can only mark up images. Nothing is wrong with your work — the sheet
                simply belongs somewhere else.
              </p>
              <div class="mt-4 flex gap-2">
                <button type="button" class="ink-button" @click="navigateBack">Back to the project</button>
                <button
                  v-if="taskData.nextTaskId"
                  type="button"
                  class="ink-button ink-button--outline"
                  @click="goToTask(taskData.nextTaskId)"
                >
                  Skip to the next sheet
                </button>
              </div>
            </div>
          </div>

          <template v-else>
            <div ref="stageBox" class="relative flex-1 overflow-hidden">
              <div class="flex h-full items-center justify-center p-12">
                <div v-if="!taskData?.dataUrl" class="max-w-sm border border-correct-500 bg-stock-100 p-5">
                  <p class="furniture text-correct-500">No image on this sheet</p>
                  <p class="mt-2 text-[13px] leading-snug text-stock-700">
                    The task record has no image file attached, so there is nothing to mark.
                    Re-upload the file from the project, or move on to the next sheet.
                  </p>
                  <div class="mt-4 flex gap-2">
                    <button type="button" class="ink-button" @click="navigateBack">Back to the project</button>
                    <button
                      v-if="taskData.nextTaskId"
                      type="button"
                      class="ink-button ink-button--outline"
                      @click="goToTask(taskData.nextTaskId)"
                    >
                      Next sheet
                    </button>
                  </div>
                </div>

                <!-- The plate, with registration crosses holding its corners. -->
                <div v-else class="relative text-stock-100">
                  <KonvaAnnotationCanvas
                    ref="konvaCanvas"
                    :image-url="getTaskImageUrl(taskData)"
                    :annotations="canvasAnnotations"
                    :current-tool="currentTool"
                    :is-annotating="isAnnotating"
                    :classes="projectClasses"
                    :canvas-width="plateSize.width"
                    :canvas-height="plateSize.height"
                    :assist-url="assistUrl"
                    :auth-token="token"
                    :org-id="assistOrgId ?? undefined"
                    @update:annotations="onCanvasAnnotations"
                    @update:is-annotating="isAnnotating = $event"
                    @annotation-completed="onAnnotationCompleted"
                    @annotation-updated="onAnnotationUpdated"
                    @annotation-deleted="onAnnotationDeleted"
                    @show-class-selector="onShowClassSelector"
                    @magic-error="onMagicError"
                    @magic-unreachable="onMagicUnreachable"
                  />
                </div>
              </div>

              <p v-if="restoring" class="furniture absolute left-4 top-4 border border-stage-600 bg-stage-800 px-2 py-1.5 text-stage-100">
                Putting saved work back on the plate
              </p>

              <!-- Without classes nothing valid can be drawn, so the plate is held
                   shut rather than allowed to produce marks with no ink. -->
              <div v-if="!projectClasses.length" class="absolute inset-0 z-10 flex items-center justify-center p-8">
                <div class="max-w-sm border border-stock-400 bg-stock-100 p-6">
                  <p class="furniture text-stock-600">No inks defined</p>
                  <p class="mt-2 text-[13px] leading-snug text-stock-700">
                    This project has no label classes yet, and a mark without a class cannot be
                    saved into the dataset. Drawing is held until someone defines them.
                  </p>
                  <NuxtLink
                    v-if="taskData"
                    :to="`/projects/${taskData.projectId}`"
                    class="ink-button mt-5 inline-flex justify-center"
                  >
                    Define classes in the project
                  </NuxtLink>
                </div>
              </div>

              <div v-if="queueDone" class="absolute inset-0 z-20 flex items-center justify-center p-8">
                <div class="max-w-sm border border-stock-400 bg-stock-100 p-6">
                  <p class="furniture text-stock-600">Queue finished</p>
                  <p class="mt-2 text-[15px] font-semibold leading-snug">Sheet #{{ taskId }} was the last one assigned to you.</p>
                  <p class="mt-2 text-[13px] leading-snug text-stock-700">
                    {{ completedCount }} of {{ queueTotal || completedCount }} sheets in this project are marked complete.
                    Your work is saved; there is nothing left to press here.
                  </p>
                  <div class="mt-5 flex gap-2">
                    <button type="button" class="ink-button" @click="navigateBack">Back to the project</button>
                    <button type="button" class="ink-button ink-button--outline" @click="queueDone = false">Stay on this sheet</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- The colour bar. One swatch per class, its key, and how many of that
                 ink are down on this plate. Reads from the same list the canvas draws
                 with, so the legend can never disagree with the sheet. -->
            <div v-if="projectClasses.length" class="flex-none border-t border-stage-600 bg-stage-800 px-3 py-2">
              <div class="flex items-center gap-4 overflow-x-auto">
                <span class="furniture flex-none text-stage-100">Inks on this plate</span>
                <ul class="flex items-center gap-3">
                  <li
                    v-for="(className, index) in projectClasses"
                    :key="className"
                    class="flex flex-none items-center gap-2 border px-2 py-1"
                    :class="lastSelectedClass === className ? 'border-stock-100' : 'border-transparent'"
                  >
                    <kbd v-if="index < 9" class="furniture flex size-4 items-center justify-center border border-stage-100 text-stage-100">{{ index + 1 }}</kbd>
                    <span class="swatch" :style="{ backgroundColor: inkForClass(className, projectClasses) }" />
                    <span class="text-[12px] leading-none text-stock-100">{{ className }}</span>
                    <span
                      class="furniture tabular-nums"
                      :class="markCounts[className] ? 'text-stock-100' : 'text-stage-100'"
                    >×{{ markCounts[className] || 0 }}</span>
                  </li>
                </ul>
                <!-- The tool letters are printed on every tool row in the left rail. Only the
                     two shortcuts that appear nowhere else survive here. -->
                <span class="furniture ml-auto flex-none pl-4 text-stage-100">⌘S save · ⌘↵ complete</span>
              </div>
            </div>
          </template>
        </template>

        <div v-else class="flex flex-1 items-center justify-center">
          <p class="furniture text-stage-900">No sheet loaded</p>
        </div>
      </main>

      <!-- The proof record: what has already been pulled from this plate. Below
           1280px it is folded away behind the docket's Records button, because
           this is the only route to saved work. -->
      <aside
        class="w-[17.5rem] flex-none flex-col overflow-y-auto border-l border-stock-400 bg-stock-100"
        :class="showRecords ? 'flex' : 'hidden xl:flex'"
      >
        <div class="flex items-center justify-between border-b border-stock-400 px-4 py-2 xl:hidden">
          <span class="furniture text-stock-600">Sheet record</span>
          <button type="button" class="control text-stock-600 hover:text-stock-950" @click="showRecords = false">Close</button>
        </div>

        <div v-if="queueTotal" class="border-b border-stock-400 p-4">
          <h2 class="furniture text-stock-600">Your queue</h2>
          <p class="mt-2 text-[13px] leading-snug text-stock-700">
            Sheet {{ queuePosition }} of {{ queueTotal }} · {{ queueRemaining }} still to do.
          </p>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="control flex-1 border border-stock-400 py-1.5 text-stock-700 enabled:hover:border-stock-950 enabled:hover:text-stock-950 disabled:text-stock-450 disabled:cursor-not-allowed"
              :disabled="!prevTaskId"
              @click="prevTaskId && goToTask(prevTaskId)"
            >Previous</button>
            <button
              type="button"
              class="control flex-1 border border-stock-400 py-1.5 text-stock-700 enabled:hover:border-stock-950 enabled:hover:text-stock-950 disabled:text-stock-450 disabled:cursor-not-allowed"
              :disabled="!taskData?.nextTaskId"
              @click="taskData?.nextTaskId && goToTask(taskData.nextTaskId)"
            >Next</button>
          </div>
        </div>

        <div v-if="taskData" class="border-b border-stock-400 p-4">
          <h2 class="furniture text-stock-600">Sheet</h2>
          <dl class="furniture mt-3 space-y-1.5 text-stock-600">
            <div class="flex justify-between gap-3"><dt>Type</dt><dd class="text-stock-950">{{ parseDataType(taskData.dataType) }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Status</dt><dd class="text-stock-950">{{ taskData.status }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Priority</dt><dd class="text-stock-950">{{ taskData.priority }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Added</dt><dd class="text-stock-950">{{ formatDate(taskData.createdAt) }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Press</dt><dd class="text-stock-950">{{ pressLabel }}</dd></div>
            <div v-if="parsedMetadata?.originalFileName" class="flex justify-between gap-3">
              <dt>File</dt>
              <dd class="max-w-[9rem] truncate normal-case tracking-normal text-stock-950" :title="parsedMetadata.originalFileName">{{ parsedMetadata.originalFileName }}</dd>
            </div>
          </dl>
          <p v-if="sam2Resolved && !assistUrl" class="mt-3 text-[12px] leading-snug text-correct-500">
            No SAM 2 connection for this organization, so the magic stick cannot segment.
            The drawing tools still work.
          </p>
        </div>

        <div v-if="projectData?.description" class="border-b border-stock-400 p-4">
          <h2 class="furniture text-stock-600">Brief</h2>
          <p class="mt-2 text-[13px] leading-snug text-stock-700">{{ projectData.description }}</p>
        </div>

        <div class="p-4">
          <h2 class="furniture flex items-center justify-between text-stock-600">
            <span>Saved records</span>
            <span class="text-stock-950">{{ annotations.length }}</span>
          </h2>

          <p v-if="annotations.length === 0" class="mt-3 text-[13px] leading-snug text-stock-600">
            Nothing has been saved from this sheet yet. Mark the plate, then press Save marks —
            each save writes one record you can load back here.
          </p>

          <ul v-else class="mt-3 space-y-2">
            <li
              v-for="annotation in sortedAnnotations"
              :key="annotation.id"
              class="border"
              :class="annotation.id === loadedRecordId ? 'border-stock-950' : 'border-stock-400'"
            >
              <div class="flex items-center justify-between gap-2 border-b border-stock-400 px-2.5 py-1.5">
                <span class="furniture text-stock-600">#{{ annotation.id }}</span>
                <span class="furniture" :class="reviewInk(annotation.reviewStatus)">{{ annotation.reviewStatus }}</span>
              </div>
              <div class="px-2.5 py-1.5">
                <p class="furniture text-stock-600">{{ formatDate(annotation.createdAt) }}</p>
                <p class="mt-1 truncate text-[12px] text-stock-700" :title="annotation.userEmail">{{ annotation.userEmail }}</p>
              </div>
              <div class="flex items-center justify-between gap-2 border-t border-stock-400 px-2.5 py-1.5">
                <span v-if="annotation.id === loadedRecordId" class="furniture text-stock-950">On the plate</span>
                <span v-else class="furniture text-stock-600">Not loaded</span>
                <div class="flex flex-none gap-1">
                  <button type="button" class="control px-1.5 py-1 text-stock-600 hover:text-stock-950" @click="applyAnnotation(annotation)">Load</button>
                  <button type="button" class="control px-1.5 py-1 text-correct-500 hover:text-correct-600" :disabled="deletingAnnotation === annotation.id" @click="deleteAnnotationFromDb(annotation.id)">Delete</button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Choosing an ink for a fresh mark. Sits where the shape is, not in a modal. -->
    <div
      v-if="showClassSelector && projectClasses.length"
      ref="classSelectorEl"
      data-class-selector
      role="dialog"
      aria-modal="true"
      aria-label="Choose an ink for this mark"
      class="fixed z-50 w-52 border border-stock-950 bg-stock-100"
      :style="{ left: `${classSelectorPosition.x}px`, top: `${classSelectorPosition.y}px`, visibility: selectorPlaced ? 'visible' : 'hidden' }"
    >
      <p class="furniture border-b border-stock-400 px-3 py-2 text-stock-600">Ink this mark</p>
      <ul>
        <li v-for="(className, index) in projectClasses" :key="className">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-stock-200"
            @click="selectAnnotationClass(className)"
          >
            <span class="swatch" :style="{ backgroundColor: inkForClass(className, projectClasses) }" />
            <span class="flex-1 truncate text-[13px]">{{ className }}</span>
            <kbd v-if="index < 9" class="furniture text-stock-600">{{ index + 1 }}</kbd>
          </button>
        </li>
      </ul>
      <div class="flex items-center justify-between border-t border-stock-400 px-3 py-2">
        <span class="furniture text-stock-600">Enter repeats last</span>
        <button type="button" class="control text-stock-600 hover:text-stock-950" @click="cancelClassSelection">Esc</button>
      </div>
    </div>

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

    <!-- A correction slip. What happened to the work, said next to the work. The
         region itself is always in the document so a screen reader announces the
         text that lands in it. -->
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


<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import KonvaAnnotationCanvas from '~/components/annotation/KonvaAnnotationCanvas.vue'
import AnnotationToolbar from '~/components/annotation/AnnotationToolbar.vue'
import { useImageUrl } from '~/composables/useImageUrl'
import { inkForClass } from '~/utils/inks'

const { getTaskImageUrl } = useImageUrl()

interface TaskData {
  id: number
  projectId: number
  dataUrl: string
  dataType: string
  status: string
  assignedTo: number | null
  metadata: string
  priority: number
  createdAt: number
  updatedAt: number
  nextTaskId: number | null
}

interface ProjectData {
  id: number
  organizationId: number
  name: string
  description: string
  projectType: number
  labelConfig: {
    classes: string[]
  }
  createdAt: number
  updatedAt: number
}

interface ProjectResponse {
  data: {
    projects: ProjectData
    project_relations: any
  }
}

interface Annotation {
  id: number
  taskId: number
  userId: number
  projectId: number
  annotationData: any
  isGroundTruth: boolean
  reviewStatus: string
  reviewerId: number | null
  createdAt: number
  updatedAt: number
  userEmail: string
}

interface TaskResponse {
  data: TaskData
}

interface AnnotationsResponse {
  data: Annotation[]
}

const route = useRoute()
const router = useRouter()
const taskId = route.params.id as string

const loading = ref(true)
const error = ref<string | null>(null)
const taskData = ref<TaskData | null>(null)
const projectData = ref<ProjectData | null>(null)
const annotations = ref<Annotation[]>([])
const savingAnnotation = ref(false)
const savingAndNext = ref(false)
const deletingAnnotation = ref<number | null>(null)
const restoring = ref(false)
const showRecords = ref(false)
const queueDone = ref(false)
/** Which saved record is the one currently on the plate. */
const loadedRecordId = ref<number | null>(null)

const token = useCookie('auth_token')
const runtimeConfig = useRuntimeConfig()

const authHeaders = () => ({ Authorization: `Bearer ${token.value}` })

/**
 * The plate takes the room the stage gives it.
 *
 * A fixed canvas meant the registration marks sat off screen and the image was
 * stranded in the middle of a much larger stage; measuring the container makes
 * both the marks and the plate mean the visible sheet.
 */
/** True on touch-only devices, whatever their width - the real constraint. */
const coarsePointer = ref(false)

const stageBox = ref<HTMLElement | null>(null)
const plateSize = ref({ width: 960, height: 640 })
let plateObserver: ResizeObserver | null = null

/** The class list, and how many of each ink are down on this plate. */
const projectClasses = computed<string[]>(() => projectData.value?.labelConfig?.classes || [])

/** Review states read as ink, not as a coloured pill. */
const reviewInk = (status: string) =>
  status === 'approved' ? 'text-ink-g' : status === 'rejected' ? 'text-correct-500' : 'text-stock-600'


// SAM 2 ("magic stick") connection. Configured per organization under
// Organization -> Settings -> Connections; the env value is only a dev fallback.
const hasSam2 = ref(false)
const assistOrgId = ref<number | null>(null)
const sam2Resolved = ref(false)

/** The broker endpoint the canvas talks to. The service's real URL and key stay
 *  on the server; the browser only ever names the backend type. */
const assistUrl = computed(
  () => hasSam2.value ? `${runtimeConfig.public.apiUrl}/api/assist/sam2` : ''
)
/**
 * Set the first time the service fails to answer at all.
 *
 * Nothing probes on load: a page that reaches for localhost the moment it opens
 * makes the browser ask every visitor for local-network access, including the
 * ones who never wanted assistance. The first real attempt is the probe, and its
 * answer is remembered so the prompt never comes back.
 */
const sam2Unreachable = ref(false)
const assistReason = ref('')

const pressLabel = computed(() =>
  !sam2Resolved.value ? 'Checking'
  : !assistUrl.value ? 'None'
  : sam2Unreachable.value ? 'Unreachable'
  : 'SAM 2'
)
const assistAvailable = computed(() => Boolean(assistUrl.value) && !sam2Unreachable.value)

const loadSam2Backend = async (organizationId: number) => {
  try {
    const response = await fetch(
      `${runtimeConfig.public.apiUrl}/api/backendRelations`,
      { headers: { ...authHeaders(), orgId: String(organizationId) } }
    )
    if (!response.ok) return
    const { data } = await response.json()
    const relation = (data || []).find(
      (r: any) => r.backendId === 'sam2' && r.isActive !== false
    )
    if (relation) {
      hasSam2.value = true
      assistOrgId.value = organizationId
    }
  } catch {
    // Not fatal: the outcome is reported below, once, as a notice rather than as
    // a console line the annotator never sees.
  } finally {
    sam2Resolved.value = true
  }
}

/**
 * One notice channel for everything that happens to the annotator's work.
 *
 * A failed save and a successful one both used to end with the marks gone from
 * the canvas and a line in the console, so they were indistinguishable on
 * screen. Both now say what happened, next to the work.
 */
type Notice = {
  kind: 'ok' | 'error'
  text: string
  action?: { label: string; run: () => void }
}
const notice = ref<Notice | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | null = null

/** Failures hold until dismissed unless `hold` says otherwise: a slip that fades
 *  while the annotator is still reading it is how work went missing unnoticed. */
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

const onMagicError = (message: string) => say('error', message)

/**
 * The service did not answer. Say so once, turn assistance off for this session,
 * and move the operator onto a tool that works instead of leaving them holding a
 * wand that does nothing.
 */
const onMagicUnreachable = (message: string) => {
  sam2Unreachable.value = true
  assistReason.value = message
  say('error', message)
  if (currentTool.value === 'magic') selectTool('select')
}

// ── Confirmation ────────────────────────────────────────────────────────────

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

// ── Canvas state ────────────────────────────────────────────────────────────

const konvaCanvas = ref<any>(null)

interface CanvasAnnotation {
  type: 'rectangle' | 'polygon' | 'dot' | 'line' | 'circle' | 'freehand'
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
  width?: number
  height?: number
  points?: { x: number; y: number }[]
  center?: { x: number; y: number }
  radius?: number
  className?: string
}

// Assistance is the default path, so it is the tool a sheet opens on. Drawing a
// rectangle by hand is the fallback, and the tray says so by putting it below a rule.
const currentTool = ref('magic')
const toolChosenByHand = ref(false)
const isAnnotating = ref(false)

const canvasAnnotations = ref<CanvasAnnotation[]>([])
/** Marks on the plate that are not in a saved record. */
const unsavedMarks = ref(false)

const selectedAnnotationIndex = ref<number | null>(null)
const annotationHistory = ref<CanvasAnnotation[][]>([[]])
const historyIndex = ref(0)

// Class selection popup state
const showClassSelector = ref(false)
const classSelectorEl = ref<HTMLElement | null>(null)
const classSelectorPosition = ref({ x: 0, y: 0 })
const selectorPlaced = ref(false)
const pendingAnnotation = ref<CanvasAnnotation | null>(null)
const lastSelectedClass = ref<string | null>(null)
let focusBeforeSelector: HTMLElement | null = null

/** A mark with no class cannot enter the dataset, so it is counted apart. */
const markIsUnclassed = (ann: CanvasAnnotation) =>
  !ann.className || ann.className.startsWith('magic-generated-')

const savableMarks = computed(() => canvasAnnotations.value.filter((ann) => !markIsUnclassed(ann)))
const unclassedMarks = computed(() => canvasAnnotations.value.filter(markIsUnclassed))
const markCountLabel = computed(() =>
  unclassedMarks.value.length
    ? `${savableMarks.value.length}/${canvasAnnotations.value.length}`
    : String(canvasAnnotations.value.length)
)

const markCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const annotation of savableMarks.value) {
    const name = annotation.className as string
    counts[name] = (counts[name] || 0) + 1
  }
  return counts
})

const isImageTask = computed(() => {
  if (!taskData.value) return false
  const parsedDataType = parseDataType(taskData.value.dataType)
  const hasImageInDataType = parsedDataType.toLowerCase().includes('image')
  const hasImageMimeType = parsedDataType.startsWith('image/')
  const hasImageUrl = Boolean(taskData.value.dataUrl) && (
    taskData.value.dataUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(taskData.value.dataUrl)
  )
  return hasImageInDataType || hasImageMimeType || hasImageUrl
})

const parsedMetadata = computed(() => {
  if (!taskData.value?.metadata) return null
  try {
    return JSON.parse(taskData.value.metadata)
  } catch {
    return null
  }
})

const sortedAnnotations = computed(() =>
  [...annotations.value].sort((a, b) => (b.createdAt - a.createdAt) || (b.id - a.id))
)
const latestAnnotation = computed<Annotation | null>(() => sortedAnnotations.value[0] || null)

// ── The queue this sheet sits in ────────────────────────────────────────────

const queueTasks = ref<{ id: number; status: string }[]>([])
const queueIndex = computed(() => queueTasks.value.findIndex((t) => t.id === Number(taskId)))
const queuePosition = computed(() => (queueIndex.value >= 0 ? queueIndex.value + 1 : 0))
const queueTotal = computed(() => queueTasks.value.length)
const queueRemaining = computed(() => queueTasks.value.filter((t) => t.status !== 'completed').length)
const completedCount = computed(() => queueTasks.value.filter((t) => t.status === 'completed').length)
const queueLabel = computed(() =>
  queuePosition.value ? `${queuePosition.value}/${queueTotal.value} · ${queueRemaining.value} left` : ''
)
const prevTaskId = computed(() =>
  queueIndex.value > 0 ? queueTasks.value[queueIndex.value - 1]?.id ?? null : null
)

// ── Loading ─────────────────────────────────────────────────────────────────

const fetchTaskData = async () => {
  if (!token.value) throw new Error('You are signed out. Sign in again to open this sheet.')
  const response = await $fetch<TaskResponse>(
    `${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/${taskId}`,
    { headers: authHeaders() }
  )
  taskData.value = response.data
}

const fetchAnnotations = async () => {
  try {
    const response = await $fetch<AnnotationsResponse>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/annotations/task/${taskId}`,
      { headers: authHeaders() }
    )
    annotations.value = response.data || []
  } catch (err: any) {
    annotations.value = []
    say('error', `Saved records for this sheet could not be read: ${err?.message || err}. Marks you make now can still be saved.`)
  }
}

const fetchProjectData = async () => {
  try {
    const response = await $fetch<ProjectResponse>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${taskData.value?.projectId}`,
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }
    )
    if (!response.data?.projects) throw new Error('Project not found')
    projectData.value = response.data.projects
    if (projectData.value?.organizationId) {
      await loadSam2Backend(projectData.value.organizationId)
    } else {
      sam2Resolved.value = true
    }
  } catch (err: any) {
    projectData.value = null
    sam2Resolved.value = true
    say('error', `The project behind this sheet could not be read: ${err?.message || err}. Class list and brief are missing until it loads.`)
  }
}

/**
 * Position in the queue comes from the annotator's own task list for this
 * project - the same endpoint the project screen reads, no new API surface.
 */
const fetchQueue = async () => {
  try {
    const response = await $fetch<{ data: any[] }>(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/my-tasks?projectId=${taskData.value?.projectId}`,
      { headers: authHeaders() }
    )
    const list = Array.isArray(response.data) ? response.data : []
    queueTasks.value = list
      .map((task: any) => ({ id: Number(task.id), status: String(task.status) }))
      .sort((a, b) => a.id - b.id)
  } catch {
    // Only the progress readout depends on this; the sheet itself still works,
    // and the queue fields stay hidden rather than showing an invented number.
    queueTasks.value = []
  }
}

const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    queueDone.value = false
    loadedRecordId.value = null
    canvasAnnotations.value = []
    unsavedMarks.value = false
    annotationHistory.value = [[]]
    historyIndex.value = 0

    await fetchTaskData()
    await Promise.all([fetchProjectData(), fetchAnnotations(), fetchQueue()])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load this sheet'
  } finally {
    loading.value = false
  }

  if (!error.value) await restoreLatestRecord()
}

/**
 * The plate is only ready once Konva has the image measured; before that every
 * coordinate conversion returns nonsense. Applying a saved record while the
 * canvas was still behind a `v-if="loading"` branch is why saved work never
 * came back and annotators redrew whole sheets.
 */
const plateReady = () => ((konvaCanvas.value?.getOriginalImageSize?.()?.width || 0) > 0)

const waitForPlate = async (timeoutMs = 12000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (plateReady()) return true
    await new Promise((resolve) => setTimeout(resolve, 60))
  }
  return false
}

const restoreLatestRecord = async () => {
  const latest = latestAnnotation.value
  if (!latest || !isImageTask.value || !taskData.value?.dataUrl) return
  restoring.value = true
  try {
    await nextTick()
    const ready = await waitForPlate()
    if (!ready) {
      say('error', `Sheet #${taskId} has ${annotations.value.length} saved record(s) but the image did not finish loading, so they are not on the plate. Reload the sheet before marking, or your work will be saved as a second record.`, {
        action: { label: 'Reload sheet', run: () => loadData() }
      })
      return
    }
    await applyAnnotation(latest, { announce: true, confirmReplace: false })
  } finally {
    restoring.value = false
  }
}

const navigateBack = () => {
  if (taskData.value) {
    router.push(`/projects/${taskData.value.projectId}`)
  } else {
    router.back()
  }
}

const goToTask = (id: number) => router.push(`/annotate/${id}`)

const parseDataType = (dataType: string) => (dataType || '').replace(/"/g, '')

/* toLocaleString() printed "8/31/2026, 12:33:05 AM" - the widest value in the
   sheet panel, and the seconds answer a question nobody asked. */
const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const selectTool = (tool: string) => {
  // One gate for the rail and the keyboard alike: pressing M must not put the
  // operator back on a tool that has already been shown not to work.
  if (tool === 'magic' && !assistAvailable.value) {
    if (assistReason.value) say('error', assistReason.value)
    return
  }
  toolChosenByHand.value = true
  if (isAnnotating.value) cancelAnnotation()
  currentTool.value = tool
}

// ── History ─────────────────────────────────────────────────────────────────

/**
 * History is written by user actions only.
 *
 * A deep watcher used to record every mutation, including the one `undo` itself
 * made, so undo re-recorded the state it had just restored: nothing could be
 * undone more than one step and redo was unreachable. An empty plate is a valid
 * step, so `clear all` can be taken back too.
 */
const HISTORY_LIMIT = 50

const pushHistory = () => {
  const snapshot: CanvasAnnotation[] = JSON.parse(JSON.stringify(canvasAnnotations.value))
  annotationHistory.value = annotationHistory.value.slice(0, historyIndex.value + 1)
  annotationHistory.value.push(snapshot)
  if (annotationHistory.value.length > HISTORY_LIMIT) annotationHistory.value.shift()
  historyIndex.value = annotationHistory.value.length - 1
}

const commitAnnotations = (next: CanvasAnnotation[], { history = true, dirty = true } = {}) => {
  canvasAnnotations.value = next
  if (dirty) unsavedMarks.value = true
  if (history) pushHistory()
}

const undo = () => {
  if (historyIndex.value <= 0) return
  historyIndex.value--
  canvasAnnotations.value = JSON.parse(JSON.stringify(annotationHistory.value[historyIndex.value] || []))
  unsavedMarks.value = true
  selectedAnnotationIndex.value = null
}

const redo = () => {
  if (historyIndex.value >= annotationHistory.value.length - 1) return
  historyIndex.value++
  canvasAnnotations.value = JSON.parse(JSON.stringify(annotationHistory.value[historyIndex.value] || []))
  unsavedMarks.value = true
  selectedAnnotationIndex.value = null
}

// ── Canvas events ───────────────────────────────────────────────────────────

/** The canvas mutates the plate through `update:annotations`; the narrower
 *  events arrive alongside it, so they only reconcile and never double-apply. */
const onCanvasAnnotations = (next: CanvasAnnotation[]) => commitAnnotations(next)

const onAnnotationCompleted = (annotation: CanvasAnnotation) => {
  if (canvasAnnotations.value.includes(annotation)) {
    unsavedMarks.value = true
    return
  }
  commitAnnotations([...canvasAnnotations.value, annotation])
}

const onAnnotationUpdated = (annotation: CanvasAnnotation, index: number) => {
  if (canvasAnnotations.value[index] === annotation) {
    unsavedMarks.value = true
    return
  }
  const next = canvasAnnotations.value.slice()
  next[index] = annotation
  commitAnnotations(next)
}

const onAnnotationDeleted = (index: number) => {
  if (index < 0 || index >= canvasAnnotations.value.length) return
  const next = canvasAnnotations.value.slice()
  next.splice(index, 1)
  commitAnnotations(next)
}

/** The Konva stage's own canvas element, used for viewport maths and for the
 *  wheel events the zoom controls send through the canvas's zoom pipeline. */
const stageCanvasEl = (): HTMLCanvasElement | null => {
  const root = konvaCanvas.value?.$el as HTMLElement | undefined
  return root?.querySelector?.('canvas') ?? null
}

/**
 * The magic path already sends viewport pixels; the manual drawing path sends
 * the pointer position inside the stage container, which put the picker
 * hundreds of pixels from the shape - or off screen entirely.
 */
const toViewportPoint = (annotation: CanvasAnnotation | null, point: { x: number; y: number }) => {
  if (annotation?.className?.startsWith('magic-generated-')) return point
  const box = stageCanvasEl()?.getBoundingClientRect()
  return box ? { x: box.left + point.x, y: box.top + point.y } : point
}

const placeClassSelector = async () => {
  selectorPlaced.value = false
  await nextTick()
  const el = classSelectorEl.value
  if (!el) return
  const box = el.getBoundingClientRect()
  const margin = 12
  const x = Math.min(Math.max(margin, classSelectorPosition.value.x), window.innerWidth - box.width - margin)
  const y = Math.min(Math.max(margin, classSelectorPosition.value.y), window.innerHeight - box.height - margin)
  classSelectorPosition.value = { x: Math.round(x), y: Math.round(y) }
  selectorPlaced.value = true
  el.querySelector('button')?.focus()
}

const onSelectorOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('[data-class-selector]')) return
  cancelClassSelection()
}

/** The point and polygon tools open the picker from inside a mousedown, and that
 *  same event still has to reach the document - arming a tick later keeps the
 *  picker from closing on the click that opened it. */
let selectorArmTimer: ReturnType<typeof setTimeout> | null = null

const armSelectorOutsideClick = () => {
  disarmSelectorOutsideClick()
  selectorArmTimer = setTimeout(() => {
    selectorArmTimer = null
    document.addEventListener('mousedown', onSelectorOutsideClick)
  }, 0)
}

const disarmSelectorOutsideClick = () => {
  if (selectorArmTimer) clearTimeout(selectorArmTimer)
  selectorArmTimer = null
  document.removeEventListener('mousedown', onSelectorOutsideClick)
}

const closeClassSelector = () => {
  showClassSelector.value = false
  selectorPlaced.value = false
  pendingAnnotation.value = null
  disarmSelectorOutsideClick()
  focusBeforeSelector?.focus?.()
  focusBeforeSelector = null
}

const onShowClassSelector = (annotation: CanvasAnnotation, position: { x: number; y: number }) => {
  focusBeforeSelector = document.activeElement as HTMLElement | null
  pendingAnnotation.value = annotation
  classSelectorPosition.value = toViewportPoint(annotation, position)
  showClassSelector.value = true
  placeClassSelector()
  armSelectorOutsideClick()
}

const selectAnnotationClass = (className: string) => {
  if (!pendingAnnotation.value) return

  lastSelectedClass.value = className

  const originalClassName = pendingAnnotation.value.className
  const isMagicAnnotation = originalClassName?.startsWith('magic-generated-')

  pendingAnnotation.value.className = className

  if (isMagicAnnotation) {
    const annotationIndex = canvasAnnotations.value.findIndex(ann =>
      ann.className === originalClassName ||
      (ann.type === pendingAnnotation.value?.type &&
       ann.points && pendingAnnotation.value?.points &&
       ann.points.length === pendingAnnotation.value.points.length &&
       ann.points[0]?.x === pendingAnnotation.value.points[0]?.x &&
       ann.points[0]?.y === pendingAnnotation.value.points[0]?.y)
    )

    if (annotationIndex !== -1 && canvasAnnotations.value[annotationIndex]) {
      canvasAnnotations.value[annotationIndex]!.className = className
      unsavedMarks.value = true
      pushHistory()
    }
    // The polygon now belongs to a class, so close the magic session and keep it.
    // The next click then starts a fresh object instead of refining this one.
    konvaCanvas.value?.endMagicSession({ keepAnnotation: true })
  } else if (konvaCanvas.value) {
    konvaCanvas.value.finalizeAnnotation(className)
  }

  closeClassSelector()
}

const cancelClassSelection = () => {
  const wasMagic = pendingAnnotation.value?.className?.startsWith('magic-generated-')
  if (wasMagic) {
    // Discard the whole magic session, including its polygon and accumulated points.
    konvaCanvas.value?.endMagicSession({ keepAnnotation: false })
    say('ok', 'That mask was dropped because no ink was chosen for it.', { hold: false })
  } else {
    konvaCanvas.value?.cancelCurrentAnnotation()
  }
  closeClassSelector()
}

const completeAnnotation = () => konvaCanvas.value?.completeCurrentAnnotation(lastSelectedClass.value)
const cancelAnnotation = () => konvaCanvas.value?.cancelCurrentAnnotation()

// ── Zoom ────────────────────────────────────────────────────────────────────

/**
 * The tray's zoom controls drive the canvas's own wheel pipeline.
 *
 * The canvas keeps its stage transform private, so a synthetic wheel over the
 * centre of the plate is the one route that changes zoom and leaves every
 * derived value (hairline widths, hit areas) consistent. Konva reads the scale
 * off the node, which is only written when Vue has patched it, so each step
 * waits a tick.
 */
const dispatchStageWheel = (direction: 1 | -1) => {
  const el = stageCanvasEl()
  if (!el) return false
  const box = el.getBoundingClientRect()
  el.dispatchEvent(new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: box.left + box.width / 2,
    clientY: box.top + box.height / 2,
    deltaY: direction > 0 ? -100 : 100
  }))
  return true
}

const stageScale = () => konvaCanvas.value?.getStageScale?.() ?? 1

const zoomBy = async (direction: 1 | -1, steps = 4) => {
  for (let i = 0; i < steps; i++) {
    if (!dispatchStageWheel(direction)) return
    await nextTick()
  }
}

const zoomTo = async (target: number) => {
  for (let i = 0; i < 90; i++) {
    const scale = stageScale()
    if (Math.abs(scale - target) <= 0.03) return
    if (!dispatchStageWheel(scale > target ? -1 : 1)) return
    await nextTick()
    if (stageScale() === scale) return
  }
}

const zoomIn = () => zoomBy(1)
const zoomOut = () => zoomBy(-1)
const resetZoom = () => zoomTo(1)
const fitToScreen = () => zoomTo(1)

/** What the annotator actually sees: the fit scale times the stage's own zoom. */
const zoomPercent = computed(() => {
  const fit = konvaCanvas.value?.getImageScale?.() || 0
  const stage = konvaCanvas.value?.getStageScale?.() || 1
  return Math.round(fit * stage * 100)
})

const plateLabel = computed(() => {
  const size = konvaCanvas.value?.getOriginalImageSize?.()
  return size?.width ? `${size.width}×${size.height}` : ''
})

// ── Plate actions ───────────────────────────────────────────────────────────

const deleteSelectedAnnotation = () => {
  if (selectedAnnotationIndex.value === null) return
  const next = canvasAnnotations.value.slice()
  next.splice(selectedAnnotationIndex.value, 1)
  selectedAnnotationIndex.value = null
  commitAnnotations(next)
}

const duplicateSelectedAnnotation = () => {
  if (selectedAnnotationIndex.value === null) return
  const annotation = canvasAnnotations.value[selectedAnnotationIndex.value]
  if (!annotation) return
  const duplicated = JSON.parse(JSON.stringify(annotation))
  if (duplicated.startPoint) {
    duplicated.startPoint.x += 20
    duplicated.startPoint.y += 20
  } else if (duplicated.center) {
    duplicated.center.x += 20
    duplicated.center.y += 20
  } else if (duplicated.points) {
    duplicated.points = duplicated.points.map((p: { x: number; y: number }) => ({ x: p.x + 20, y: p.y + 20 }))
  }
  commitAnnotations([...canvasAnnotations.value, duplicated])
}

const clearAllAnnotations = async () => {
  const count = canvasAnnotations.value.length
  if (!count) return
  const ok = await askConfirm({
    title: `Clear ${count} mark${count === 1 ? '' : 's'} off this plate?`,
    body: 'Every mark on sheet #' + taskId + ' is taken off, including any that were loaded from a saved record. Undo brings them back while you stay on this sheet.',
    confirmLabel: 'Clear the plate',
    danger: true
  })
  if (!ok) return

  // The magic session owns a polygon in that array; without ending it the next
  // magic click refines a shape that no longer exists and silently vanishes.
  konvaCanvas.value?.endMagicSession({ keepAnnotation: false })
  konvaCanvas.value?.cancelCurrentAnnotation()
  commitAnnotations([])
  selectedAnnotationIndex.value = null
  if (showClassSelector.value) closeClassSelector()
  say('ok', `${count} mark${count === 1 ? '' : 's'} cleared. Undo puts them back.`, { hold: false })
}

const reloadSheet = async () => {
  if (unsavedMarks.value && canvasAnnotations.value.length) {
    const ok = await askConfirm({
      title: 'Reload this sheet?',
      body: `${canvasAnnotations.value.length} mark(s) on the plate have not been saved. Reloading takes them off and reads the sheet again from the server.`,
      confirmLabel: 'Reload and discard',
      danger: true
    })
    if (!ok) return
  }
  loadData()
}

// ── Coordinates ─────────────────────────────────────────────────────────────

/**
 * Display space -> original image pixels.
 *
 * Save and export both go through here. Export used to write raw canvas
 * coordinates, which depend on the annotator's window size, so two people
 * exporting the same sheet got two different files.
 */
const toOriginalSpace = (marks: CanvasAnnotation[]) => {
  const convertToOriginal = konvaCanvas.value?.convertToOriginal
  const imageScale = konvaCanvas.value?.getImageScale?.()
  if (!convertToOriginal || !imageScale || imageScale <= 0) {
    throw new Error('The plate has not finished measuring the image')
  }

  return marks.map((ann) => {
    const converted: any = { type: ann.type, className: ann.className }

    if (ann.type === 'rectangle' && ann.startPoint && typeof ann.width === 'number' && typeof ann.height === 'number') {
      const topLeft = convertToOriginal(ann.startPoint)
      const bottomRight = convertToOriginal({
        x: ann.startPoint.x + ann.width,
        y: ann.startPoint.y + ann.height
      })
      converted.startPoint = {
        x: Math.min(topLeft.x, bottomRight.x),
        y: Math.min(topLeft.y, bottomRight.y)
      }
      converted.width = Math.abs(bottomRight.x - topLeft.x)
      converted.height = Math.abs(bottomRight.y - topLeft.y)
    } else if ((ann.type === 'polygon' || ann.type === 'freehand') && ann.points) {
      converted.points = ann.points.map((p) => convertToOriginal(p))
    } else if (ann.type === 'line' && ann.startPoint && ann.endPoint) {
      converted.startPoint = convertToOriginal(ann.startPoint)
      converted.endPoint = convertToOriginal(ann.endPoint)
    } else if ((ann.type === 'circle' || ann.type === 'dot') && ann.center && ann.radius) {
      converted.center = convertToOriginal(ann.center)
      converted.radius = ann.radius / imageScale
    }

    return converted
  })
}

const exportAnnotations = () => {
  if (!canvasAnnotations.value.length) return
  try {
    const size = konvaCanvas.value?.getOriginalImageSize?.() || { width: 0, height: 0 }
    const payload = {
      sheetId: Number(taskId),
      projectId: taskData.value?.projectId ?? null,
      imageSize: size,
      exportedAt: new Date().toISOString(),
      annotations: toOriginalSpace(savableMarks.value)
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `annotations-sheet-${taskId}.json`
    link.click()
    URL.revokeObjectURL(url)
    const skipped = unclassedMarks.value.length
    say('ok', `Exported ${payload.annotations.length} mark(s) in original image pixels${skipped ? `; ${skipped} mark(s) with no ink were left out` : ''}.`, { hold: false })
  } catch (err: any) {
    say('error', `Could not export: ${err?.message || err}. The marks are still on the plate.`)
  }
}

// ── Saving ──────────────────────────────────────────────────────────────────

/** Returns true only when the server has the marks. */
const saveAnnotation = async ({ quiet = false } = {}): Promise<boolean> => {
  if (!taskData.value) return false
  if (!konvaCanvas.value || !plateReady()) {
    say('error', 'The plate is still loading, so marks cannot be placed on the image yet. Wait a moment and save again.')
    return false
  }
  if (!canvasAnnotations.value.length) {
    say('error', 'There is nothing on the plate to save yet.')
    return false
  }

  if (unclassedMarks.value.length) {
    const count = unclassedMarks.value.length
    const ok = await askConfirm({
      title: `${count} mark${count === 1 ? ' has' : 's have'} no ink`,
      body: `A mark without a class cannot go into the dataset. Choose an ink for ${count === 1 ? 'it' : 'them'} first — click the mask again with the magic stick to reopen the ink picker — or drop ${count === 1 ? 'it' : 'them'} now and save the remaining ${savableMarks.value.length}.`,
      confirmLabel: `Drop ${count} and save the rest`,
      cancelLabel: 'Go back and ink them',
      danger: true
    })
    if (!ok) return false
    konvaCanvas.value?.endMagicSession({ keepAnnotation: false })
    commitAnnotations(savableMarks.value.slice())
    if (!canvasAnnotations.value.length) {
      say('error', 'Nothing was left to save once the marks with no ink were dropped.')
      return false
    }
  }

  try {
    savingAnnotation.value = true
    if (!token.value) throw new Error('You are signed out')

    const converted = toOriginalSpace(canvasAnnotations.value)

    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/annotations`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: {
        taskId: parseInt(taskId),
        projectId: taskData.value.projectId,
        annotationData: { annotations: converted },
        metadata: {
          timestamp: Date.now(),
          canvasSize: {
            width: konvaCanvas.value.getDisplayImageSize().width,
            height: konvaCanvas.value.getDisplayImageSize().height
          }
        }
      }
    })

    unsavedMarks.value = false
    await fetchAnnotations()
    loadedRecordId.value = latestAnnotation.value?.id ?? null

    // The plate is deliberately left as it is: clearing it after a save read as
    // "your work was deleted" and pushed people into saving twice.
    if (!quiet) {
      const count = converted.length
      say('ok', `${count} mark${count === 1 ? '' : 's'} saved to sheet #${taskId}${loadedRecordId.value ? ` as record #${loadedRecordId.value}` : ''}. They stay on the plate.`, { hold: false })
    }
    return true
  } catch (err: any) {
    say('error', `Sheet #${taskId} was not saved: ${err?.message || err}. Your marks are still on the plate — nothing has been lost.`, {
      action: { label: 'Try saving again', run: () => { saveAnnotation() } }
    })
    return false
  } finally {
    savingAnnotation.value = false
  }
}

const markTaskComplete = async (): Promise<boolean> => {
  try {
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/update`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: { taskId: [Number(taskId)], status: 'completed' }
    })
    if (taskData.value) taskData.value.status = 'completed'
    const row = queueTasks.value.find((t) => t.id === Number(taskId))
    if (row) row.status = 'completed'
    return true
  } catch (err: any) {
    say('error', `The marks were saved, but sheet #${taskId} could not be marked complete: ${err?.message || err}. It will still show as in progress on the project board.`)
    return false
  }
}

const saveCompleteAndNext = async () => {
  if (!taskData.value) return
  try {
    savingAndNext.value = true

    if (canvasAnnotations.value.length > 0 && unsavedMarks.value) {
      const saved = await saveAnnotation({ quiet: true })
      // A failed save used to be followed by the jump to the next sheet, which
      // wiped the notice that said so. Staying put is the whole point.
      if (!saved) return
    } else if (!canvasAnnotations.value.length && !annotations.value.length) {
      const ok = await askConfirm({
        title: `Complete sheet #${taskId} with nothing marked?`,
        body: 'Nothing is on the plate and no record has ever been saved for this sheet. Completing it now tells the project there was nothing here to mark.',
        confirmLabel: 'Complete it as empty'
      })
      if (!ok) return
    }

    if (!(await markTaskComplete())) return

    const next = taskData.value.nextTaskId
    if (next) {
      say('ok', `Sheet #${taskId} saved and completed. Opening the next sheet.`, { hold: false })
      unsavedMarks.value = false
      goToTask(next)
    } else {
      queueDone.value = true
    }
  } finally {
    savingAndNext.value = false
  }
}

// ── Reading a saved record back onto the plate ──────────────────────────────

const convertApiAnnotationToCanvas = (annotationData: any): CanvasAnnotation[] => {
  const originalToDisplay = konvaCanvas.value?.convertToDisplay
  const imageScale = konvaCanvas.value?.getImageScale?.()
  if (!annotationData || !originalToDisplay || !imageScale) {
    throw new Error('The plate is not ready to place saved marks')
  }

  const converted: CanvasAnnotation[] = []
  const source = annotationData.annotations || (Array.isArray(annotationData) ? annotationData : [annotationData])

  for (const ann of source) {
    if (ann.type === 'rectangle' && ann.startPoint && typeof ann.width === 'number' && typeof ann.height === 'number') {
      converted.push({
        type: 'rectangle',
        startPoint: originalToDisplay(ann.startPoint),
        width: ann.width * imageScale,
        height: ann.height * imageScale,
        className: ann.className || ann.class
      })
    } else if ((ann.type === 'polygon' || ann.type === 'freehand') && ann.points) {
      converted.push({
        type: ann.type,
        points: ann.points.map((p: { x: number; y: number }) => originalToDisplay(p)),
        className: ann.className || ann.class
      })
    } else if (ann.type === 'line' && ann.startPoint && ann.endPoint) {
      converted.push({
        type: 'line',
        startPoint: originalToDisplay(ann.startPoint),
        endPoint: originalToDisplay(ann.endPoint),
        className: ann.className || ann.class
      })
    } else if ((ann.type === 'circle' || ann.type === 'dot') && ann.center) {
      converted.push({
        type: ann.type,
        center: originalToDisplay(ann.center),
        radius: (ann.radius || 5) * imageScale,
        className: ann.className || ann.class
      })
    }
  }

  return converted
}

const applyAnnotation = async (
  annotation: Annotation,
  { announce = true, confirmReplace = true } = {}
) => {
  if (!isImageTask.value) {
    say('error', 'This sheet is not an image, so saved marks cannot be shown on it.')
    return
  }

  if (confirmReplace && unsavedMarks.value && canvasAnnotations.value.length) {
    const ok = await askConfirm({
      title: 'Replace the marks on the plate?',
      body: `${canvasAnnotations.value.length} unsaved mark(s) are on sheet #${taskId}. Loading record #${annotation.id} takes them off and puts that record's marks down instead.`,
      confirmLabel: 'Load the record',
      danger: true
    })
    if (!ok) return
  }

  if (!plateReady() && !(await waitForPlate(6000))) {
    say('error', `Record #${annotation.id} could not be placed: the image has not finished loading. Try again in a moment.`, {
      action: { label: 'Try again', run: () => { applyAnnotation(annotation, { announce, confirmReplace: false }) } }
    })
    return
  }

  try {
    const converted = convertApiAnnotationToCanvas(annotation.annotationData)
    const rawCount = (annotation.annotationData?.annotations || []).length
    commitAnnotations(converted, { dirty: false, history: false })
    // A loaded record is the new floor: undo edits it, it cannot undo it away.
    annotationHistory.value = [JSON.parse(JSON.stringify(converted))]
    historyIndex.value = 0
    unsavedMarks.value = false
    loadedRecordId.value = annotation.id
    selectedAnnotationIndex.value = null

    if (rawCount && !converted.length) {
      say('error', `Record #${annotation.id} holds ${rawCount} mark(s) in a shape this screen cannot read, so the plate is empty. Do not save over it — tell whoever exports this project.`)
      return
    }
    if (announce) {
      say('ok', `Record #${annotation.id} from ${formatDate(annotation.createdAt)} is on the plate — ${converted.length} mark(s).`, { hold: false })
    }
  } catch (err: any) {
    say('error', `Record #${annotation.id} could not be put on the plate: ${err?.message || err}. It is still saved on the server; do not redraw it yet.`)
  }
}

const deleteAnnotationFromDb = async (annotationId: number) => {
  const record = annotations.value.find((a) => a.id === annotationId)
  const ok = await askConfirm({
    title: `Delete record #${annotationId}?`,
    body: `The saved marks in this record${record?.userEmail ? `, made by ${record.userEmail},` : ''} are removed from the server for good. Anything currently on the plate stays where it is.`,
    confirmLabel: 'Delete the record',
    danger: true
  })
  if (!ok) return

  try {
    deletingAnnotation.value = annotationId
    await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/annotations/${annotationId}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    annotations.value = annotations.value.filter((annotation) => annotation.id !== annotationId)
    if (loadedRecordId.value === annotationId) {
      loadedRecordId.value = null
      unsavedMarks.value = canvasAnnotations.value.length > 0
    }
    say('ok', `Record #${annotationId} deleted.`, { hold: false })
  } catch (err: any) {
    say('error', `Record #${annotationId} was not deleted: ${err?.message || err}. It is still on the server.`)
  } finally {
    deletingAnnotation.value = null
  }
}

// ── Keyboard ────────────────────────────────────────────────────────────────

/** Every key the tray prints, wired here. A printed key that does nothing
 *  costs more than no key at all. */
const TOOL_KEYS: Record<string, string> = {
  m: 'magic',
  r: 'rectangle',
  p: 'polygon',
  c: 'circle',
  l: 'line',
  d: 'dot',
  f: 'freehand',
  v: 'select',
  h: 'pan'
}

const handleKeyDown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  if (target && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)) return

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

  if (event.metaKey || event.ctrlKey) {
    const key = event.key.toLowerCase()
    if (key === 's') {
      event.preventDefault()
      if (!savingAnnotation.value && !savingAndNext.value) saveAnnotation()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (!savingAnnotation.value && !savingAndNext.value) saveCompleteAndNext()
    } else if (key === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    return
  }
  if (event.altKey) return

  if (event.key === 'Escape') {
    if (showClassSelector.value) cancelClassSelection()
    else cancelAnnotation()
    return
  }

  if (showClassSelector.value) {
    const numKey = parseInt(event.key)
    if (numKey >= 1 && numKey <= Math.min(projectClasses.value.length, 9)) {
      const className = projectClasses.value[numKey - 1]
      if (className) {
        event.preventDefault()
        selectAnnotationClass(className)
      }
    } else if (event.key === 'Enter' && lastSelectedClass.value && projectClasses.value.includes(lastSelectedClass.value)) {
      event.preventDefault()
      selectAnnotationClass(lastSelectedClass.value)
    }
    return
  }

  const tool = TOOL_KEYS[event.key.toLowerCase()]
  if (tool) {
    event.preventDefault()
    selectTool(tool)
    return
  }

  if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomIn() }
  else if (event.key === '-' || event.key === '_') { event.preventDefault(); zoomOut() }
  else if (event.key === '0') { event.preventDefault(); resetZoom() }
}

// ── Guarding unsaved work ───────────────────────────────────────────────────

const onBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!unsavedMarks.value || !canvasAnnotations.value.length) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(async () => {
  if (!unsavedMarks.value || !canvasAnnotations.value.length) return true
  return await askConfirm({
    title: 'Leave with unsaved marks?',
    body: `${canvasAnnotations.value.length} mark(s) on sheet #${taskId} have not been saved. Leaving now loses them.`,
    confirmLabel: 'Leave and lose them',
    cancelLabel: 'Stay and save',
    danger: true
  })
})

// ── Lifecycle ───────────────────────────────────────────────────────────────

definePageMeta({
  layout: false
})

/** Assistance is the default tool, but only when there is an engine behind it. */
watch(sam2Resolved, (resolved) => {
  if (!resolved || assistUrl.value) return
  if (currentTool.value === 'magic' && !toolChosenByHand.value) currentTool.value = 'rectangle'
  say('error', 'This organization has no SAM 2 connection, so the magic stick cannot segment. The drawing tools still work; a connection is added under Organization → Settings → Connections.', { hold: false })
})

// The stage only exists once the sheet has loaded, so the observer is attached
// when the element appears rather than on mount, where it was always still null.
watch(stageBox, (element) => {
  plateObserver?.disconnect()
  plateObserver = null
  if (!element || typeof ResizeObserver === 'undefined') return
  plateObserver = new ResizeObserver(([entry]) => {
    const box = entry.contentRect
    // The p-12 padding on the inner wrapper, doubled.
    plateSize.value = {
      width: Math.max(320, Math.round(box.width - 96)),
      height: Math.max(240, Math.round(box.height - 96))
    }
  })
  plateObserver.observe(element)
})

onMounted(() => {
  coarsePointer.value = window.matchMedia?.('(pointer: coarse)').matches ?? false
  loadData()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  plateObserver?.disconnect()
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  disarmSelectorOutsideClick()
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>
