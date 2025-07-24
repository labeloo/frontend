<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <LayoutcomponentsOrganizationNavbar @section-change="handleSectionChange" />
    
    <!-- Main content with left margin to account for sidebar -->
    <div class="ml-64">
      <main class="min-h-screen">
        <slot />
      </main>
      <LayoutcomponentsFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
// Use a global reactive state for section management
const currentSection = useState('currentSection', () => 'overview')

const handleSectionChange = (section: string) => {
  currentSection.value = section
}

onMounted(() => {
  // Layout mounted
})
</script>