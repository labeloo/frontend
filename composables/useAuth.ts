import { useCookie, navigateTo } from '#app'

interface LoginCredentials {
  email: string
  password: string
}

export const useAuth = () => {
  const token = useCookie('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax', // Changed from 'strict' to allow cross-origin navigation
    // Must reflect the page's actual scheme, not the build mode: a production
    // build served over plain HTTP (a LAN box, a Docker demo) silently drops a
    // Secure cookie, and the login appears to succeed while never persisting.
    secure: import.meta.client ? window.location.protocol === 'https:' : false
  })

  // Whether the signed-in user operates the whole deployment (the platform admin
  // panel). Stored so the nav can decide without decoding the JWT or a round trip.
  const isPlatformAdmin = useCookie<boolean>('is_platform_admin', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: import.meta.client ? window.location.protocol === 'https:' : false,
  })

  const isAuthenticated = computed(() => !!token.value)

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false }
      }

      token.value = data.token
      isPlatformAdmin.value = Boolean(data.isPlatformAdmin)
      // Before navigating: the first screen after login is a grid of task
      // thumbnails, and those URLs are built during its setup.
      await useAccessTicket().ensure()
      navigateTo('/homepage')
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  }

  const logout = () => {
    token.value = null
    isPlatformAdmin.value = false
    useAccessTicket().clear()
    navigateTo('/')
  }

  return {
    login,
    logout,
    isAuthenticated,
    isPlatformAdmin,
  }
}
