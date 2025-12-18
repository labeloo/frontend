export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run on client side
  if (process.client) {
    try {
      // Simple import and registration
      const VueKonva = await import('vue-konva')
      
      console.log('VueKonva imported:', VueKonva)
      console.log('VueKonva.default:', VueKonva.default)
      
      // Try to use the default export first
      const plugin = VueKonva.default || VueKonva
      
      // Register the plugin
      if (plugin && typeof plugin === 'object' && 'install' in plugin) {
        nuxtApp.vueApp.use(plugin as any)
        console.log('Vue Konva registered successfully with default export')
      } else if (typeof plugin === 'function') {
        nuxtApp.vueApp.use(plugin as any)
        console.log('Vue Konva registered successfully as function')
      } else {
        console.error('Unable to register Vue Konva - unknown plugin format')
      }
      
    } catch (error) {
      console.error('Vue Konva failed to load:', error)
    }
  }
})
