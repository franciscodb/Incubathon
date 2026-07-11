// =====================================================================
// Cliente HTTP del backend FastAPI (arquitectura 3 capas).
// El frontend YA NO habla con Supabase directo: todo pasa por el backend,
// que a su vez usa Supabase (Auth + Postgres + Storage).
//
// - Guarda el access_token (JWT de Supabase, devuelto por /auth/login) en
//   localStorage y lo manda como `Authorization: Bearer` en cada petición.
// - `apiFetch` para JSON; `apiUpload` para multipart (subida de archivos).
// =====================================================================

export const API_URL: string =
  import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8000'

const TOKEN_KEY = 'buro_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** Error HTTP con el status y el detalle que devolvió el backend. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = `Error ${res.status}`
  try {
    const body = await res.json()
    // FastAPI usa {detail: "..."} o {detail: [{msg: ...}]}
    if (typeof body?.detail === 'string') detail = body.detail
    else if (Array.isArray(body?.detail) && body.detail[0]?.msg)
      detail = body.detail.map((d: { msg: string }) => d.msg).join(', ')
    else if (body?.message) detail = body.message
  } catch {
    /* respuesta sin cuerpo JSON */
  }
  throw new ApiError(detail, res.status)
}

interface FetchOptions {
  method?: string
  body?: unknown
  auth?: boolean // por defecto true
}

/** Petición JSON al backend. Devuelve el cuerpo parseado (o null en 204). */
export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) await parseError(res)
  if (res.status === 204) return null as T
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

/** Subida multipart (archivos) al backend. */
export async function apiUpload<T = unknown>(
  path: string,
  form: FormData,
): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  // OJO: no seteamos Content-Type; el navegador pone el boundary.

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: form })
  if (!res.ok) await parseError(res)
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

/** Consulta el modo del backend (mock | live) para el banner de demo. */
export async function getBackendMode(): Promise<'mock' | 'live' | 'unknown'> {
  try {
    const res = await fetch(`${API_URL}/health`)
    if (!res.ok) return 'unknown'
    const body = await res.json()
    return body?.mode === 'live' ? 'live' : body?.mode === 'mock' ? 'mock' : 'unknown'
  } catch {
    return 'unknown'
  }
}
