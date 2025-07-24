<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center space-x-4 mb-4">
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            @click="goBack"
            class="flex-shrink-0"
          >
            Back
          </UButton>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Create New Project</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              Create a new project for {{ organizationName || 'your organization' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col justify-center items-center py-12 space-y-3">
        <USpinner size="lg" />
        <p class="text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
        class="mb-6"
      />

      <!-- Main Content -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Form Section -->
      <div class="lg:col-span-2">
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Project Details</h2>
          </template>          <UForm 
            :state="projectForm" 
            @submit="createProject"
            class="space-y-8"
          >
            <!-- Project Name -->
            <div class="space-y-2">
              <UFormGroup label="Project Name" name="name" required>
                <UInput
                  v-model="projectForm.name"
                  placeholder="Enter a descriptive name for your project"
                  size="lg"
                  icon="i-heroicons-folder"
                  :disabled="creating"
                  class="w-full"
                />
              </UFormGroup>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Choose a clear, descriptive name that helps identify your project
              </p>
            </div>

            <!-- Project Description -->
            <div class="space-y-2">
              <UFormGroup label="Description" name="description">
                <UTextarea
                  v-model="projectForm.description"
                  placeholder="Provide a detailed description of your project goals, scope, and objectives..."
                  :rows="5"
                  size="lg"
                  :disabled="creating"
                  class="w-full"
                />
              </UFormGroup>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Describe what this project aims to achieve and its main objectives
              </p>
            </div>

            <!-- Project Type -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Project Type <span class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Classification Widget -->
                  <div 
                    @click="selectProjectType(1)"
                    :class="[
                      'relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md',
                      projectForm.projectType === 1 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    ]"
                  >
                    <div class="flex items-start space-x-3">
                      <div :class="[
                        'w-12 h-12 rounded-lg flex items-center justify-center',
                        projectForm.projectType === 1 
                          ? 'bg-primary text-white' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      ]">
                        <UIcon name="i-heroicons-squares-2x2" class="w-6 h-6" />
                      </div>
                      <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
                          Classification
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          Categorize and classify data into predefined categories or labels
                        </p>
                      </div>
                    </div>
                    <!-- Selection indicator -->
                    <div v-if="projectForm.projectType === 1" 
                         class="absolute top-3 right-3">
                      <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <UIcon name="i-heroicons-check" class="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  <!-- Object Detection Widget -->
                  <div 
                    @click="selectProjectType(2)"
                    :class="[
                      'relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md',
                      projectForm.projectType === 2 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    ]"
                  >
                    <div class="flex items-start space-x-3">
                      <div :class="[
                        'w-12 h-12 rounded-lg flex items-center justify-center',
                        projectForm.projectType === 2 
                          ? 'bg-primary text-white' 
                          : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      ]">
                        <UIcon name="i-heroicons-viewfinder-circle" class="w-6 h-6" />
                      </div>
                      <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
                          Object Detection
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          Identify and locate objects within images or video content
                        </p>
                      </div>
                    </div>
                    <!-- Selection indicator -->
                    <div v-if="projectForm.projectType === 2" 
                         class="absolute top-3 right-3">
                      <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <UIcon name="i-heroicons-check" class="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  <!-- Data Analysis Widget -->
                  <div 
                    @click="selectProjectType(3)"
                    :class="[
                      'relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md md:col-span-2',
                      projectForm.projectType === 3 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    ]"
                  >
                    <div class="flex items-start space-x-3">
                      <div :class="[
                        'w-12 h-12 rounded-lg flex items-center justify-center',
                        projectForm.projectType === 3 
                          ? 'bg-primary text-white' 
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      ]">
                        <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" />
                      </div>
                      <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
                          Data Analysis
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          Analyze and extract insights from structured or unstructured data sets
                        </p>
                      </div>
                    </div>
                    <!-- Selection indicator -->
                    <div v-if="projectForm.projectType === 3" 
                         class="absolute top-3 right-3">
                      <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <UIcon name="i-heroicons-check" class="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>              <p class="text-sm text-gray-500 dark:text-gray-400">
                Select the type that best matches your project's main objective
              </p>
            </div>

            <!-- Create Classes -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Class Labels
                </label>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Add class labels that will be used for annotation. You can add more classes later.
                </p>
                  <!-- Add Class Input -->
                <div class="flex space-x-2 mb-4">                  <UInput
                    v-model="newClassName"
                    placeholder="Enter class name(s) - separate multiple with commas (e.g., 'cat, dog, person')"
                    size="lg"
                    :disabled="creating || isAddingClass"
                    class="flex-1"
                    @keydown.enter="handleAddClassKeydown"
                  />
                  <UButton
                    @click="addClass"
                    :disabled="!newClassName.trim() || creating || isAddingClass"
                    icon="i-heroicons-plus"
                    size="lg"
                    color="primary"
                  >
                    Add
                  </UButton>
                </div>

                <!-- Classes List -->
                <div v-if="projectForm.classes.length > 0" class="space-y-2">
                  <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Added Classes ({{ projectForm.classes.length }})
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    <div
                      v-for="(className, index) in projectForm.classes"
                      :key="index"
                      class="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20"
                    >
                      <span class="text-sm font-medium">{{ className }}</span>
                      <UButton
                        @click="removeClass(index)"
                        icon="i-heroicons-x-mark"
                        size="xs"
                        color="primary"
                        variant="ghost"
                        :disabled="creating"
                      />
                    </div>
                  </div>
                </div>                <!-- Empty State -->
                <div v-else class="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  <UIcon name="i-heroicons-tag" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    No classes added yet. Add your first class above.
                  </p>
                </div>
              </div>
            </div>

            <!-- File Upload Section -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Upload Images
                </label>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Upload images for labeling. Supported formats: JPG, PNG, GIF, WebP. You can also upload ZIP files containing images.
                </p>                <!-- File Drop Zone -->
                <div
                  @drop="handleDrop"
                  @dragover.prevent
                  @dragenter.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                  :class="{ 'border-primary bg-primary/5': isDragging }"
                >
                  <input
                    ref="fileInput"
                    type="file"
                    multiple
                    accept="image/*,.zip"
                    @change="handleFileSelect"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    :disabled="creating || isUploading"
                  />
                  
                  <div class="space-y-3">
                    <div class="flex justify-center">
                      <UIcon name="i-heroicons-cloud-arrow-up" class="w-12 h-12 text-gray-400" />
                    </div>
                    <div>
                      <p class="text-lg font-medium text-gray-900 dark:text-white">
                        Drop files here or click to browse
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Images (JPG, PNG, GIF, WebP) or ZIP files up to 50MB each
                      </p>
                    </div>
                    <UButton
                      type="button"
                      color="primary"
                      variant="outline"
                      icon="i-heroicons-folder-open"
                      :disabled="creating || isUploading"
                    >
                      Choose Files
                    </UButton>
                  </div>
                </div>

                <!-- Upload Progress -->
                <div v-if="isUploading" class="mt-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading files...</span>
                    <span class="text-sm text-gray-500">{{ uploadProgress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-primary h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${uploadProgress}%` }"
                    ></div>
                  </div>
                </div>

                <!-- Uploaded Files List -->
                <div v-if="uploadedFiles.length > 0" class="mt-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uploaded Files ({{ uploadedFiles.length }})
                    </h4>                    <UButton
                      @click="clearAllFiles"
                      variant="ghost"
                      color="error"
                      size="xs"
                      icon="i-heroicons-trash"
                      :disabled="creating || isUploading"
                    >
                      Clear All
                    </UButton>
                  </div>
                  
                  <div class="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div
                      v-for="(file, index) in uploadedFiles"
                      :key="index"
                      class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0">
                          <UIcon 
                            :name="getFileIcon(file)" 
                            class="w-5 h-5 text-gray-500" 
                          />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ file.name }}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ formatFileSize(file.size) }}
                          </p>
                        </div>
                      </div>                      <UButton
                        @click="removeFile(index)"
                        variant="ghost"
                        color="error"
                        size="xs"
                        icon="i-heroicons-x-mark"
                        :disabled="creating || isUploading"
                      />
                    </div>
                  </div>
                </div>

                <!-- Empty State for Files -->
                <div v-else class="mt-4 text-center py-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <UIcon name="i-heroicons-photo" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    No files uploaded yet. Add images to start labeling.
                  </p>
                </div>
              </div>
            </div>

            <!-- Video Upload Section -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Upload Videos
                </label>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Upload videos for frame extraction and labeling. Supported formats: MP4, AVI, MOV, MKV, WebM.
                </p>

                <!-- FPS Selection -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frame Extraction Rate (FPS)
                  </label>
                  <div class="flex items-center space-x-4">
                    <UInput
                      v-model="videoSettings.fps"
                      type="number"
                      min="1"
                      max="60"
                      placeholder="Enter FPS"
                      size="sm"
                      class="w-32"
                      :disabled="creating || isUploadingVideos"
                    />
                    <div class="flex space-x-2">
                      <UButton
                        v-for="preset in fpsPresets"
                        :key="preset"
                        @click="videoSettings.fps = preset"
                        variant="outline"
                        size="xs"
                        :color="videoSettings.fps === preset ? 'primary' : 'secondary'"
                        :disabled="creating || isUploadingVideos"
                      >
                        {{ preset }} FPS
                      </UButton>
                    </div>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Higher FPS extracts more frames from videos. Recommended: 1-5 FPS for general use.
                  </p>
                </div>

                <!-- Video Drop Zone -->
                <div
                  @drop="handleVideoDrop"
                  @dragover.prevent
                  @dragenter.prevent="isVideosDragging = true"
                  @dragleave.prevent="isVideosDragging = false"
                  class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                  :class="{ 'border-primary bg-primary/5': isVideosDragging }"
                >
                  <input
                    ref="videoFileInput"
                    type="file"
                    multiple
                    accept="video/*"
                    @change="handleVideoFileSelect"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    :disabled="creating || isUploadingVideos"
                  />
                  
                  <div class="space-y-3">
                    <div class="flex justify-center">
                      <UIcon name="i-heroicons-video-camera" class="w-12 h-12 text-gray-400" />
                    </div>
                    <div>
                      <p class="text-lg font-medium text-gray-900 dark:text-white">
                        Drop video files here or click to browse
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Videos (MP4, AVI, MOV, MKV, WebM) up to 100MB each
                      </p>
                    </div>
                    <UButton
                      type="button"
                      color="primary"
                      variant="outline"
                      icon="i-heroicons-folder-open"
                      :disabled="creating || isUploadingVideos || !videoSettings.fps"
                    >
                      Choose Video Files
                    </UButton>
                  </div>
                </div>

                <!-- Video Upload Progress -->
                <div v-if="isUploadingVideos" class="mt-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Processing videos...</span>
                    <span class="text-sm text-gray-500">{{ videoUploadProgress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-primary h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${videoUploadProgress}%` }"
                    ></div>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Extracting frames at {{ videoSettings.fps }} FPS...
                  </p>
                </div>

                <!-- Uploaded Videos List -->
                <div v-if="uploadedVideos.length > 0" class="mt-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uploaded Videos ({{ uploadedVideos.length }})
                    </h4>
                    <UButton
                      @click="clearAllVideos"
                      variant="ghost"
                      color="error"
                      size="xs"
                      icon="i-heroicons-trash"
                      :disabled="creating || isUploadingVideos"
                    >
                      Clear All
                    </UButton>
                  </div>
                  
                  <div class="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div
                      v-for="(video, index) in uploadedVideos"
                      :key="index"
                      class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0">
                          <UIcon name="i-heroicons-video-camera" class="w-5 h-5 text-gray-500" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ video.name }}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ formatFileSize(video.size) }}
                          </p>
                        </div>
                      </div>
                      <UButton
                        @click="removeVideo(index)"
                        variant="ghost"
                        color="error"
                        size="xs"
                        icon="i-heroicons-x-mark"
                        :disabled="creating || isUploadingVideos"
                      />
                    </div>
                  </div>
                </div>

                <!-- Empty State for Videos -->
                <div v-else class="mt-4 text-center py-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <UIcon name="i-heroicons-video-camera" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    No videos uploaded yet. Add videos to extract frames for labeling.
                  </p>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex justify-end space-x-3 pt-6">
              <UButton
                type="button"
                color="secondary"
                variant="ghost"
                @click="goBack"
                :disabled="creating"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                color="primary"
                :loading="creating"
                icon="i-heroicons-plus"
              >
                Create Project
              </UButton>
            </div>
          </UForm>
        </UCard>
      </div>

      <!-- Preview/Info Section -->
      <div class="lg:col-span-1">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Project Preview</h3>
          </template>

          <div class="space-y-4">            <!-- Organization Info -->
            <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div class="flex items-center space-x-3">
                <div v-if="organizationLogo" class="flex-shrink-0">
                  <img 
                    :src="organizationLogo" 
                    :alt="`${organizationName} logo`"
                    class="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div v-else class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <UIcon name="i-heroicons-building-office" class="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ organizationName || 'Organization' }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">ID: {{ organizationId }}</p>
                </div>
              </div>
            </div>

            <!-- Project Preview -->
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <p class="text-gray-900 dark:text-white">{{ projectForm.name || 'Project name will appear here' }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p class="text-gray-900 dark:text-white text-sm">
                  {{ projectForm.description || 'Project description will appear here' }}
                </p>
              </div>
                <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <div class="flex items-center space-x-2 mt-1">
                  <div v-if="selectedProjectType" :class="[
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    projectForm.projectType === 1 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    projectForm.projectType === 2 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  ]">
                    <UIcon :name="getProjectTypeIcon(projectForm.projectType)" class="w-4 h-4" />
                  </div>
                  <div>
                    <p class="text-gray-900 dark:text-white font-medium">
                      {{ selectedProjectType?.label || 'Select a project type' }}
                    </p>
                    <p v-if="selectedProjectType" class="text-xs text-gray-500 dark:text-gray-400">
                      {{ selectedProjectType.description }}
                    </p>                  </div>
                </div>
              </div>
                <!-- Classes Preview -->
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Classes</label>
                <div v-if="projectForm.classes.length > 0" class="mt-1">
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {{ projectForm.classes.length }} class{{ projectForm.classes.length !== 1 ? 'es' : '' }} added
                  </p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="className in projectForm.classes.slice(0, 5)"
                      :key="className"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      {{ className }}
                    </span>
                    <span
                      v-if="projectForm.classes.length > 5"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      +{{ projectForm.classes.length - 5 }} more
                    </span>
                  </div>
                </div>
                <p v-else class="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  No classes added yet
                </p>
              </div>

              <!-- Files Preview -->
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Files</label>
                <div v-if="uploadedFiles.length > 0 || uploadedVideos.length > 0" class="mt-1 space-y-3">
                  <!-- Images -->
                  <div v-if="uploadedFiles.length > 0">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {{ uploadedFiles.length }} image{{ uploadedFiles.length !== 1 ? 's' : '' }} uploaded
                    </p>
                    <div class="space-y-1">
                      <div
                        v-for="file in uploadedFiles.slice(0, 3)"
                        :key="file.name"
                        class="flex items-center space-x-2 text-xs"
                      >
                        <UIcon 
                          :name="getFileIcon(file)" 
                          class="w-3 h-3 text-gray-500 flex-shrink-0" 
                        />
                        <span class="text-gray-900 dark:text-white truncate">
                          {{ file.name }}
                        </span>
                      </div>
                      <div
                        v-if="uploadedFiles.length > 3"
                        class="text-xs text-gray-500 dark:text-gray-400 pl-5"
                      >
                        +{{ uploadedFiles.length - 3 }} more files
                      </div>
                    </div>
                  </div>

                  <!-- Videos -->
                  <div v-if="uploadedVideos.length > 0">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {{ uploadedVideos.length }} video{{ uploadedVideos.length !== 1 ? 's' : '' }} uploaded
                      <span v-if="videoSettings.fps" class="text-primary">({{ videoSettings.fps }} FPS)</span>
                    </p>
                    <div class="space-y-1">
                      <div
                        v-for="video in uploadedVideos.slice(0, 3)"
                        :key="video.name"
                        class="flex items-center space-x-2 text-xs"
                      >
                        <UIcon 
                          name="i-heroicons-video-camera" 
                          class="w-3 h-3 text-gray-500 flex-shrink-0" 
                        />
                        <span class="text-gray-900 dark:text-white truncate">
                          {{ video.name }}
                        </span>
                      </div>
                      <div
                        v-if="uploadedVideos.length > 3"
                        class="text-xs text-gray-500 dark:text-gray-400 pl-5"
                      >
                        +{{ uploadedVideos.length - 3 }} more videos
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  No files uploaded yet
                </p>
              </div>
            </div>

            <!-- Tips -->
            <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div class="flex items-start space-x-2">
                <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Tips</h4>                  <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Choose a descriptive name for your project</li>
                    <li>• Add a clear description to help team members understand the project goals</li>
                    <li>• Select the appropriate project type for better organization</li>
                    <li>• Add class labels that represent the categories you want to identify</li>
                    <li>• Upload images or ZIP files to start with initial data</li>
                    <li>• Upload videos to extract frames for annotation (requires FFmpeg)</li>
                    <li>• Set appropriate FPS for video frame extraction (1-5 FPS recommended)</li>
                    <li>• You can always add more classes and files later in the project settings</li>
                  </ul>
                </div>
              </div>            </div>
          </div>
        </UCard>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Define page meta
