// =====================================================================
// Capa de datos del frontend — arquitectura 3 capas.
// Todas las funciones llaman al backend FastAPI (que usa Supabase).
// La UI consume estas funciones y no sabe nada del transporte HTTP.
// =====================================================================
import { apiFetch, apiUpload, setToken, clearToken, getToken } from './api'
import { CATALOG } from '../data/catalog'
import type { BillingInterval, Quote } from './pricing'
import type {
  Business,
  BusinessDocument,
  BusinessInput,
  BusinessProcedure,
  Certification,
  ContactRequest,
  ContactStatus,
  Profile,
  Professional,
  Review,
  Subscription,
} from './types'

// ---------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------
export interface AuthInput {
  email: string
  password: string
  full_name?: string
  role?: 'business_owner' | 'professional'
}

export interface ProfessionalFilters {
  especialidad?: string
  procedure_code?: string
  verifiedOnly?: boolean
  search?: string
}

interface BackendUser {
  id: string
  email: string
  full_name?: string | null
  phone?: string | null
  role: Profile['role']
}

interface AuthResponse {
  access_token: string
  token_type: string
  user: BackendUser
}

function toProfile(u: BackendUser): Profile {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name ?? '',
    phone: u.phone ?? undefined,
    role: u.role,
  }
}

// =====================================================================
// AUTH
// =====================================================================
export async function register(input: AuthInput): Promise<Profile> {
  const res = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: {
      email: input.email,
      password: input.password,
      full_name: input.full_name ?? '',
      role: input.role ?? 'business_owner',
    },
  })
  setToken(res.access_token)
  return toProfile(res.user)
}

export async function login(input: AuthInput): Promise<Profile> {
  const res = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: input.email, password: input.password },
  })
  setToken(res.access_token)
  return toProfile(res.user)
}

/** Inicia sesión con el usuario demo (solo funciona si el backend está en modo mock). */
export async function loginDemo(): Promise<Profile> {
  return login({ email: 'demo@buro.mx', password: 'demo1234' })
}

export async function logout(): Promise<void> {
  clearToken()
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!getToken()) return null
  try {
    const u = await apiFetch<BackendUser>('/auth/me')
    return toProfile(u)
  } catch {
    // Token inválido / expirado → sesión limpia
    clearToken()
    return null
  }
}

// =====================================================================
// BUSINESSES
// =====================================================================
export async function listBusinesses(_ownerId: string): Promise<Business[]> {
  // El backend deriva el dueño del token; _ownerId se ignora.
  return apiFetch<Business[]>('/businesses')
}

export async function getBusiness(id: string): Promise<Business | null> {
  try {
    return await apiFetch<Business>(`/businesses/${id}`)
  } catch {
    return null
  }
}

export async function createBusiness(_ownerId: string, input: BusinessInput): Promise<Business> {
  return apiFetch<Business>('/businesses', { method: 'POST', body: input })
}

export async function updateBusiness(id: string, input: BusinessInput): Promise<Business> {
  return apiFetch<Business>(`/businesses/${id}`, { method: 'PATCH', body: input })
}

/** Sube (o reemplaza) la foto del negocio. Devuelve el negocio con photo_url actualizado. */
export async function uploadBusinessPhoto(businessId: string, file: File): Promise<Business> {
  const form = new FormData()
  form.append('file', file)
  return apiUpload<Business>(`/businesses/${businessId}/photo`, form)
}

/** Quita la foto del negocio (photo_url = null). */
export async function deleteBusinessPhoto(businessId: string): Promise<Business> {
  return apiFetch<Business>(`/businesses/${businessId}/photo`, { method: 'DELETE' })
}

// =====================================================================
// PROCEDURES
// =====================================================================
export function getCatalog() {
  return CATALOG
}

interface MatrixResponse {
  business_id: string
  nivel_impacto: string
  summary: unknown
  procedures: BusinessProcedure[]
}

export async function getBusinessProcedures(businessId: string): Promise<BusinessProcedure[]> {
  const matrix = await apiFetch<MatrixResponse>(`/businesses/${businessId}/procedures`)
  return matrix.procedures ?? []
}

export async function updateBusinessProcedure(
  businessId: string,
  code: string,
  patch: Partial<BusinessProcedure>,
): Promise<BusinessProcedure> {
  return apiFetch<BusinessProcedure>(`/businesses/${businessId}/procedures/${code}`, {
    method: 'PATCH',
    body: patch,
  })
}

// =====================================================================
// DOCUMENTS
// =====================================================================
export async function listDocuments(businessId: string): Promise<BusinessDocument[]> {
  return apiFetch<BusinessDocument[]>(`/businesses/${businessId}/documents`)
}

export interface UploadDocInput {
  file: File | null
  name: string
  procedure_code?: string | null
  fecha_emision?: string | null
  fecha_vencimiento?: string | null
}

export async function uploadDocument(
  businessId: string,
  input: UploadDocInput,
): Promise<BusinessDocument> {
  if (!input.file) {
    throw new Error('Selecciona un archivo para subir el documento.')
  }
  const form = new FormData()
  form.append('file', input.file)
  if (input.procedure_code) form.append('procedure_code', input.procedure_code)
  if (input.fecha_emision) form.append('fecha_emision', input.fecha_emision)
  if (input.fecha_vencimiento) form.append('fecha_vencimiento', input.fecha_vencimiento)

  const doc = await apiUpload<BusinessDocument>(`/businesses/${businessId}/documents`, form)

  // Enlaza el documento al trámite y lo marca vigente (como en el flujo previo).
  if (input.procedure_code) {
    try {
      await updateBusinessProcedure(businessId, input.procedure_code, {
        document_id: doc.id,
        status: 'vigente',
        fecha_emision: input.fecha_emision ?? null,
        fecha_vencimiento: input.fecha_vencimiento ?? null,
      })
    } catch {
      /* el documento ya quedó guardado; el enlace es best-effort */
    }
  }
  return doc
}

