export const useApi = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl
  const token = useCookie('auth_token')

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token.value ? { 'Authorization': `Bearer ${token.value}` } : {}),
      ...options.headers,
    }

    return fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })
  }

  return {
    fetch: apiFetch,
    url: apiUrl
  }
}