definePageMeta({
  layout: 'homepage'
})

// Route and query parameters
const route = useRoute()
const router = useRouter()
const organizationId = computed(() => route.query.organizationId as string)

// Auth
const { isAuthenticated } = useAuth()
const token = useCookie('auth_token')
const toast = useToast()

// Reactive state
const loading = ref(true)
const creating = ref(false)
const error = ref<string | null>(null)
const organizationName = ref<string>('')
const organizationLogo = ref<string>('')

// Form state
const projectForm = reactive({
  name: '',
  description: '',
  projectType: 1,
  classes: [] as string[]
})

// Classes management state
const newClassName = ref('')
const isAddingClass = ref(false)

// File upload state
const uploadedFiles = ref<File[]>([])
const isUploading = ref(false)
const uploadProgress = ref(0)

// Video upload state
const uploadedVideos = ref<File[]>([])
const isUploadingVideos = ref(false)
const videoUploadProgress = ref(0)

// Video settings
const videoSettings = reactive({
  fps: 5 // Default FPS
})

// Project type options
const projectTypes = [
  { label: 'Classification', value: 1, description: 'Categorize and classify data into predefined categories or labels' },
  { label: 'Object Detection', value: 2, description: 'Identify and locate objects within images or video content' },
  { label: 'Data Analysis', value: 3, description: 'Analyze and extract insights from structured or unstructured data sets' }
]

