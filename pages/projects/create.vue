<template>
  <div class="pb-20">
    <!-- The docket: the facts of the sheet being set up, printed along its edge. -->
    <header class="docket h-11 gap-0 px-4 sm:px-6">
      <button
        type="button"
        class="control flex items-center gap-1.5 py-1 pr-4 text-stock-600 hover:text-stock-950"
        @click="requestLeave"
      >
        <UIcon name="i-lucide-arrow-left" class="size-3.5" />
        Back
      </button>
      <dl class="furniture flex min-w-0 items-center gap-5 border-l border-stock-400 pl-4 text-stock-600">
        <div class="docket-field min-w-0">
          <dt>Organization</dt>
          <dd class="truncate">{{ organizationName || organizationId || '—' }}</dd>
        </div>
        <div class="docket-field hidden md:flex">
          <dt>Classes</dt>
          <dd>{{ projectForm.classes.length }}</dd>
        </div>
        <div class="docket-field hidden lg:flex">
          <dt>Files</dt>
          <dd>{{ selectedFiles.length }}</dd>
        </div>
      </dl>
    </header>

    <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <!-- Loading the organization this project will belong to. -->
      <p v-if="loading" class="furniture py-20 text-center text-stock-600">
        Loading organization…
      </p>

      <!-- Fatal only: setup cannot start at all without an organization. -->
      <section v-else-if="fatalError" class="mx-auto max-w-xl border border-correct-500 bg-stock-50 p-6">
        <p class="furniture text-correct-500">Setup cannot start</p>
        <p class="mt-2 text-[15px] leading-snug text-stock-950">{{ fatalError }}</p>
        <p class="mt-2 text-[13px] leading-relaxed text-stock-600">
          A project is always created inside an organization, so this page needs one before it can
          ask you anything. Open the organization you want the project in and start setup from there.
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <button v-if="organizationId" type="button" class="ink-button" @click="retryOrganization">
            <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
            Try again
          </button>
          <button type="button" class="ink-button ink-button--outline" @click="leaveSetup">
            Go to organizations
          </button>
        </div>
      </section>

      <!-- The receipt: what was actually created, and what still needs a decision. -->
      <section v-else-if="phase === 'created'" class="mx-auto max-w-3xl">
        <h1 class="text-[26px] font-semibold tracking-tight text-stock-950">
          {{ projectForm.name }} is created
        </h1>
        <p class="mt-1.5 text-[14px] leading-relaxed text-stock-600">
          Project #{{ createdProjectId }} in {{ organizationName || 'this organization' }}.
          Nothing on this page is unsaved any more.
        </p>

        <dl class="docket mt-6 flex-wrap gap-x-8 gap-y-2 border border-stock-400 px-4 py-3 furniture text-stock-600">
          <div class="docket-field"><dt>Type</dt><dd>{{ selectedTypeLabel }}</dd></div>
          <div class="docket-field"><dt>Classes</dt><dd>{{ projectForm.classes.length }}</dd></div>
          <div class="docket-field"><dt>Files sent</dt><dd>{{ imageUpload.done + videoUpload.done }}</dd></div>
          <div class="docket-field"><dt>Tasks</dt><dd>{{ (imageUpload.tasks + videoUpload.tasks).toLocaleString() }}</dd></div>
        </dl>

        <!-- Class inks, as they will print on the plate. -->
        <div v-if="projectForm.classes.length" class="mt-6 border-t border-stock-400 pt-4">
          <h2 class="text-[15px] font-semibold tracking-tight text-stock-950">Inks</h2>
          <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <li v-for="className in projectForm.classes" :key="className" class="flex items-center gap-2">
              <span class="swatch" :style="{ backgroundColor: classInk(className) }" />
              <span class="text-[13px] text-stock-800">{{ className }}</span>
            </li>
          </ul>
        </div>

        <!-- Upload state, one row per group, with a way out of every failure. -->
        <div v-if="imageUpload.state !== 'idle' || videoUpload.state !== 'idle'" class="mt-6 border-t border-stock-400 pt-4">
          <h2 class="text-[15px] font-semibold tracking-tight text-stock-950">Data</h2>

          <div v-if="imageUpload.state !== 'idle'" class="mt-3 border p-4" :class="imageUpload.state === 'failed' ? 'border-correct-500' : 'border-stock-400'">
            <div class="flex items-baseline justify-between gap-4">
              <p class="furniture" :class="imageUpload.state === 'failed' ? 'text-correct-500' : 'text-stock-600'">
                Images and archives
              </p>
              <p class="furniture text-stock-600">{{ imageQueue.length || imageUpload.done }} files</p>
            </div>
            <p class="mt-2 text-[13px] leading-relaxed text-stock-800">{{ imageUpload.message }}</p>
            <div v-if="imageUpload.state === 'sending'" class="mt-3 h-1.5 w-full bg-stock-300">
              <div class="h-1.5 bg-stock-950 transition-[width] duration-200" :style="{ width: `${imageUpload.percent}%` }" />
            </div>
            <div v-if="imageUpload.state === 'failed'" class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="ink-button" @click="runImageUpload">
                <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
                Try these files again
              </button>
              <button type="button" class="ink-button ink-button--outline" @click="skipImages">
                Skip these files
              </button>
            </div>
            <ul v-if="imageUpload.state === 'failed'" class="mt-3 space-y-1">
              <li v-for="file in imageQueue" :key="fileKey(file)" class="furniture text-stock-600">
                {{ file.name }}
              </li>
            </ul>
          </div>

          <div v-if="videoUpload.state !== 'idle'" class="mt-3 border p-4" :class="videoUpload.state === 'failed' ? 'border-correct-500' : 'border-stock-400'">
            <div class="flex items-baseline justify-between gap-4">
              <p class="furniture" :class="videoUpload.state === 'failed' ? 'text-correct-500' : 'text-stock-600'">
                Videos at {{ videoFps }} FPS
              </p>
              <p class="furniture text-stock-600">{{ videoQueue.length || videoUpload.done }} files</p>
            </div>
            <p class="mt-2 text-[13px] leading-relaxed text-stock-800">{{ videoUpload.message }}</p>
            <div v-if="videoUpload.state === 'sending'" class="mt-3 h-1.5 w-full bg-stock-300">
              <div class="h-1.5 bg-stock-950 transition-[width] duration-200" :style="{ width: `${videoUpload.percent}%` }" />
            </div>
            <div v-if="videoUpload.state === 'failed'" class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="ink-button" @click="runVideoUpload">
                <UIcon name="i-lucide-rotate-cw" class="size-3.5" />
                Try these videos again
              </button>
              <button type="button" class="ink-button ink-button--outline" @click="skipVideos">
                Skip these videos
              </button>
            </div>
            <ul v-if="videoUpload.state === 'failed'" class="mt-3 space-y-1">
              <li v-for="file in videoQueue" :key="fileKey(file)" class="furniture text-stock-600">
                {{ file.name }}
              </li>
            </ul>
          </div>
        </div>

        <!-- The next step, named. -->
        <div class="mt-8 flex flex-wrap items-center gap-3 border-t border-stock-400 pt-6">
          <button type="button" class="ink-button" :disabled="uploadsRunning" @click="openProject">
            <UIcon name="i-lucide-chevron-right" class="size-3.5" />
            {{ hasTasks ? 'Open the task pool' : 'Open the project and add data' }}
          </button>
          <button type="button" class="ink-button ink-button--outline" :disabled="uploadsRunning" @click="leaveSetup">
            Back to the organization
          </button>
          <p v-if="uploadsRunning" class="furniture text-stock-600">Upload in progress</p>
        </div>
      </section>

      <!-- Setup. -->
      <div v-else class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <form class="min-w-0" novalidate @submit.prevent="createProject">
          <h1 class="text-[26px] font-semibold tracking-tight text-stock-950">Set up a project</h1>
          <p class="mt-1.5 max-w-xl text-[14px] leading-relaxed text-stock-600">
            A project holds the images, the classes an annotator may apply, and the tasks made from
            them. Only the name is required; classes and data can be changed afterwards.
          </p>

          <!-- An interrupted setup, offered back rather than lost. -->
          <div v-if="draftAvailable" class="mt-6 border border-stock-950 bg-stock-50 p-4">
            <p class="furniture text-stock-600">Unfinished setup</p>
            <p class="mt-1.5 text-[13px] leading-relaxed text-stock-800">
              A setup for this organization was left open{{ draftAgeLabel }}. The typed fields and the
              class list can be brought back; the files you had chosen cannot.
            </p>
            <div class="mt-3 flex gap-2">
              <button type="button" class="ink-button" @click="restoreDraft">Continue it</button>
              <button type="button" class="ink-button ink-button--outline" @click="discardDraft">Start fresh</button>
            </div>
          </div>

          <!-- 01 Identity -->
          <section class="mt-10">
            <div class="flex items-baseline gap-3 border-b border-stock-400 pb-2">
              <span class="furniture text-stock-600">01</span>
              <h2 class="text-[15px] font-semibold tracking-tight text-stock-950">Identity</h2>
            </div>

            <div class="mt-5 space-y-6">
              <UFormField
                label="Project name"
                name="name"
                required
                :error="showErrors && nameError ? nameError : undefined"
                :help="showErrors && nameError ? undefined : 'Annotators see this name on every task they open.'"
              >
                <UInput
                  v-model="projectForm.name"
                  placeholder="Street scenes, batch 3"
                  size="lg"
                  class="w-full"
                  :disabled="creating"
                  @blur="touched.name = true"
                />
              </UFormField>

              <UFormField
                label="Description"
                name="description"
                :error="showErrors && descriptionError ? descriptionError : undefined"
                :help="showErrors && descriptionError ? undefined : 'Optional. What counts as a correct label here.'"
              >
                <UTextarea
                  v-model="projectForm.description"
                  placeholder="Label every vehicle that is fully inside the frame."
                  :rows="4"
                  size="lg"
                  class="w-full"
                  :disabled="creating"
                />
              </UFormField>
            </div>
          </section>

          <!-- 02 Type — a real radio group, so it can be reached and set from the keyboard. -->
          <section class="mt-10">
            <div class="flex items-baseline gap-3 border-b border-stock-400 pb-2">
              <span class="furniture text-stock-600">02</span>
              <h2 class="text-[15px] font-semibold tracking-tight text-stock-950">Work type</h2>
            </div>

            <fieldset class="mt-5" :disabled="creating">
              <legend class="sr-only">Project type</legend>
              <div class="grid gap-3 md:grid-cols-2">
                <label
                  v-for="type in SELECTABLE_PROJECT_TYPES"
                  :key="type.value"
                  class="flex cursor-pointer items-start gap-3 border p-4 transition-colors"
                  :class="projectForm.projectType === type.value
                    ? 'border-stock-950 bg-stock-50'
                    : 'border-stock-400 hover:border-stock-600'"
                >
                  <input
                    v-model="projectForm.projectType"
                    type="radio"
                    name="projectType"
                    :value="type.value"
                    class="mt-0.5 size-4 flex-none accent-reflex-600"
                  />
                  <span class="min-w-0">
                    <span class="block text-[14px] font-semibold text-stock-950">{{ type.label }}</span>
                    <span class="mt-1 block text-[13px] leading-relaxed text-stock-600">{{ type.description }}</span>
                  </span>
                </label>
              </div>
            </fieldset>
          </section>

          <!-- 03 Classes -->
          <section class="mt-10">
            <div class="flex items-baseline gap-3 border-b border-stock-400 pb-2">
              <span class="furniture text-stock-600">03</span>
              <h2 class="text-[15px] font-semibold tracking-tight text-stock-950">Classes</h2>
            </div>

            <p class="mt-4 max-w-xl text-[13px] leading-relaxed text-stock-600">
              A class is an ink. Each one gets its colour from its place in this list, so the order
              you set here is the colour an annotator will learn.
            </p>

            <div class="mt-4 flex gap-2">
              <UInput
                v-model="newClassName"
                placeholder="car, pedestrian, traffic light"
                size="lg"
                class="flex-1"
                :disabled="creating"
                aria-label="Class name, or several separated by commas"
                @keydown.enter="handleAddClassKeydown"
              />
              <button
                type="button"
                class="ink-button"
                :disabled="!newClassName.trim() || creating"
                @click="addClass"
              >
                <UIcon name="i-lucide-plus" class="size-3.5" />
                Add
              </button>
            </div>

            <p v-if="duplicateNotice" class="furniture mt-2 text-correct-500" role="status">
              {{ duplicateNotice }}
            </p>

            <ul v-if="projectForm.classes.length" class="mt-4 divide-y divide-stock-400 border-y border-stock-400">
              <li
                v-for="(className, index) in projectForm.classes"
                :key="className"
                class="flex items-center gap-3 py-2"
              >
                <span class="furniture w-6 text-stock-600">{{ index + 1 }}</span>
                <span class="swatch" :style="{ backgroundColor: classInk(className) }" />
                <span class="min-w-0 flex-1 truncate text-[14px] text-stock-950">{{ className }}</span>
                <button
                  type="button"
                  class="control px-2 py-1 text-stock-600 hover:text-correct-500"
                  :disabled="creating"
                  :aria-label="`Remove class ${className}`"
                  @click="removeClass(index)"
                >
                  Remove
                </button>
              </li>
            </ul>

            <p v-else class="mt-4 border border-dashed border-stock-400 p-4 text-[13px] leading-relaxed text-stock-600">
              No classes yet. An annotator can only apply classes defined here, so a project with none
              opens with nothing to click. Type one above, or several separated by commas.
            </p>

            <p v-if="inkRepeatsFrom" class="mt-3 text-[13px] leading-relaxed text-correct-500">
              There are nine inks. From class {{ inkRepeatsFrom }} on, colours repeat — {{ repeatedPairs }}
              print in the same ink and can only be told apart by name.
            </p>
          </section>

          <!-- 04 Data — one drop zone, the same rules as the project's own upload screen. -->
          <section class="mt-10">
            <div class="flex items-baseline gap-3 border-b border-stock-400 pb-2">
              <span class="furniture text-stock-600">04</span>
              <h2 class="text-[15px] font-semibold tracking-tight text-stock-950">Data</h2>
            </div>

            <p class="mt-4 max-w-xl text-[13px] leading-relaxed text-stock-600">
              Optional here — the project's Upload data screen does the same job later. Each image
              becomes one task; each video is cut into frames and every frame becomes its own task.
            </p>

            <div
              class="mt-4 border border-dashed p-6 text-center transition-colors"
              :class="isDragging ? 'border-stock-950 bg-stock-50' : 'border-stock-400'"
              @drop="handleDrop"
              @dragover.prevent
              @dragenter.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @click="openFilePicker"
            >
              <input
                ref="fileInput"
                type="file"
                multiple
                accept="image/*,video/*,.zip"
                class="sr-only"
                aria-label="Choose images, ZIP archives or videos"
                :disabled="creating"
                @change="handleFileSelect"
              />
              <UIcon name="i-lucide-upload" class="mx-auto size-6 text-stock-600" />
              <p class="mt-3 text-[14px] font-medium text-stock-950">Drop files here</p>
              <p class="mt-1 text-[13px] text-stock-600">
                Images or ZIP up to 50&nbsp;MB each · Videos up to 100&nbsp;MB each
              </p>
              <button
                type="button"
                class="ink-button ink-button--outline mt-4"
                :disabled="creating"
                @click.stop="openFilePicker"
              >
                <UIcon name="i-lucide-folder-open" class="size-3.5" />
                Choose files
              </button>
            </div>

            <!-- Rejected files, named with their reason, where the choice was made. -->
            <div v-if="rejectedFiles.length" class="mt-4 border border-correct-500 p-4" role="status" aria-live="polite">
              <div class="flex items-baseline justify-between gap-4">
                <p class="furniture text-correct-500">{{ rejectedFiles.length }} file(s) not added</p>
                <button type="button" class="control text-stock-600 hover:text-stock-950" @click="rejectedFiles = []">
                  Dismiss
                </button>
              </div>
              <ul class="mt-2 max-h-40 space-y-1 overflow-y-auto">
                <li v-for="item in rejectedFiles" :key="item.name" class="text-[13px] text-stock-800">
                  <span class="truncate">{{ item.name }}</span>
                  <span class="text-stock-600"> — {{ item.reason }}</span>
                </li>
              </ul>
            </div>

            <!-- Frame rate: shown only once a video is queued, since it is the one
                 setting that decides how many tasks a video becomes. -->
            <div v-if="selectedVideos.length" class="mt-4 border border-stock-400 p-4">
              <label for="fps-input" class="block text-[14px] font-semibold text-stock-950">
                Frame extraction rate
              </label>
              <p class="mt-1 text-[13px] leading-relaxed text-stock-600">
                At {{ videoFps }} FPS each second of footage becomes {{ videoFps }} task{{ videoFps === 1 ? '' : 's' }}.
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <UInput
                  id="fps-input"
                  v-model.number="videoFps"
                  type="number"
                  :min="1"
                  :max="30"
                  class="w-24"
                  :disabled="creating"
                />
                <button
                  v-for="preset in fpsPresets"
                  :key="preset"
                  type="button"
                  class="control border px-2.5 py-1.5"
                  :class="videoFps === preset
                    ? 'border-stock-950 bg-stock-950 text-stock-50'
                    : 'border-stock-400 text-stock-600 hover:border-stock-950 hover:text-stock-950'"
                  :disabled="creating"
                  @click="videoFps = preset"
                >
                  {{ preset }} FPS
                </button>
              </div>
              <p class="mt-3 text-[13px] text-stock-800">
                {{ selectedVideos.length }} video{{ selectedVideos.length === 1 ? '' : 's' }} →
                <span class="font-semibold">~{{ estimatedFrameTasks.toLocaleString() }} tasks</span>
                <span v-if="unmeasuredVideos"> plus {{ unmeasuredVideos }} of unread length</span>
              </p>
            </div>

            <!-- Selected files, each one carrying its own consequence. -->
            <div v-if="selectedFiles.length" class="mt-4">
              <div class="flex items-baseline justify-between gap-4 border-b border-stock-400 pb-2">
                <h3 class="furniture text-stock-600">Selected · {{ selectedFiles.length }}</h3>
                <button
                  type="button"
                  class="control text-stock-600 hover:text-correct-500"
                  :disabled="creating"
                  @click="clearFiles"
                >
                  Remove all
                </button>
              </div>
              <ul class="max-h-64 divide-y divide-stock-400 overflow-y-auto">
                <li v-for="(file, index) in selectedFiles" :key="fileKey(file)" class="flex items-center gap-3 py-2">
                  <UIcon :name="fileIcon(file)" class="size-4 flex-none text-stock-600" />
                  <span class="min-w-0 flex-1 truncate text-[13px] text-stock-950">{{ file.name }}</span>
                  <span class="furniture flex-none text-stock-600">{{ fileFact(file) }}</span>
                  <button
                    type="button"
                    class="control flex-none px-2 py-1 text-stock-600 hover:text-correct-500"
                    :disabled="creating"
                    :aria-label="`Remove ${file.name}`"
                    @click="removeFile(index)"
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </div>

            <!-- A large extraction is a decision, so it is taken before the upload, not after. -->
            <label
              v-if="needsExtractionConfirm"
              class="mt-4 flex items-start gap-3 border border-correct-500 p-4"
            >
              <input v-model="extractionConfirmed" type="checkbox" class="mt-0.5 size-4 flex-none accent-reflex-600" />
              <span class="text-[13px] leading-relaxed text-stock-800">
                This makes about {{ estimatedFrameTasks.toLocaleString() }} tasks from
                {{ selectedVideos.length }} video{{ selectedVideos.length === 1 ? '' : 's' }}. There is no bulk
                delete for tasks yet, so the way back is to delete the project. Lower the frame rate, or
                confirm this is what you want.
              </span>
            </label>
          </section>

          <!-- Submission failures stay on the page, next to the work they belong to. -->
          <div
            v-if="submitError"
            class="mt-8 border border-correct-500 bg-stock-50 p-4"
            role="alert"
            aria-live="assertive"
          >
            <p class="furniture text-correct-500">Not created</p>
            <p class="mt-1.5 text-[13px] leading-relaxed text-stock-800">{{ submitError }}</p>
            <p class="mt-1.5 text-[13px] leading-relaxed text-stock-600">
              Everything you entered is still on this page. Fix what the message names and press
              Create project again.
            </p>
          </div>

          <div class="mt-8 flex flex-wrap items-center gap-3 border-t border-stock-400 pt-6">
            <button type="submit" class="ink-button" :disabled="!canSubmit">
              <UIcon name="i-lucide-check" class="size-3.5" />
              {{ creating ? 'Creating…' : 'Create project' }}
            </button>
            <button type="button" class="ink-button ink-button--outline" :disabled="creating" @click="requestLeave">
              Cancel
            </button>
            <p v-if="needsExtractionConfirm && !extractionConfirmed" class="furniture text-correct-500">
              Confirm the frame count first
            </p>
          </div>

          <!-- Leaving is destructive here, so it says what goes. -->
          <div v-if="confirmLeave" class="mt-4 border border-correct-500 bg-stock-50 p-4">
            <p class="furniture text-correct-500">Leave setup?</p>
            <p class="mt-1.5 text-[13px] leading-relaxed text-stock-800">
              {{ leaveWarning }}
            </p>
            <div class="mt-3 flex gap-2">
              <button type="button" class="ink-button" @click="confirmLeave = false">Stay here</button>
              <button type="button" class="ink-button ink-button--outline" @click="leaveSetup">Leave anyway</button>
            </div>
          </div>
        </form>

        <!-- The summary rail stays on screen while the form scrolls past it. -->
        <aside class="h-fit lg:sticky lg:top-6">
          <h2 class="furniture border-b border-stock-400 pb-2 text-stock-600">This project</h2>
          <dl class="mt-3 space-y-3">
            <div>
              <dt class="furniture text-stock-600">Name</dt>
              <dd class="mt-1 break-words text-[14px] text-stock-950">
                {{ projectForm.name || 'Not named yet' }}
              </dd>
            </div>
            <div>
              <dt class="furniture text-stock-600">Type</dt>
              <dd class="mt-1 text-[14px] text-stock-950">{{ selectedTypeLabel }}</dd>
            </div>
            <div>
              <dt class="furniture text-stock-600">Classes</dt>
              <dd class="mt-1">
                <ul v-if="projectForm.classes.length" class="space-y-1">
                  <li
                    v-for="className in projectForm.classes.slice(0, 9)"
                    :key="className"
                    class="flex items-center gap-2"
                  >
                    <span class="swatch" :style="{ backgroundColor: classInk(className) }" />
                    <span class="min-w-0 truncate text-[13px] text-stock-800">{{ className }}</span>
                  </li>
                  <li v-if="projectForm.classes.length > 9" class="furniture text-stock-600">
                    +{{ projectForm.classes.length - 9 }} more
                  </li>
                </ul>
                <span v-else class="text-[13px] text-stock-600">None</span>
              </dd>
            </div>
            <div>
              <dt class="furniture text-stock-600">Tasks on creation</dt>
              <dd class="mt-1 text-[14px] text-stock-950">
                <span v-if="selectedFiles.length">~{{ estimatedTotalTasks.toLocaleString() }}</span>
                <span v-else class="text-stock-600">None yet</span>
              </dd>
              <dd v-if="zipCount" class="furniture mt-1 text-stock-600">
                plus whatever {{ zipCount }} archive(s) hold
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inkForClass, CLASS_INKS } from '~/utils/inks'
import { SELECTABLE_PROJECT_TYPES, projectTypeName } from '~/components/project/sections/projectTypes'

