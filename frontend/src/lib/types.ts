// =====================================================================
// Tipos del dominio — CumplIA (cumplimiento regulatorio)
// =====================================================================

export type Role = 'business_owner' | 'professional' | 'admin'

export type Giro =
  | 'restaurante'
  | 'cafeteria'
  | 'bar'
  | 'cantina'
  | 'fonda'
  | 'food_truck'
  | 'otro'

export type NivelRuido = 'bajo' | 'medio' | 'alto'
export type Inmueble = 'propio' | 'rentado'
export type NivelImpacto = 'bajo' | 'vecinal' | 'zonal'

export type ProcedureStatus =
  | 'pendiente'
  | 'en_tramite'
  | 'vigente'
  | 'vencido'
  | 'no_aplica'

export type Semaphore = 'verde' | 'amarillo' | 'naranja' | 'rojo'
export type Criticality = 'alta' | 'media' | 'baja'

// Clasificación tipo "buró de crédito" del cumplimiento del negocio.
// De mejor a peor: AAA (todo en regla) → C (riesgo crítico).
export type BusinessGrade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'C'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  role: Role
}

export interface ProcedureStep {
  title: string
  detail: string
}

export interface ProcedureCatalogItem {
  code: string
  name: string
  authority: string
  category: string
  criticality: Criticality
  vigencia_meses: number | null
  estimated_cost: string
  estimated_time: string
  official_url: string
  description: string
  why: string
  steps: ProcedureStep[]
}

export interface Business {
  id: string
  owner_id: string
  nombre: string
  razon_social?: string
  rfc?: string
  giro: Giro
  alcaldia: string
  direccion?: string
  superficie_m2: number
  aforo: number
  num_trabajadores: number
  vende_alcohol: boolean
  usa_gas: boolean
  tiene_terraza: boolean
  tiene_anuncios: boolean
  genera_residuos_especiales: boolean
  nivel_ruido: NivelRuido
  inmueble: Inmueble
  realiza_construccion: boolean
  nivel_impacto: NivelImpacto
  photo_url?: string | null
  created_at: string
}

export type BusinessInput = Omit<
  Business,
  'id' | 'owner_id' | 'nivel_impacto' | 'created_at'
>

export interface BusinessProcedure {
  id: string
  business_id: string
  procedure_code: string
  status: ProcedureStatus
  fecha_inicio?: string | null
  fecha_emision?: string | null
  fecha_vencimiento?: string | null
  document_id?: string | null
  notas?: string | null
}

// Fila de la matriz: trámite del negocio + datos del catálogo + semáforo derivado
export interface ProcedureRow extends BusinessProcedure {
  catalog: ProcedureCatalogItem
  semaphore: Semaphore
}

export interface BusinessDocument {
  id: string
  business_id: string
  procedure_code?: string | null
  name: string
  file_url?: string | null
  mime_type?: string | null
  fecha_emision?: string | null
  fecha_vencimiento?: string | null
  created_at: string
}

export interface Professional {
  id: string
  user_id?: string | null
  nombre: string
  profesion: string
  especialidades: string[]
  procedures_codes: string[]
  cedula?: string
  bio?: string
  ciudad: string
  alcaldias: string[]
  telefono?: string
  email?: string
  sitio_web?: string | null
  verified: boolean
  rating: number
  reviews_count: number
  avatar_url?: string | null
}

export interface Certification {
  id: string
  professional_id: string
  nombre: string
  emisor?: string
  file_url?: string | null
  fecha_emision?: string | null
  fecha_vencimiento?: string | null
  verified: boolean
}

export type ContactStatus = 'nuevo' | 'contactado' | 'cerrado'

export interface ContactRequest {
  id: string
  business_id?: string | null
  professional_id: string
  requester_id?: string | null
  procedure_code?: string | null
  message: string
  status: ContactStatus
  created_at: string
  professional_nombre?: string | null
  business_nombre?: string | null
}

export interface Review {
  id: string
  professional_id: string
  requester_id?: string | null
  business_id?: string | null
  contact_request_id?: string | null
  rating: number
  comment?: string | null
  author_name?: string | null
  created_at?: string | null
}

export type SubscriptionStatus =
  | 'free'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'

export interface Subscription {
  id?: string | null
  account_id: string
  status: SubscriptionStatus
  seats: number
  alcohol_businesses: number
  interval: 'monthly' | 'annual'
  amount_cents: number
  currency: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
  created_at?: string | null
  updated_at?: string | null
  /** Negocios permitidos según el plan (derivado). */
  entitled_seats: number
  /** Negocios ya registrados (derivado). */
  used_seats: number
}

export interface BusinessSummary {
  color: Semaphore
  cumplimiento_pct: number
  counts: Record<Semaphore, number>
  total: number
  proximos_vencer: number
  /** Puntaje de cumplimiento ponderado 0-100 (pondera por criticidad). */
  score: number
  /** Clasificación crediticia derivada del puntaje (AAA…C). */
  grade: BusinessGrade
}