// FPS presets
const fpsPresets = [1, 5, 10, 15, 30, 60]

// Computed
const selectedProjectType = computed(() => {
  return projectTypes.find(type => type.value === projectForm.projectType)
})

const isDragging = ref(false)
const isVideosDragging = ref(false)

// Refs
const fileInput = ref<HTMLInputElement>()
const videoFileInput = ref<HTMLInputElement>()

// Methods
const selectProjectType = (type: number) => {
  if (!creating.value) {
    projectForm.projectType = type
  }
}

const getProjectTypeIcon = (type: number) => {
  switch (type) {
    case 1: return 'i-heroicons-squares-2x2'
    case 2: return 'i-heroicons-viewfinder-circle'
    case 3: return 'i-heroicons-chart-bar'
    default: return 'i-heroicons-folder'
  }
}

const addClass = () => {
  const input = newClassName.value.trim()
  
  console.log('addClass called with input:', input)
  console.log('Current classes before adding:', projectForm.classes)
  
  if (!input) {
    console.log('Input is empty, returning')
    return
  }
  
  // Split by comma and clean up each class name
  const classNames = input
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0)
  
  console.log('Processed class names:', classNames)
  
  if (classNames.length === 0) {
    console.log('No valid class names, returning')
    return
  }
  
  const addedClasses: string[] = []
  const duplicateClasses: string[] = []
  
  // Process each class name
  classNames.forEach(className => {
    if (projectForm.classes.includes(className)) {
      duplicateClasses.push(className)
    } else {
      projectForm.classes.push(className)
      addedClasses.push(className)
    }
  })
  
  console.log('Classes after adding:', projectForm.classes)
  console.log('Added classes:', addedClasses)
  console.log('Duplicate classes:', duplicateClasses)
  
  // Clear the input
  newClassName.value = ''
  
  // Show success message for added classes
  if (addedClasses.length > 0) {
    if (addedClasses.length === 1) {
      toast.add({
        title: 'Class Added',
        description: `Class "${addedClasses[0]}" has been added`,
        color: 'success'
      })
    } else {
      toast.add({
        title: 'Classes Added',
        description: `${addedClasses.length} classes have been added: ${addedClasses.join(', ')}`,
        color: 'success'
      })
    }
  }
  
  // Show warning for duplicates
  if (duplicateClasses.length > 0) {
    if (duplicateClasses.length === 1) {
      toast.add({
        title: 'Duplicate Class',
        description: `Class "${duplicateClasses[0]}" already exists`,
        color: 'warning'
      })
    } else {
      toast.add({
        title: 'Duplicate Classes',
        description: `${duplicateClasses.length} classes already exist: ${duplicateClasses.join(', ')}`,
        color: 'warning'
      })
    }
  }
}