definePageMeta({
  layout: 'homepage'
})

const route = useRoute()
const organizationId = computed(() => route.query.organizationId as string | undefined)

const { isAuthenticated } = useAuth()
const token = useCookie('auth_token')

// ── Page state ─────────────────────────────────────────────────────────────
const loading = ref(true)
const creating = ref(false)
/** Fatal: setup cannot run at all. Submission failures never come here. */
const fatalError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const organizationName = ref('')
const phase = ref<'form' | 'created'>('form')
const createdProjectId = ref<number | null>(null)

const projectForm = reactive({
  name: '',
  description: '',
  projectType: 1,
  classes: [] as string[]
})

const touched = reactive({ name: false })
const showErrors = ref(false)

// ── Classes ────────────────────────────────────────────────────────────────
const newClassName = ref('')
const duplicateNotice = ref('')

const classInk = (className: string) => inkForClass(className, projectForm.classes)

const inkRepeatsFrom = computed(() =>
  projectForm.classes.length > CLASS_INKS.length ? CLASS_INKS.length + 1 : null
)

const repeatedPairs = computed(() => {
  const pairs = projectForm.classes
    .slice(CLASS_INKS.length)
    .map((className, index) => `${projectForm.classes[index]} and ${className}`)
  return pairs.slice(0, 3).join(', ') + (pairs.length > 3 ? `, and ${pairs.length - 3} more pair(s)` : '')
})