// =====================================================================
// PROFESSIONALS
// =====================================================================
type ProfessionalWithCerts = Professional & { certifications?: Certification[] }

function coerceProfessional(p: ProfessionalWithCerts): Professional {
  return { ...p, rating: p.rating ?? 0, reviews_count: p.reviews_count ?? 0 }
}

export async function listProfessionals(f: ProfessionalFilters = {}): Promise<Professional[]> {
  const params = new URLSearchParams()
  if (f.verifiedOnly) params.set('verified', 'true')
  if (f.procedure_code) params.set('procedure_code', f.procedure_code)
  if (f.especialidad) params.set('especialidad', f.especialidad)
  const qs = params.toString()
  let list = await apiFetch<ProfessionalWithCerts[]>(`/professionals${qs ? `?${qs}` : ''}`)
  list = list.map(coerceProfessional)

  if (f.search) {
    const q = f.search.toLowerCase()
    list = list.filter((p) =>
      [p.nombre, p.profesion, p.bio, ...(p.especialidades ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }
  return list.sort(
    (a, b) => Number(b.verified) - Number(a.verified) || (b.rating ?? 0) - (a.rating ?? 0),
  )
}

export async function getProfessional(id: string): Promise<Professional | null> {
  try {
    const p = await apiFetch<ProfessionalWithCerts>(`/professionals/${id}`)
    return coerceProfessional(p)
  } catch {
    return null
  }
}

export async function getMyProfessional(_userId: string): Promise<Professional | null> {
  const p = await apiFetch<ProfessionalWithCerts | null>('/professionals/me')
  return p ? coerceProfessional(p) : null
}

export type ProfessionalInput = Omit<
  Professional,
  'id' | 'user_id' | 'verified' | 'rating' | 'reviews_count'
>

export async function upsertProfessional(
  _userId: string,
  input: ProfessionalInput,
): Promise<Professional> {
  const p = await apiFetch<ProfessionalWithCerts>('/professionals/me', {
    method: 'PUT',
    body: input,
  })
  return coerceProfessional(p)
}

export async function listCertifications(professionalId: string): Promise<Certification[]> {
  const p = await apiFetch<ProfessionalWithCerts>(`/professionals/${professionalId}`)
  return p.certifications ?? []
}

export interface CertInput {
  file: File | null
  nombre: string
  emisor?: string
  fecha_emision?: string | null
  fecha_vencimiento?: string | null
}

export async function addCertification(
  professionalId: string,
  input: CertInput,
): Promise<Certification> {
  // Nota: la subida del archivo de certificación aún no pasa por el backend;
  // se registran los metadatos. (El backend expone metadatos + file_url.)
  return apiFetch<Certification>(`/professionals/${professionalId}/certifications`, {
    method: 'POST',
    body: {
      nombre: input.nombre || input.file?.name || 'Certificación',
      emisor: input.emisor,
      fecha_emision: input.fecha_emision ?? null,
      fecha_vencimiento: input.fecha_vencimiento ?? null,
    },
  })
}

// =====================================================================
// CONTACT REQUESTS
// =====================================================================
export interface ContactInput {
  business_id?: string | null
  professional_id: string
  requester_id?: string | null
  procedure_code?: string | null
  message: string
}

export async function createContactRequest(input: ContactInput): Promise<ContactRequest> {
  return apiFetch<ContactRequest>('/contact-requests', {
    method: 'POST',
    body: {
      professional_id: input.professional_id,
      business_id: input.business_id ?? null,
      procedure_code: input.procedure_code ?? null,
      message: input.message,
    },
  })
}

export async function listContactRequests(_requesterId: string): Promise<ContactRequest[]> {
  return apiFetch<ContactRequest[]>('/contact-requests')
}

export async function updateContactRequest(
  id: string,
  status: ContactStatus,
): Promise<ContactRequest> {
  return apiFetch<ContactRequest>(`/contact-requests/${id}`, {
    method: 'PATCH',
    body: { status },
  })
}

// =====================================================================
// REVIEWS / EVALUACIÓN DE PROFESIONALES
// =====================================================================
export interface ReviewInput {
  rating: number
  comment?: string
  business_id?: string | null
  contact_request_id?: string | null
}

export async function listReviews(professionalId: string): Promise<Review[]> {
  return apiFetch<Review[]>(`/professionals/${professionalId}/reviews`)
}

export async function createReview(
  professionalId: string,
  input: ReviewInput,
): Promise<Review> {
  return apiFetch<Review>(`/professionals/${professionalId}/reviews`, {
    method: 'POST',
    body: input,
  })
}

// =====================================================================
// BILLING / SUSCRIPCIONES
// =====================================================================
export interface CheckoutInput {
  businesses: number
  alcohol_businesses: number
  interval: BillingInterval
}

export interface CheckoutResponse {
  url: string
  simulated: boolean
  quote: Quote
}

export async function getSubscription(): Promise<Subscription> {
  return apiFetch<Subscription>('/billing/subscription')
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>('/billing/checkout', { method: 'POST', body: input })
}
