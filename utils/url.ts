/**
 * Utility functions for handling URLs
 */

/**
 * Converts a relative API URL to a full URL by prepending the API base URL
 * @param relativeUrl - The relative URL from the API (e.g., "/api/bucket/taskData/27/file.png")
 * @returns Full URL with API base URL prepended
 */
export const getFullApiUrl = (relativeUrl: string): string => {
  if (!relativeUrl) return ''
  
  // If it's already a full URL, return as is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }
  
  // If it's a data URL, return as is
  if (relativeUrl.startsWith('data:')) {
    return relativeUrl
  }
  
  // Get the API base URL from runtime config
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl
  
  // Ensure the relative URL starts with a slash
  const normalizedUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
  
  const full = `${apiUrl}${normalizedUrl}`

  // Files served out of the bucket are behind an identity check now, and an
  // `<img src>` carries no Authorization header and no cross-origin cookie. The
  // ticket is the only proof of identity a browser will actually send for one,
  // so it rides in the query string. Everything else - JSON endpoints called
  // through fetch - keeps using the header and is left alone here.
  if (!normalizedUrl.startsWith('/api/bucket/')) return full

  const ticket = currentAccessTicket()
  if (!ticket) return full
  return `${full}${full.includes('?') ? '&' : '?'}t=${encodeURIComponent(ticket)}`
}