const handleAddClassKeydown = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
  addClass()
}

const removeClass = (index: number) => {
  const className = projectForm.classes[index]
  projectForm.classes.splice(index, 1)
  
  toast.add({
    title: 'Class Removed',
    description: `Class "${className}" has been removed`,
    color: 'info'
  })
}

// File handling methods
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

const handleFiles = (files: File[]) => {
  const validFiles: File[] = []
  const invalidFiles: string[] = []
  
  files.forEach(file => {
    // Check file type
    const isImage = file.type.startsWith('image/')
    const isZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    
    if (!isImage && !isZip) {
      invalidFiles.push(`${file.name} - Invalid file type`)
    } else if (file.size > maxSize) {
      invalidFiles.push(`${file.name} - File too large (max 50MB)`)
    } else if (uploadedFiles.value.some(f => f.name === file.name && f.size === file.size)) {
      invalidFiles.push(`${file.name} - File already uploaded`)
    } else {
      validFiles.push(file)
    }
  })
  
  // Add valid files
  if (validFiles.length > 0) {
    uploadedFiles.value.push(...validFiles)
    
    toast.add({
      title: 'Files Added',
      description: `${validFiles.length} file(s) added successfully`,
      color: 'success'
    })
  }
  
  // Show warnings for invalid files
  if (invalidFiles.length > 0) {
    toast.add({
      title: 'Some Files Skipped',
      description: invalidFiles.join(', '),
      color: 'warning'
    })
  }
  
  // Clear the input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeFile = (index: number) => {
  const fileName = uploadedFiles.value[index].name
  uploadedFiles.value.splice(index, 1)
  
  toast.add({
    title: 'File Removed',
    description: `${fileName} has been removed`,
    color: 'info'
  })
}

