export const useApi = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl
  const token = useCookie('auth_token')

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: any = {
      ...(token.value ? { 'Authorization': `Bearer ${token.value}` } : {}),
      ...options.headers,
    }

    // Only set Content-Type to application/json if it's not FormData
    // When using FormData, the browser sets the Content-Type with the boundary automatically
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
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
