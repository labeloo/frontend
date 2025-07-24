// https://nuxt.com/docs/api/configuration/nuxt-config
import { searchForWorkspaceRoot } from 'vite'

export default defineNuxtConfig({
	compatibilityDate: "2024-11-01",
	modules: ["@nuxt/ui", "@nuxt/fonts", "motion-v/nuxt"],
	css: ["~/assets/css/main.css"],
	devtools: { enabled: true },
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
	},
});
