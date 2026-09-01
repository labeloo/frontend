/**
 * Client for the training subsystem.
 *
 * Every call carries the JWT and the organization id, exactly like the other
 * org-scoped screens; the API proves membership and entitlement. Nothing here
 * knows the trainer service's real address or key - those stay on the server,
 * reached through the broker.
 */

export type WeightCatalogEntry = {
  id: string
  name: string
  family: string
  task: string
  params: string
  note: string
}

export type ModelAsset = {
  id: number
  name: string
  kind: 'base' | 'trained'
  format: string
  sizeBytes: number
  sourceJobId: number | null
  createdAt: number
}

export type TrainingJob = {
  id: number
  projectId: number | null
  baseAssetId: number
  status: 'queued' | 'running' | 'paused' | 'succeeded' | 'failed' | 'canceled'
  progress: number
  metrics: string | null
  outputAssetId: number | null
  error: string | null
  epochs: number
  imgsz: number
  createdAt: number
  updatedAt: number
}

export const useTraining = (organizationId: string | number) => {
  const config = useRuntimeConfig()
  const token = useCookie('auth_token')
  const base = `${config.public.apiUrl}/api/training`

  const headers = (extra: Record<string, string> = {}) => ({
    Authorization: `Bearer ${token.value}`,
    orgId: String(organizationId),
    ...extra,
  })

  /** Turn a non-2xx into an Error carrying the API's own message. */
  const unwrap = async (response: Response) => {
    const text = await response.text()
    let body: any = null
    try { body = text ? JSON.parse(text) : null } catch { /* leave as text */ }
    if (!response.ok) throw new Error(body?.error || text || `HTTP ${response.status}`)
    return body?.data ?? body
  }

  const getJson = (path: string) => fetch(`${base}${path}`, { headers: headers() }).then(unwrap)
  const post = (path: string, json?: unknown) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: json ? headers({ 'Content-Type': 'application/json' }) : headers(),
      body: json ? JSON.stringify(json) : undefined,
    }).then(unwrap)

  return {
    catalog: (): Promise<WeightCatalogEntry[]> => getJson('/catalog'),
    downloadWeight: (catalogId: string): Promise<ModelAsset> => post(`/weights/${catalogId}/download`),
    models: (): Promise<ModelAsset[]> => getJson('/models'),
    jobs: (projectId?: number): Promise<TrainingJob[]> => getJson(projectId ? `/jobs?projectId=${projectId}` : '/jobs'),
    job: (id: number): Promise<TrainingJob> => getJson(`/jobs/${id}`),
    startJob: (body: { projectId: number; baseAssetId: number; taskFilter: string; epochs: number; imgsz: number }): Promise<TrainingJob> =>
      post('/jobs', body),
    pauseJob: (id: number) => post(`/jobs/${id}/pause`),
    resumeJob: (id: number) => post(`/jobs/${id}/resume`),
    cancelJob: (id: number) => post(`/jobs/${id}/cancel`),
    registerJob: (id: number): Promise<ModelAsset> => post(`/jobs/${id}/register`),
    /** A URL a plain <a download> can hit; the browser sends the JWT via cookie
     *  is not enough here, so downloads open through fetch + object URL in the UI. */
    modelDownloadUrl: (id: number) => `${base}/models/${id}/download`,
    downloadModel: async (id: number, filename: string) => {
      const response = await fetch(`${base}/models/${id}/download`, { headers: headers() })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
  }
}
