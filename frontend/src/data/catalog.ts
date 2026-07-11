// Catálogo de trámites (fuente: shared/catalog.json, copiado a este directorio).
// Editar shared/catalog.json y volver a copiar para mantener sincronía.
import type { ProcedureCatalogItem } from '../lib/types'
import raw from './catalog.json'

export const CATALOG: ProcedureCatalogItem[] = (raw.procedures ??
  []) as ProcedureCatalogItem[]

export const CATALOG_BY_CODE: Record<string, ProcedureCatalogItem> =
  Object.fromEntries(CATALOG.map((p) => [p.code, p]))

export function getProcedure(code: string): ProcedureCatalogItem | undefined {
  return CATALOG_BY_CODE[code]
}

// Etiquetas legibles de categorías
export const CATEGORY_LABELS: Record<string, string> = {
  fiscal: 'Fiscal',
  operacion: 'Operación',
  inmueble: 'Inmueble / Uso de suelo',
  sanitario: 'Sanitario',
  proteccion_civil: 'Protección Civil',
  seguridad: 'Seguridad',
  ambiental: 'Ambiental',
  laboral: 'Laboral',
}

export const ALCALDIAS = [
  'Álvaro Obregón',
  'Azcapotzalco',
  'Benito Juárez',
  'Coyoacán',
  'Cuajimalpa',
  'Cuauhtémoc',
  'Gustavo A. Madero',
  'Iztacalco',
  'Iztapalapa',
  'La Magdalena Contreras',
  'Miguel Hidalgo',
  'Milpa Alta',
  'Tláhuac',
  'Tlalpan',
  'Venustiano Carranza',
  'Xochimilco',
]

export const GIRO_LABELS: Record<string, string> = {
  restaurante: 'Restaurante',
  cafeteria: 'Cafetería',
  bar: 'Bar',
  cantina: 'Cantina',
  fonda: 'Fonda / Cocina económica',
  food_truck: 'Food truck',
  otro: 'Otro (A&B)',
}
