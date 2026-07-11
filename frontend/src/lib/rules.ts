// =====================================================================
// Motor de reglas de cumplimiento (determinístico) — modo mock
// Espejo de backend/app/rules_engine.py. Ver shared/rules.md.
// =====================================================================
import type {
  BusinessInput,
  Business,
  BusinessGrade,
  BusinessProcedure,
  BusinessSummary,
  Criticality,
  NivelImpacto,
  ProcedureStatus,
  Semaphore,
} from './types'
import { CATALOG_BY_CODE } from '../data/catalog'

type BizLike = BusinessInput | Business

/** Clasifica el nivel de impacto del negocio. */
export function classify(b: BizLike): NivelImpacto {
  if (b.vende_alcohol && (['bar', 'cantina'].includes(b.giro) || b.aforo >= 100)) {
    return 'zonal'
  }
  if (b.vende_alcohol) return 'vecinal'
  return 'bajo'
}

/** Devuelve los códigos de trámite aplicables según las respuestas. */
export function applicableProcedureCodes(b: BizLike): string[] {
  const codes: string[] = [
    'RFC_SAT',
    'AVISO_APERTURA',
    'USO_SUELO',
    'AVISO_SANITARIO_COFEPRIS',
    'SACMEX_DESCARGAS',
    'PROTECCION_CIVIL_PIPC',
  ]

  if (b.num_trabajadores > 0) codes.push('IMSS_PATRONAL')
  if (b.vende_alcohol) codes.push('PERMISO_ALCOHOL')
  if (b.usa_gas) codes.push('DICTAMEN_GAS')
  if (b.tiene_terraza) codes.push('AUTORIZACION_ENSERES')
  if (b.tiene_anuncios) codes.push('LICENCIA_ANUNCIOS')
  if (b.aforo >= 50 || b.superficie_m2 >= 100) codes.push('VBSO')
  if (b.genera_residuos_especiales || ['restaurante', 'bar', 'cantina'].includes(b.giro))
    codes.push('PLAN_MANEJO_RESIDUOS')
  if (b.nivel_ruido === 'alto' || (b.vende_alcohol && b.nivel_ruido === 'medio'))
    codes.push('ESTUDIO_RUIDO')

  // Deduplicar preservando orden
  return Array.from(new Set(codes))
}

/** Genera los business_procedures iniciales (status pendiente). */
export function generateBusinessProcedures(
  businessId: string,
  b: BizLike,
): Omit<BusinessProcedure, 'id'>[] {
  return applicableProcedureCodes(b).map((code) => ({
    business_id: businessId,
    procedure_code: code,
    status: 'pendiente' as ProcedureStatus,
    fecha_inicio: null,
    fecha_emision: null,
    fecha_vencimiento: null,
    document_id: null,
    notas: null,
  }))
}

/** Días entre hoy y una fecha ISO (negativo si ya pasó). */
export function daysUntil(dateIso?: string | null): number | null {
  if (!dateIso) return null
  const target = new Date(dateIso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** Color de semáforo derivado del status, criticidad y vencimiento. */
export function semaphoreFor(
  status: ProcedureStatus,
  criticality: Criticality,
  fechaVencimiento?: string | null,
): Semaphore {
  if (status === 'no_aplica') return 'verde'
  if (status === 'vencido') return 'rojo'
  if (status === 'pendiente') return criticality === 'alta' ? 'rojo' : 'naranja'
  if (status === 'en_tramite') return 'amarillo'

  // status === 'vigente'
  const d = daysUntil(fechaVencimiento)
  if (d === null) return 'verde'
  if (d < 0) return 'rojo'
  if (d <= 60) return 'amarillo'
  return 'verde'
}

const WORST_ORDER: Semaphore[] = ['verde', 'amarillo', 'naranja', 'rojo']

// Ponderaciones para el puntaje de cumplimiento (estilo score crediticio).
const IMPORTANCE: Record<Criticality, number> = { alta: 3, media: 2, baja: 1 }
const STATUS_SCORE: Record<Semaphore, number> = { verde: 1, amarillo: 0.65, naranja: 0.35, rojo: 0 }

// Grados de mejor (0) a peor (6).
const GRADES: BusinessGrade[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'C']

/** Convierte un puntaje 0-100 en un grado crediticio. */
export function gradeFromScore(score: number): BusinessGrade {
  if (score >= 97) return 'AAA'
  if (score >= 90) return 'AA'
  if (score >= 80) return 'A'
  if (score >= 70) return 'BBB'
  if (score >= 55) return 'BB'
  if (score >= 40) return 'B'
  return 'C'
}

/** Resumen de cumplimiento del negocio a partir de sus trámites. */
export function businessSummary(
  procs: { status: ProcedureStatus; procedure_code: string; fecha_vencimiento?: string | null }[],
): BusinessSummary {
  const counts: Record<Semaphore, number> = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 }
  let worst = 0
  let proximos = 0
  let weightedSum = 0
  let weightTotal = 0
  let hasCriticalRed = false
  let hasAnyRed = false

  for (const p of procs) {
    const cat = CATALOG_BY_CODE[p.procedure_code]
    const crit = cat?.criticality ?? 'media'
    const s = semaphoreFor(p.status, crit, p.fecha_vencimiento)
    counts[s] += 1
    worst = Math.max(worst, WORST_ORDER.indexOf(s))
    const w = IMPORTANCE[crit]
    weightedSum += w * STATUS_SCORE[s]
    weightTotal += w
    if (s === 'rojo') {
      hasAnyRed = true
      if (crit === 'alta') hasCriticalRed = true
    }
    const d = daysUntil(p.fecha_vencimiento)
    if (p.status === 'vigente' && d !== null && d >= 0 && d <= 60) proximos += 1
  }

  const total = procs.length || 1
  const cumplimiento = Math.round((100 * counts.verde) / total)
  const score = weightTotal > 0 ? Math.round((100 * weightedSum) / weightTotal) : 100

  // Grado con "topes" tipo buró: un incumplimiento crítico impide grado alto.
  let gradeIdx = GRADES.indexOf(gradeFromScore(score))
  if (hasCriticalRed) gradeIdx = Math.max(gradeIdx, GRADES.indexOf('BB'))
  else if (hasAnyRed) gradeIdx = Math.max(gradeIdx, GRADES.indexOf('A'))
  const grade = procs.length ? GRADES[gradeIdx] : 'AAA'

  return {
    color: procs.length ? WORST_ORDER[worst] : 'verde',
    cumplimiento_pct: cumplimiento,
    counts,
    total: procs.length,
    proximos_vencer: proximos,
    score: procs.length ? score : 100,
    grade,
  }
}