const addClass = () => {
  const names = newClassName.value
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)

  if (!names.length) return

  const duplicates: string[] = []
  names.forEach(name => {
    if (projectForm.classes.includes(name)) duplicates.push(name)
    else projectForm.classes.push(name)
  })

  newClassName.value = ''
  duplicateNotice.value = duplicates.length
    ? `Already in the list, not added again: ${duplicates.join(', ')}`
    : ''
}

const handleAddClassKeydown = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
  addClass()
}

const removeClass = (index: number) => {
  projectForm.classes.splice(index, 1)
  duplicateNotice.value = ''
}

// ── Files ──────────────────────────────────────────────────────────────────
/** Container formats the backend can extract frames from. */
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
const fpsPresets = [1, 5, 10, 15, 30]
const TASK_WARNING_THRESHOLD = 500

const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)
const selectedFiles = ref<File[]>([])
const rejectedFiles = ref<{ name: string, reason: string }[]>([])
const videoFps = ref(5)
const videoDurations = ref<Record<string, number>>({})
const extractionConfirmed = ref(false)

const fileKey = (file: File) => `${file.name}:${file.size}`

const isVideoFile = (file: File) =>
  file.type.startsWith('video/') ||
  VIDEO_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))

const isZipFile = (file: File) =>
  file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')

