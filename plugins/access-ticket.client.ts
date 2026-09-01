/**
 * Hold a valid file-access ticket for as long as the app is open.
 *
 * This runs before any page setup, so a page that builds image URLs
 * imperatively - the video annotator assembles a whole frame list in one go -
 * finds the ticket already in place rather than emitting a hundred URLs that
 * will be rejected.
 */
export default defineNuxtPlugin(async () => {
  const token = useCookie('auth_token')
  const { ensure, isFresh } = useAccessTicket()

  await ensure()

  // Tickets are deliberately short-lived, so a session that outlives one has to
  // renew. Only while the tab is visible: a backgrounded tab loads no images,
  // and renewing it would change every URL for nothing.
  const RENEW_EVERY_MS = 10 * 60 * 1000
  const tick = () => {
    if (document.visibilityState !== 'visible') return
    if (!token.value || isFresh()) return
    void ensure()
  }

  setInterval(tick, RENEW_EVERY_MS)
  document.addEventListener('visibilitychange', tick)
})