const clearAllFiles = () => {
  uploadedFiles.value = []
  
  toast.add({
    title: 'All Files Cleared',
    description: 'All uploaded files have been removed',
    color: 'info'
  })
}

// Video file handling methods
const handleVideoDrop = (event: DragEvent) => {
  event.preventDefault()
  isVideosDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files) {
    handleVideoFiles(Array.from(files))
  }
}

const handleVideoFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files) {
    handleVideoFiles(Array.from(files))
  }
}

const handleVideoFiles = (files: File[]) => {
  const validFiles: File[] = []
  const invalidFiles: string[] = []
  
  files.forEach(file => {
    // Check file type
    const isVideo = file.type.startsWith('video/')
    
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB in bytes
    
    if (!isVideo) {
      invalidFiles.push(`${file.name} - Invalid file type`)
    } else if (file.size > maxSize) {
      invalidFiles.push(`${file.name} - File too large (max 100MB)`)
    } else if (uploadedVideos.value.some(v => v.name === file.name && v.size === file.size)) {
      invalidFiles.push(`${file.name} - File already uploaded`)
    } else {
      validFiles.push(file)
    }
  })
  
  // Add valid files
  if (validFiles.length > 0) {
    uploadedVideos.value.push(...validFiles)
    
    toast.add({
      title: 'Videos Added',
      description: `${validFiles.length} video(s) added successfully`,
      color: 'success'
    })
  }
  
  // Show warnings for invalid files
  if (invalidFiles.length > 0) {
    toast.add({
      title: 'Some Videos Skipped',
      description: invalidFiles.join(', '),
      color: 'warning'
    })
  }
  
  // Clear the input
  if (videoFileInput.value) {
    videoFileInput.value.value = ''
  }
}