const selectedVideos = computed(() => selectedFiles.value.filter(isVideoFile))
const selectedNonVideos = computed(() => selectedFiles.value.filter(file => !isVideoFile(file)))
const zipCount = computed(() => selectedNonVideos.value.filter(isZipFile).length)

/** A video's length decides how many tasks it becomes, so it is read from the
 *  file before the upload rather than reported by a toast afterwards. */
const measureVideo = (file: File) => {
  const key = fileKey(file)
  if (videoDurations.value[key] !== undefined) return

  const url = URL.createObjectURL(file)
  const probe = document.createElement('video')
  probe.preload = 'metadata'
  probe.onloadedmetadata = () => {
    videoDurations.value[key] = Number.isFinite(probe.duration) ? probe.duration : 0
    URL.revokeObjectURL(url)
  }
  probe.onerror = () => {
    videoDurations.value[key] = 0
    URL.revokeObjectURL(url)
  }
  probe.src = url
}

const videoDuration = (file: File) => videoDurations.value[fileKey(file)] || 0

const formatDuration = (seconds: number) => {
  const whole = Math.round(seconds)
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

const videoTaskEstimate = (file: File) => {
  const duration = videoDuration(file)
  if (!duration || !videoFps.value) return 0
  return Math.max(1, Math.round(duration * videoFps.value))
}

const estimatedFrameTasks = computed(() =>
  selectedVideos.value.reduce((total, file) => total + videoTaskEstimate(file), 0)
)

const unmeasuredVideos = computed(() =>
  selectedVideos.value.filter(file => !videoDuration(file)).length
)

const estimatedTotalTasks = computed(() =>
  selectedNonVideos.value.filter(file => !isZipFile(file)).length + estimatedFrameTasks.value
)

const needsExtractionConfirm = computed(() => estimatedFrameTasks.value > TASK_WARNING_THRESHOLD)

watch(needsExtractionConfirm, needed => {
  if (!needed) extractionConfirmed.value = false
})

const fileFact = (file: File) => {
  if (!isVideoFile(file)) return formatFileSize(file.size)
  const duration = videoDuration(file)
  if (!duration) return `${formatFileSize(file.size)} · reading length`
  return `${formatDuration(duration)} · ~${videoTaskEstimate(file).toLocaleString()} tasks`
}

const fileIcon = (file: File) => {
  if (isVideoFile(file)) return 'i-lucide-film'
  if (isZipFile(file)) return 'i-lucide-file-archive'
  if (file.type.startsWith('image/')) return 'i-lucide-file-image'
  return 'i-lucide-file'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 bytes'
  const units = ['bytes', 'KB', 'MB', 'GB']
  const step = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, step)).toFixed(1))} ${units[step]}`
}

const openFilePicker = () => {
  if (creating.value) return
  fileInput.value?.click()
}

const addFiles = (files: File[]) => {
  const rejected: { name: string, reason: string }[] = []

  files.forEach(file => {
    const video = isVideoFile(file)
    const usable = video || isZipFile(file) || file.type.startsWith('image/')
    const maxSize = (video ? 100 : 50) * 1024 * 1024

    if (!usable) {
      rejected.push({ name: file.name, reason: 'not an image, ZIP or video' })
    } else if (file.size > maxSize) {
      rejected.push({ name: file.name, reason: `${formatFileSize(file.size)}, over the ${video ? 100 : 50} MB limit` })
    } else if (selectedFiles.value.some(existing => fileKey(existing) === fileKey(file))) {
      rejected.push({ name: file.name, reason: 'already in the list' })
    } else {
      selectedFiles.value.push(file)
      if (video) measureVideo(file)
    }
  })

  rejectedFiles.value = rejected

  if (fileInput.value) fileInput.value.value = ''
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  if (event.dataTransfer?.files) addFiles(Array.from(event.dataTransfer.files))
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) addFiles(Array.from(target.files))
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const clearFiles = () => {
  selectedFiles.value = []
  rejectedFiles.value = []
}

// ── Validation ─────────────────────────────────────────────────────────────
const nameError = computed(() => {
  const name = projectForm.name.trim()
  if (!name) return 'A project name is required.'
  if (name.length > 100) return `${name.length} characters. The limit is 100.`
  return null
})

const descriptionError = computed(() => {
  const length = projectForm.description.trim().length
  return length > 500 ? `${length} characters. The limit is 500.` : null
})

const selectedTypeLabel = computed(() => projectTypeName(projectForm.projectType))

const canSubmit = computed(() =>
  !creating.value && (!needsExtractionConfirm.value || extractionConfirmed.value)
)

// A field that has been visited reports its own problem without waiting for submit.
watch(() => projectForm.name, () => {
  if (touched.name) showErrors.value = true
})

// ── Draft: an interrupted setup is offered back, not thrown away ────────────
const DRAFT_KEY = 'labeloo:project-setup-draft'
const draftAvailable = ref(false)
const draftAgeLabel = ref('')
let pendingDraft: { name: string, description: string, projectType: number, classes: string[] } | null = null

const isDirty = computed(() =>
  Boolean(projectForm.name || projectForm.description || projectForm.classes.length || selectedFiles.value.length)
)

const readDraft = () => {
  if (!import.meta.client || !organizationId.value) return
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved.organizationId !== organizationId.value) return
    if (!saved.name && !saved.description && !saved.classes?.length) return

    pendingDraft = {
      name: saved.name || '',
      description: saved.description || '',
      projectType: saved.projectType || 1,
      classes: Array.isArray(saved.classes) ? saved.classes : []
    }
    const minutes = Math.round((Date.now() - (saved.savedAt || Date.now())) / 60000)
    draftAgeLabel.value = minutes < 1 ? ' a moment ago' : minutes < 60 ? ` ${minutes} minutes ago` : ''
    draftAvailable.value = true
  } catch {
    // A draft that cannot be read is not worth a message; setup starts clean.
  }
}

const writeDraft = () => {
  if (!import.meta.client || !organizationId.value || phase.value !== 'form') return
  try {
    if (!projectForm.name && !projectForm.description && !projectForm.classes.length) {
      localStorage.removeItem(DRAFT_KEY)
      return
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      organizationId: organizationId.value,
      name: projectForm.name,
      description: projectForm.description,
      projectType: projectForm.projectType,
      classes: projectForm.classes,
      savedAt: Date.now()
    }))
  } catch {
    // Storage refused (private window, quota). The form still works.
  }
}

const clearDraft = () => {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to recover from here.
  }
}

const restoreDraft = () => {
  if (pendingDraft) {
    projectForm.name = pendingDraft.name
    projectForm.description = pendingDraft.description
    projectForm.projectType = pendingDraft.projectType
    projectForm.classes = [...pendingDraft.classes]
  }
  draftAvailable.value = false
}

const discardDraft = () => {
  draftAvailable.value = false
  pendingDraft = null
  clearDraft()
}

watch(projectForm, writeDraft, { deep: true })

// ── Leaving ────────────────────────────────────────────────────────────────
const confirmLeave = ref(false)

const leaveWarning = computed(() => {
  const parts: string[] = []
  if (projectForm.classes.length) parts.push(`${projectForm.classes.length} class(es)`)
  if (selectedFiles.value.length) parts.push(`${selectedFiles.value.length} chosen file(s)`)
  const listed = parts.length ? parts.join(' and ') : 'what you have typed'
  return `Nothing has been created yet. ${listed} will go. The typed fields are kept as a draft on this browser; the file choices cannot be.`
})

const requestLeave = () => {
  if (isDirty.value && phase.value === 'form') confirmLeave.value = true
  else leaveSetup()
}

const leaveSetup = () => {
  confirmLeave.value = false
  if (organizationId.value) navigateTo(`/organizations/${organizationId.value}?section=projects`)
  else navigateTo('/homepage')
}

const openProject = () => {
  if (!createdProjectId.value) return
  // The project shell reads its section from the query, so the link lands on a
  // named panel instead of whatever was last viewed.
  navigateTo(`/projects/${createdProjectId.value}?section=${hasTasks.value ? 'tasks' : 'upload-data'}`)
}

// ── Organization ───────────────────────────────────────────────────────────
const fetchOrganizationInfo = async () => {
  if (!organizationId.value) {
    fatalError.value = 'This page was opened without an organization.'
    return
  }

  try {
    const response = await fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/organizations/${organizationId.value}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`The organization could not be loaded (${response.status}).`)
    }

    const data = await response.json()
    if (data.data && data.data.length > 0) {
      organizationName.value = data.data[0].organizations.name
      fatalError.value = null
    } else {
      throw new Error(`No organization ${organizationId.value} is open to you.`)
    }
  } catch (err) {
    fatalError.value = err instanceof Error ? err.message : 'The organization could not be loaded.'
  }
}

const retryOrganization = async () => {
  loading.value = true
  fatalError.value = null
  try {
    await fetchOrganizationInfo()
  } finally {
    loading.value = false
  }
}

// ── Upload, with real byte progress and an honest wait after it ────────────
const imageQueue = ref<File[]>([])
const videoQueue = ref<File[]>([])

const imageUpload = reactive({
  state: 'idle' as 'idle' | 'sending' | 'processing' | 'done' | 'failed',
  percent: 0,
  message: '',
  done: 0,
  tasks: 0
})

const videoUpload = reactive({
  state: 'idle' as 'idle' | 'sending' | 'processing' | 'done' | 'failed',
  percent: 0,
  message: '',
  done: 0,
  tasks: 0
})

const uploadsRunning = computed(() =>
  ['sending', 'processing'].includes(imageUpload.state) || ['sending', 'processing'].includes(videoUpload.state)
)

const hasTasks = computed(() => imageUpload.tasks > 0 || videoUpload.tasks > 0)

/** fetch cannot report upload progress, so the byte transfer runs on XHR. */
const postWithProgress = (url: string, headers: Record<string, string>, body: FormData, onProgress: (percent: number) => void) =>
  new Promise<any>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    Object.entries(headers).forEach(([key, value]) => request.setRequestHeader(key, value))

    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(request.responseText ? JSON.parse(request.responseText) : {})
        } catch {
          resolve({})
        }
      } else {
        reject(new Error(`The server refused the upload (${request.status} ${request.statusText || ''}).`.trim()))
      }
    }
    request.onerror = () => reject(new Error('The connection dropped before the upload finished.'))
    request.onabort = () => reject(new Error('The upload was stopped.'))
    request.send(body)
  })

const runImageUpload = async () => {
  if (!createdProjectId.value || !imageQueue.value.length) return

  imageUpload.state = 'sending'
  imageUpload.percent = 0
  imageUpload.message = 'Sending 0%'

  const body = new FormData()
  imageQueue.value.forEach(file => body.append('files', file))

  try {
    const result = await postWithProgress(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/bucket/uploadData`,
      {
        'Authorization': `Bearer ${token.value}`,
        'projectId': String(createdProjectId.value)
      },
      body,
      percent => {
        imageUpload.percent = percent
        imageUpload.message = percent < 100
          ? `Sending ${percent}%`
          : 'Sent. The server is unpacking the files and making one task per image — no percentage is available for this part.'
        if (percent >= 100) imageUpload.state = 'processing'
      }
    )

    imageUpload.done = imageQueue.value.length
    imageUpload.tasks = Number(result?.createdTasks) || 0
    imageUpload.state = 'done'
    imageUpload.message = `${imageUpload.done} file(s) uploaded · ${imageUpload.tasks.toLocaleString()} task(s) created.`
    imageQueue.value = []
  } catch (err) {
    imageUpload.state = 'failed'
    imageUpload.message = `${err instanceof Error ? err.message : 'The upload failed.'} The files are still selected here — send them again, or skip them and add them later from the project's Upload data screen.`
  }
}

