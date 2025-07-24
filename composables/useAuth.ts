import { useCookie, navigateTo } from '#app'

interface LoginCredentials {
  email: string
  password: string
}

export const useAuth = () => {
  const token = useCookie('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'strict',
    secure: true
  })

  const isAuthenticated = computed(() => !!token.value)

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await fetch('http://localhost:8787/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false }
      }

      token.value = data.token
      navigateTo('/homepage')
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  }

  const logout = () => {
    token.value = null
    navigateTo('/')
  }

  return {
    login,
    logout,
    isAuthenticated,
  }
}
