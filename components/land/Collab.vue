<template>
  <motion.div 
    class="p-8 ml-16 my-12"
    :initial="{ opacity: 0, y: 20 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, delay: 1.8 }"
  >
    <div class="flex">
      <div class="w-1 bg-gray-300 rounded-full mr-6"></div>
      <div>
        <h2 class="text-4xl font-extrabold mb-4">Easy Collaboration</h2>
        <p class="text-lg text-gray-300">Work with your team seamlessly, manage roles, and track labeling progress in real time.</p>
      </div>
    </div>
  </motion.div>
</template>

<script setup>
import { motion } from 'motion-v'
</script>