const runVideoUpload = async () => {
  if (!createdProjectId.value || !videoQueue.value.length) return

  videoUpload.state = 'sending'
  videoUpload.percent = 0
  videoUpload.message = 'Sending 0%'

  const body = new FormData()
  videoQueue.value.forEach(file => body.append('files', file))

  try {
    const result = await postWithProgress(
      `${import.meta.env.NUXT_PUBLIC_API_URL}/api/bucket/uploadDataVideo`,
      {
        'Authorization': `Bearer ${token.value}`,
        'projectId': String(createdProjectId.value),
        'fps': String(videoFps.value)
      },
      body,
      percent => {
        videoUpload.percent = percent
        videoUpload.message = percent < 100
          ? `Sending ${percent}%`
          : 'Sent. The server is cutting the footage into frames — this can take several minutes and reports no percentage.'
        if (percent >= 100) videoUpload.state = 'processing'
      }
    )

    videoUpload.done = videoQueue.value.length
    videoUpload.tasks = Number(result?.createdTasks) || 0
    videoUpload.state = 'done'
    videoUpload.message = `${videoUpload.done} video(s) cut at ${videoFps.value} FPS into ${videoUpload.tasks.toLocaleString()} tasks.`
    videoQueue.value = []
  } catch (err) {
    videoUpload.state = 'failed'
    videoUpload.message = `${err instanceof Error ? err.message : 'The upload failed.'} The videos are still selected here — send them again, or skip them and upload later from the project's Upload data screen.`
  }
}

