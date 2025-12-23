// https://nuxt.com/docs/api/configuration/nuxt-config
import { searchForWorkspaceRoot } from 'vite'

export default defineNuxtConfig({
	compatibilityDate: "2024-11-01",
	modules: ["@nuxt/ui", "@nuxt/fonts", "motion-v/nuxt"],
	css: ["~/assets/css/main.css"],
	devtools: { enabled: true },
	runtimeConfig: {
		public: {
			apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8787'
		}
	},
	ui: {
		theme: {
			colors: [
				"primary",
				"secondary",
				"tertiary",
				"info",
				"success",
				"warning",
				"error",
			],
		},
	},
	vite: {
		server: {
			fs: {
				allow: [
					searchForWorkspaceRoot(process.cwd()),
					'C:/Users/ahmet/node_modules/', // Allow access to the directory causing issues
					'c:/Users/ahmet/Desktop/bitirme/frontend/node_modules/' // Also allow project's own node_modules
				],
			},
		},
		define: {
			global: 'globalThis',
			'import.meta.env.NUXT_PUBLIC_API_URL': JSON.stringify(process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8787')
		},
		resolve: {
			alias: {
				konva: 'konva/konva.js'
			}
		},
		optimizeDeps: {
			include: ['konva'],
			exclude: []
		},
		ssr: {
			noExternal: ['vue-konva'],
		}
	},
	build: {
		transpile: ['vue-konva']
	},
	nitro: {
		experimental: {
			wasm: true
		}
	}
});
