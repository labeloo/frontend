/**
 * The short-lived ticket that lets an `<img>` read a file from the API.
 *
 * The bucket routes now check identity, and a browser attaches neither an
 * Authorization header nor a cross-origin cookie to an image request - so the
 * proof of identity has to travel in the URL. This composable is where that
 * proof is kept; `getFullApiUrl` is the only place that reads it.
 *
 * State is reactive on purpose: a ticket that arrives after a template has
 * already rendered repairs those URLs instead of leaving broken thumbnails.
 */

type Ticket = { ticket: string; expiresAt: number }

/** Refresh this far before expiry, so no request is issued against a dead ticket. */
const RENEW_MARGIN_SECONDS = 5 * 60

export const useAccessTicket = () => {
  const state = useState<Ticket | null>('access-ticket', () => null)
  const inFlight = useState<Promise<void> | null>('access-ticket-fetch', () => null)
  const config = useRuntimeConfig()
  const token = useCookie('auth_token')

  const isFresh = () => {
    const held = state.value
    if (!held) return false
    return held.expiresAt - RENEW_MARGIN_SECONDS > Math.floor(Date.now() / 1000)
  }

  const fetchTicket = async () => {
    try {
      const response = await fetch(`${config.public.apiUrl}/api/access/ticket`, {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (!response.ok) {
        state.value = null
        return
      }
      const data = await response.json()
      if (typeof data?.ticket === 'string') {
        state.value = { ticket: data.ticket, expiresAt: Number(data.expiresAt) }
      }
    } catch {
      // Offline or the API is down; the caller renders without a ticket rather
      // than blocking the whole app on a file it may never ask for.
      state.value = null
    }
  }

  /** Resolves once a usable ticket is held, coalescing concurrent callers. */
  const ensure = async () => {
    if (!token.value) return
    if (isFresh()) return
    if (!inFlight.value) {
      inFlight.value = fetchTicket().finally(() => {
        inFlight.value = null
      })
    }
    await inFlight.value
  }

  const clear = () => {
    state.value = null
  }

  return { state, ensure, clear, isFresh }
}

/**
 * Read-only access for `getFullApiUrl`, which is a plain function rather than a
 * composable and must not trigger a fetch of its own.
 */
export const currentAccessTicket = (): string => {
  try {
    return useState<Ticket | null>('access-ticket').value?.ticket ?? ''
  } catch {
    return ''
  }
}
