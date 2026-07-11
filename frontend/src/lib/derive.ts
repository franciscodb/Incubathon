import { CATALOG_BY_CODE } from '../data/catalog'
import { semaphoreFor } from './rules'
import type { BusinessProcedure, ProcedureRow, Semaphore } from './types'

const SEVERITY: Record<Semaphore, number> = { rojo: 0, naranja: 1, amarillo: 2, verde: 3 }

/** Une business_procedures con el catálogo y calcula el semáforo; ordena por severidad. */
export function buildProcedureRows(procs: BusinessProcedure[]): ProcedureRow[] {
  return procs
    .map((p) => {
      const catalog = CATALOG_BY_CODE[p.procedure_code]
      const semaphore = semaphoreFor(p.status, catalog?.criticality ?? 'media', p.fecha_vencimiento)
      return { ...p, catalog, semaphore }
    })
    .filter((r) => r.catalog)
    .sort(
      (a, b) =>
        SEVERITY[a.semaphore] - SEVERITY[b.semaphore] ||
        a.catalog.name.localeCompare(b.catalog.name),
    )
}