const removeVideo = (index: number) => {
  const videoName = uploadedVideos.value[index].name
  uploadedVideos.value.splice(index, 1)
  
  toast.add({
    title: 'Video Removed',
    description: `${videoName} has been removed`,
    color: 'info'
  })
}

const clearAllVideos = () => {
  uploadedVideos.value = []
  
  toast.add({
    title: 'All Videos Cleared',
    description: 'All uploaded videos have been removed',
    color: 'info'
  })
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) {
    return 'i-heroicons-photo'
  } else if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
    return 'i-heroicons-archive-box'
  }
  return 'i-heroicons-document'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const fetchOrganizationInfo = async () => {
  if (!organizationId.value) {
    error.value = 'Organization ID is required'
    return
  }

  try {
    const response = await fetch(`http://localhost:8787/api/organizations/${organizationId.value}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch organization: ${response.statusText}`)
    }

    const data = await response.json()
      if (data.data && data.data.length > 0) {
      organizationName.value = data.data[0].organizations.name
      organizationLogo.value = data.data[0].organizations.logo || ''
    } else {
      throw new Error('Organization not found')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load organization'
    console.error('Error fetching organization:', err)
  }
}

const createProject = async () => {
  if (!organizationId.value) {
    error.value = 'Organization ID is required'
    return
  }

  // Simple validation
  if (!projectForm.name.trim()) {
    error.value = 'Project name is required'
    return
  }

  if (projectForm.name.length > 100) {
    error.value = 'Project name must be less than 100 characters'
    return
  }

  if (projectForm.description && projectForm.description.length > 500) {
    error.value = 'Description must be less than 500 characters'
    return
  }

  // Validate video uploads have FPS set
  if (uploadedVideos.value.length > 0 && (!videoSettings.fps || videoSettings.fps <= 0)) {
    error.value = 'Please set a valid FPS value for video processing'
    return
  }

  creating.value = true
  error.value = null
    try {    // Step 1: Create the project
    const projectData = {
      organizationId: Number.parseInt(organizationId.value),
      name: projectForm.name,
      description: projectForm.description,
      projectType: projectForm.projectType,
      labelConfig: {
        classes: projectForm.classes
      },
      // Also try sending classes directly in case API expects it differently
      classes: projectForm.classes
    }

    // Debug logging
    console.log('Project data being sent:', projectData)
    console.log('Classes array:', projectForm.classes)
    console.log('Classes length:', projectForm.classes.length)

    const projectResponse = await fetch('http://localhost:8787/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    })

    if (!projectResponse.ok) {
      const errorData = await projectResponse.text()
      throw new Error(`Failed to create project: ${projectResponse.statusText} - ${errorData}`)
    }    const projectResult = await projectResponse.json()
    
    // Extract project ID from response
    const projectId = projectResult.data?.id

    if (!projectId) {
      throw new Error('Project created but no project ID returned')
    }

    // Step 2: Upload files if any exist
    if (uploadedFiles.value.length > 0) {
      isUploading.value = true
      uploadProgress.value = 0

      try {
        // Create FormData for file upload
        const formData = new FormData()
        uploadedFiles.value.forEach(file => {
          formData.append('files', file)
        })

        const uploadResponse = await fetch('http://localhost:8787/api/bucket/uploadData', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.value}`,
            'projectId': projectId.toString()
          },
          body: formData
        })

        if (!uploadResponse.ok) {
          const uploadErrorData = await uploadResponse.text()
          console.warn(`File upload failed: ${uploadResponse.statusText} - ${uploadErrorData}`)
          
          toast.add({
            title: 'Project Created with Warning',
            description: `Project "${projectForm.name}" was created successfully, but file upload failed. You can upload files later.`,
            color: 'warning'
          })
        } else {
          toast.add({
            title: 'Project Created Successfully',
            description: `Project "${projectForm.name}" and ${uploadedFiles.value.length} file(s) uploaded successfully`,
            color: 'success'
          })
        }
      } catch (uploadErr) {
        console.warn('File upload error:', uploadErr)
        toast.add({
          title: 'Project Created with Warning',
          description: `Project "${projectForm.name}" was created successfully, but file upload failed. You can upload files later.`,
          color: 'warning'
        })
      } finally {
        isUploading.value = false
        uploadProgress.value = 0
      }
    }

    // Step 3: Upload videos if any exist
    if (uploadedVideos.value.length > 0) {
      isUploadingVideos.value = true
      videoUploadProgress.value = 0

      try {
        // Create FormData for video upload
        const videoFormData = new FormData()
        uploadedVideos.value.forEach(video => {
          videoFormData.append('files', video)
        })

        const videoUploadResponse = await fetch('http://localhost:8787/api/bucket/uploadDataVideo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.value}`,
            'projectId': projectId.toString(),
            'fps': videoSettings.fps.toString()
          },
          body: videoFormData
        })

        if (!videoUploadResponse.ok) {
          const videoUploadErrorData = await videoUploadResponse.text()
          console.warn(`Video upload failed: ${videoUploadResponse.statusText} - ${videoUploadErrorData}`)
          
          toast.add({
            title: 'Video Upload Failed',
            description: `Video upload failed. You can upload videos later from the project page.`,
            color: 'warning'
          })
        } else {
          const videoResult = await videoUploadResponse.json()
          toast.add({
            title: 'Videos Processed Successfully',
            description: `${uploadedVideos.value.length} video(s) uploaded and ${videoResult.createdTasks} frames extracted at ${videoSettings.fps} FPS`,
            color: 'success'
          })
        }
      } catch (videoUploadErr) {
        console.warn('Video upload error:', videoUploadErr)
        toast.add({
          title: 'Video Upload Failed',
          description: `Video upload failed. You can upload videos later from the project page.`,
          color: 'warning'
        })
      } finally {
        isUploadingVideos.value = false
        videoUploadProgress.value = 0
      }
    }

    // Show final success message if no uploads or all successful
    if (uploadedFiles.value.length === 0 && uploadedVideos.value.length === 0) {
      toast.add({
        title: 'Project Created',
        description: `Project "${projectForm.name}" has been created successfully`,
        color: 'success'
      })
    }

    // Navigate back to organization page
    await navigateTo(`/organizations/${organizationId.value}?section=projects`)
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create project'
    console.error('Error creating project:', err)
  } finally {
    creating.value = false
    isUploading.value = false
    uploadProgress.value = 0
    isUploadingVideos.value = false
    videoUploadProgress.value = 0
  }
}

const goBack = () => {
  if (organizationId.value) {
    navigateTo(`/organizations/${organizationId.value}?section=projects`)
  } else {
    navigateTo('/homepage')
  }
}

// Lifecycle
onMounted(async () => {
  // Check authentication
  if (!isAuthenticated.value) {
    await navigateTo('/login')
    return
  }

  // Check if organization ID is provided
  if (!organizationId.value) {
    error.value = 'Organization ID is required. Please access this page from an organization.'
    loading.value = false
    return
  }

  try {
    await fetchOrganizationInfo()
  } finally {
    loading.value = false
  }
})

// SEO
useSeoMeta({
  title: 'Create New Project',
  description: 'Create a new project for your organization'
})
</script>
