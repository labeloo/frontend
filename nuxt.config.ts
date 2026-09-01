// https://nuxt.com/docs/api/configuration/nuxt-config
import { searchForWorkspaceRoot } from 'vite'

export default defineNuxtConfig({
  /**
   * The annotation screens render client-side only.
   *
   * They sit behind auth, so there is no SEO to win, and their first paint is a
   * spinner either way - every pixel that matters comes from a canvas, a
   * ResizeObserver and an image that has not loaded yet on the server. What SSR
   * did contribute was "Hydration completed but contains mismatches" on exactly
   * the two screens people work in all day. Rendering them once, on the client,
   * where their state actually lives, removes that whole class of bug.
   */
  routeRules: {
    '/annotate/**': { ssr: false }
  },

	compatibilityDate: "2024-11-01",
	modules: ["@nuxt/ui", "@nuxt/fonts", "motion-v/nuxt"],
	css: ["~/assets/css/main.css"],
	devtools: { enabled: true },
	runtimeConfig: {
		public: {
			apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8787',
			// The SAM 2 service address is no longer a frontend concern: the browser
			// talks to the broker at `${apiUrl}/api/assist/sam2`, which resolves the
			// real service and its key on the server.
			// Where setup requests go. Empty by default on purpose: no real address
			// exists yet, and the landing page must not print an invented one. Until
			// this is set, the page's primary action is Sign in.
			contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL || ''
		}
	},
	// Archivo carries reading and display; Sometype Mono carries the registration
	// furniture - figures, coordinates, frame counts. Weights are declared so the
	// docket's 500 and a heading's 600 are real cuts, not synthesised.
	fonts: {
		families: [
			{ name: 'Archivo', provider: 'google', weights: [400, 500, 600, 700] },
			{ name: 'Sometype Mono', provider: 'google', weights: [400, 500] }
		]
	},
	// One ground, deliberately. The calibrated stock is the correct surround for
	// judging photographs; a dark alternative would undo that decision, so there
	// is no theme toggle to get wrong.
	// Vue strips template comments in a production build. The direction contract
	// in app.vue has to survive it, or the decision this build was made under is
	// unauditable from the shipped artifact.
	vue: { compilerOptions: { comments: true } },

	colorMode: { preference: 'light', fallback: 'light' },
	ui: {
		theme: {
			colors: ['primary', 'secondary', 'info', 'success', 'warning', 'error']
		}
	},
	vite: {
		server: {
			fs: {
				allow: [
					searchForWorkspaceRoot(process.cwd()),
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
		// Cloudflare Workers when NITRO_PRESET says so, plain node otherwise, so the
		// Docker image and the Worker build from exactly the same source.
		preset: process.env.NITRO_PRESET || 'node-server',
		experimental: {
			wasm: true
		}
	}
});