const skipImages = () => {
  imageQueue.value = []
  imageUpload.state = 'idle'
  imageUpload.message = ''
  imageUpload.percent = 0
}

const skipVideos = () => {
  videoQueue.value = []
  videoUpload.state = 'idle'
  videoUpload.message = ''
  videoUpload.percent = 0
}

// ── Create ─────────────────────────────────────────────────────────────────
const createProject = async () => {
  showErrors.value = true
  touched.name = true
  submitError.value = null

  if (!organizationId.value) {
    submitError.value = 'This page has no organization to create the project in. Open it from an organization.'
    return
  }
  if (nameError.value) {
    submitError.value = nameError.value
    return
  }
  if (descriptionError.value) {
    submitError.value = descriptionError.value
    return
  }
  if (selectedVideos.value.length && (!videoFps.value || videoFps.value < 1)) {
    submitError.value = 'Set a frame rate of at least 1 before uploading video.'
    return
  }

  creating.value = true

  try {
    const response = await fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationId: Number.parseInt(organizationId.value),
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        projectType: projectForm.projectType,
        labelConfig: { classes: projectForm.classes }
      })
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`The server did not create the project (${response.status}). ${detail.slice(0, 200)}`.trim())
    }

    const result = await response.json()
    const projectId = result.data?.id

    if (!projectId) {
      throw new Error('The server accepted the project but returned no id, so no data could be attached to it. Check the projects list before trying again.')
    }

    createdProjectId.value = projectId
    clearDraft()

    imageQueue.value = [...selectedNonVideos.value]
    videoQueue.value = [...selectedVideos.value]
    phase.value = 'created'

    if (imageQueue.value.length) await runImageUpload()
    if (videoQueue.value.length) await runVideoUpload()
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'The project could not be created.'
  } finally {
    creating.value = false
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/login')
    return
  }

  if (!organizationId.value) {
    fatalError.value = 'This page was opened without an organization.'
    loading.value = false
    return
  }

  readDraft()

  try {
    await fetchOrganizationInfo()
  } finally {
    loading.value = false
  }
})

onMounted(() => {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (uploadsRunning.value || (phase.value === 'form' && isDirty.value)) {
      event.preventDefault()
      event.returnValue = ''
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload))
})

useSeoMeta({
  title: 'Set up a project',
  description: 'Name a project, define its classes and add the first data.'
})
</script>
