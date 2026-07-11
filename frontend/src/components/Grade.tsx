// =====================================================================
// Clasificación crediticia del cumplimiento (AAA…C) — la analogía
// "Buró de Crédito" hecha visible. Reutilizable en dashboard, cards y header.
// =====================================================================
import type { BusinessGrade } from '../lib/types'

type Tone = 'verde' | 'amarillo' | 'naranja' | 'rojo'

interface GradeMeta {
  label: string
  descriptor: string
  tone: Tone
  /** Chip suave (fondo claro + texto oscuro). */
  chip: string
  /** Sello sólido (degradado). */
  gradient: string
}

export const GRADE_META: Record<BusinessGrade, GradeMeta> = {
  AAA: {
    label: 'Triple A',
    descriptor: 'Cumplimiento ejemplar',
    tone: 'verde',
    chip: 'bg-verde-light text-verde-dark',
    gradient: 'linear-gradient(135deg,#16a34a,#15803d)',
  },
  AA: {
    label: 'Doble A',
    descriptor: 'Cumplimiento sólido',
    tone: 'verde',
    chip: 'bg-verde-light text-verde-dark',
    gradient: 'linear-gradient(135deg,#22c55e,#16a34a)',
  },
  A: {
    label: 'A',
    descriptor: 'Buen cumplimiento',
    tone: 'verde',
    chip: 'bg-verde-light text-verde-dark',
    gradient: 'linear-gradient(135deg,#65a30d,#16a34a)',
  },
  BBB: {
    label: 'Triple B',
    descriptor: 'Cumplimiento aceptable',
    tone: 'amarillo',
    chip: 'bg-amarillo-light text-amarillo-dark',
    gradient: 'linear-gradient(135deg,#eab308,#ca8a04)',
  },
  BB: {
    label: 'Doble B',
    descriptor: 'Riesgo moderado',
    tone: 'naranja',
    chip: 'bg-naranja-light text-naranja-dark',
    gradient: 'linear-gradient(135deg,#f97316,#ea580c)',
  },
  B: {
    label: 'B',
    descriptor: 'Riesgo alto',
    tone: 'naranja',
    chip: 'bg-naranja-light text-naranja-dark',
    gradient: 'linear-gradient(135deg,#ea580c,#c2410c)',
  },
  C: {
    label: 'C',
    descriptor: 'Riesgo crítico',
    tone: 'rojo',
    chip: 'bg-rojo-light text-rojo-dark',
    gradient: 'linear-gradient(135deg,#ef4444,#b91c1c)',
  },
}

/** Chip compacto con la clasificación (para tabs, listas, cards). */
export function GradeBadge({
  grade,
  size = 'md',
  showDescriptor = false,
}: {
  grade: BusinessGrade
  size?: 'sm' | 'md' | 'lg'
  showDescriptor?: boolean
}) {
  const m = GRADE_META[grade]
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2.5 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-extrabold tracking-tight ${m.chip} ${pad}`}
      title={`${m.label} · ${m.descriptor}`}
    >
      {grade}
      {showDescriptor && <span className="font-semibold opacity-80">· {m.descriptor}</span>}
    </span>
  )
}

/** Sello grande tipo "rating", con letras, puntaje y descriptor. */
export function GradeSeal({
  grade,
  score,
  size = 96,
}: {
  grade: BusinessGrade
  score: number
  size?: number
}) {
  const m = GRADE_META[grade]
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="grid place-items-center rounded-2xl font-display font-black leading-none text-white shadow-glow"
        style={{
          width: size,
          height: size,
          backgroundImage: m.gradient,
          fontSize: size * (grade.length >= 3 ? 0.34 : 0.44),
        }}
      >
        {grade}
      </div>
      <div className="text-xs font-semibold text-ink-500">
        {score} <span className="font-normal text-ink-400">/ 100</span>
      </div>
    </div>
  )
}
