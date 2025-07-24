<template>
  <div class="relative w-full h-[50vh]">
    <img src="@/assets/images/animated-bg.svg" alt="Animated background" class="absolute w-full h-full object-cover z-0" />
    
    <div class="relative z-10 flex flex-col items-center justify-center h-full text-center">
      <motion.h1
        class="text-white text-7xl font-bold font-mono"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6 }"
      >
        Labeloo
      </motion.h1>

      <motion.p
        class="italic text-white mt-4 text-xl opacity-80"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.4 }"
      >
        Label faster. Smarter.
      </motion.p>
    </div>
  </div>
</template>

<script setup>
import { motion } from 'motion-v'
</script>

