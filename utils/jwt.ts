/**
 * JWT utility functions for token handling and user extraction
 */

export interface JWTPayload {
  userId?: number
  id?: number
  sub?: string | number
  email?: string
  exp?: number
  iat?: number
  [key: string]: any
}

/**
 * Safely decode a JWT token and extract payload
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // Validate token format
    if (!token || typeof token !== 'string') return null
    
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = parts[1]
    if (!payload) return null
    
    // Add padding if needed for proper base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4)
    
    // Decode base64
    const decoded = atob(paddedPayload)
    
    // Parse JSON
    const parsed = JSON.parse(decoded) as JWTPayload
    
    return parsed
  } catch (error) {
    console.error('Error decoding JWT:', error)
    return null
  }
}

/**
 * Extract user ID from JWT token
 */
export function getUserIdFromToken(token: string | null | undefined): number | null {
  if (!token) return null
  
  const payload = decodeJWT(token)
  if (!payload) return null
  
  // Try different common user ID fields
  const userId = payload.userId || payload.id || payload.sub
  
  if (typeof userId === 'number') return userId
  if (typeof userId === 'string') {
    const parsed = parseInt(userId, 10)
    return isNaN(parsed) ? null : parsed
  }
  
  return null
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return true
  
  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp < currentTime
}

/**
 * Get user email from JWT token
 */
export function getUserEmailFromToken(token: string | null | undefined): string | null {
  if (!token) return null
  
  const payload = decodeJWT(token)
  return payload?.email || null
}

/**
 * Validate JWT token format and structure
 */
export function isValidJWT(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false
  
  const parts = token.split('.')
  if (parts.length !== 3) return false
  
  // Check that all parts exist
  if (!parts[0] || !parts[1] || !parts[2]) return false
  
  try {
    // Try to decode header and payload
    atob(parts[0])
    atob(parts[1])
    return true
  } catch {
    return false
  }
}
