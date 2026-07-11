import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as db from '../lib/db'
import { ApiError } from '../lib/api'
import { applicableProcedureCodes, classify } from '../lib/rules'
import { ALCALDIAS, CATALOG_BY_CODE, GIRO_LABELS } from '../data/catalog'
import { SectionTitle, Spinner } from '../components/common'
import { IconArrowRight, IconCheck, IconImage, IconSparkles, IconUpload } from '../components/icons'
import type { BusinessInput, Giro, NivelImpacto } from '../lib/types'

const MAX_PHOTO_MB = 5

const IMPACTO_LABEL: Record<NivelImpacto, { label: string; cls: string }> = {
  bajo: { label: 'Bajo impacto', cls: 'bg-verde-light text-verde-dark' },
  vecinal: { label: 'Impacto vecinal', cls: 'bg-amarillo-light text-amarillo-dark' },
  zonal: { label: 'Impacto zonal', cls: 'bg-naranja-light text-naranja-dark' },
}

const EMPTY: BusinessInput = {
  nombre: '',
  razon_social: '',
  rfc: '',
  giro: 'restaurante',
  alcaldia: 'Cuauhtémoc',
  direccion: '',
  superficie_m2: 80,
  aforo: 40,
  num_trabajadores: 5,
  vende_alcohol: false,
  usa_gas: true,
  tiene_terraza: false,
  tiene_anuncios: false,
  genera_residuos_especiales: false,
  nivel_ruido: 'bajo',
  inmueble: 'rentado',
  realiza_construccion: false,
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
        checked
          ? 'border-brand-300 bg-brand-50/70 shadow-[0_8px_24px_-14px_rgba(109,94,252,0.6)]'
          : 'border-ink-200 bg-white hover:border-ink-300'
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>}
      </span>
      <span
        className="relative h-6 w-11 flex-none rounded-full transition-colors"
        style={checked ? { backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' } : { background: '#cbd0e0' }}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export default function BusinessForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { profile } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState<BusinessInput>(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  // Foto del negocio: archivo elegido (pendiente de subir), vista previa y quitar.
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    db.getBusiness(id)
      .then((b) => {
        if (b) {
          const { id: _i, owner_id: _o, nivel_impacto: _n, created_at: _c, ...rest } = b
          setForm(rest)
          setPhotoPreview(b.photo_url ?? null)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  // Libera el object URL de la vista previa al desmontar / reemplazar.
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const set = <K extends keyof BusinessInput>(key: K, value: BusinessInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function pickPhoto(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('Selecciona una imagen (JPG, PNG, WEBP…).', 'error')
      return
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      notify(`La imagen no debe superar ${MAX_PHOTO_MB} MB.`, 'error')
      return
    }
    setPhotoPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setPhotoFile(file)
    setRemovePhoto(false)
  }

  function clearPhoto() {
    setPhotoPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setPhotoFile(null)
    setRemovePhoto(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const impacto = useMemo(() => classify(form), [form])
  const applicable = useMemo(() => applicableProcedureCodes(form), [form])

  /** Sube o quita la foto tras guardar el negocio (best-effort: no bloquea el guardado). */
  async function syncPhoto(businessId: string, hadPhoto: boolean) {
    try {
      if (photoFile) {
        await db.uploadBusinessPhoto(businessId, photoFile)
      } else if (removePhoto && hadPhoto) {
        await db.deleteBusinessPhoto(businessId)
      }
    } catch {
      notify('El negocio se guardó, pero la foto no se pudo actualizar. Intenta de nuevo.', 'error')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      if (isEdit && id) {
        const updated = await db.updateBusiness(id, form)
        await syncPhoto(id, Boolean(updated.photo_url))
        notify('Negocio actualizado')
        navigate(`/app?b=${id}`)
      } else {
        const b = await db.createBusiness(profile.id, form)
        await syncPhoto(b.id, false)
        notify(`Diagnóstico generado: ${applicable.length} trámites aplicables`)
        navigate(`/app?b=${b.id}`)
      }
    } catch (err) {
      // 402: se acabó el cupo de negocios del plan → llevar a planes.
      if (err instanceof ApiError && err.status === 402) {
        notify(err.message, 'error')
        navigate('/precios?motivo=limite')
        return
      }
      notify(err instanceof Error ? err.message : 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Cargando negocio…" />

  return (
    <div className="relative">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-mesh-twilight" />
      <div className="container-app relative py-8 lg:py-12">
        <Link to="/app" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
          ← Volver al dashboard
        </Link>
        <SectionTitle
          eyebrow="Datos generales"
          title={isEdit ? 'Editar negocio' : 'Diagnostica tu negocio'}
          description="Responde el cuestionario. Con tus respuestas clasificamos el negocio y generamos automáticamente los trámites que le aplican."
        />

        <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            {/* Identificación */}
            <section className="glass-card p-6 sm:p-7">
              <h3 className="font-display text-base font-bold text-ink-900">Identificación</h3>

              {/* Foto del negocio */}
              <div className="mt-4">
                <label className="label">Foto del negocio</label>
                <div className="mt-1.5 overflow-hidden rounded-2xl border border-ink-200 bg-ink-50">
                  <div className="relative h-44 w-full">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Vista previa de la foto del negocio"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-400">
                        <IconImage width={28} height={28} />
                        <span className="text-xs">Sube una foto de la fachada o el interior</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-ink-200 bg-white p-3">
                    <label className="btn-secondary cursor-pointer text-sm">
                      <IconUpload width={15} height={15} />
                      {photoPreview ? 'Cambiar foto' : 'Subir foto'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="btn-ghost text-sm text-rojo hover:bg-rojo-light/60"
                      >
                        Quitar
                      </button>
                    )}
                    <span className="ml-auto text-xs text-ink-400">
                      JPG, PNG o WEBP · máx {MAX_PHOTO_MB}&nbsp;MB
                    </span>
                  </div>
                </div>
              </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Nombre comercial *</label>
                <input
                  required
                  className="input"
                  placeholder="Ej. La Terraza Roma"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Razón social</label>
                <input
                  className="input"
                  placeholder="Ej. Sabores S.A. de C.V."
                  value={form.razon_social}
                  onChange={(e) => set('razon_social', e.target.value)}
                />
              </div>
              <div>
                <label className="label">RFC</label>
                <input
                  className="input uppercase"
                  placeholder="XAXX010101000"
                  value={form.rfc}
                  onChange={(e) => set('rfc', e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="label">Giro *</label>
                <select className="select" value={form.giro} onChange={(e) => set('giro', e.target.value as Giro)}>
                  {Object.entries(GIRO_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Alcaldía *</label>
                <select
                  className="select"
                  value={form.alcaldia}
                  onChange={(e) => set('alcaldia', e.target.value)}
                >
                  {ALCALDIAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Dirección</label>
                <input
                  className="input"
                  placeholder="Calle, número, colonia"
                  value={form.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Dimensiones */}
          <section className="glass-card p-6 sm:p-7">
            <h3 className="font-display text-base font-bold text-ink-900">Dimensiones y personal</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Superficie (m²)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.superficie_m2}
                  onChange={(e) => set('superficie_m2', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Aforo (personas)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.aforo}
                  onChange={(e) => set('aforo', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label"># Trabajadores</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.num_trabajadores}
                  onChange={(e) => set('num_trabajadores', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Tipo de inmueble</label>
                <select
                  className="select"
                  value={form.inmueble}
                  onChange={(e) => set('inmueble', e.target.value as 'propio' | 'rentado')}
                >
                  <option value="rentado">Rentado</option>
                  <option value="propio">Propio</option>
                </select>
              </div>
              <div>
                <label className="label">Nivel de ruido</label>
                <select
                  className="select"
                  value={form.nivel_ruido}
                  onChange={(e) => set('nivel_ruido', e.target.value as 'bajo' | 'medio' | 'alto')}
                >
                  <option value="bajo">Bajo (sin música fuerte)</option>
                  <option value="medio">Medio (música ambiental)</option>
                  <option value="alto">Alto (música en vivo/DJ)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Características que activan trámites */}
          <section className="glass-card p-6 sm:p-7">
            <h3 className="font-display text-base font-bold text-ink-900">Características de operación</h3>
            <p className="mt-1 text-sm text-ink-500">
              Cada característica activa trámites específicos.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={form.vende_alcohol}
                onChange={(v) => set('vende_alcohol', v)}
                label="Vende bebidas alcohólicas"
                hint="Activa permiso de alcohol e impacto vecinal"
              />
              <Toggle
                checked={form.usa_gas}
                onChange={(v) => set('usa_gas', v)}
                label="Usa gas L.P."
                hint="Activa dictamen de instalación de gas"
              />
              <Toggle
                checked={form.tiene_terraza}
                onChange={(v) => set('tiene_terraza', v)}
                label="Tiene terraza / enseres en vía pública"
                hint="Activa autorización de enseres"
              />
              <Toggle
                checked={form.tiene_anuncios}
                onChange={(v) => set('tiene_anuncios', v)}
                label="Tiene anuncios en fachada"
                hint="Activa licencia de anuncios"
              />
              <Toggle
                checked={form.genera_residuos_especiales}
                onChange={(v) => set('genera_residuos_especiales', v)}
                label="Genera residuos especiales (grasas/aceites)"
                hint="Activa plan de manejo de residuos"
              />
              <Toggle
                checked={form.realiza_construccion}
                onChange={(v) => set('realiza_construccion', v)}
                label="Realiza obra o adecuación"
                hint="Puede requerir permisos de construcción"
              />
            </div>
          </section>
        </div>

          {/* Panel de clasificación en vivo */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="glass-card overflow-hidden">
                <div
                  className="flex items-center gap-2 px-5 py-3.5 text-white"
                  style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
                >
                  <IconSparkles width={18} height={18} />
                  <span className="font-display text-sm font-bold">Clasificación en vivo</span>
                </div>
                <div className="space-y-5 p-5">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
                      Nivel de impacto
                    </div>
                    <span className={`badge mt-1.5 ${IMPACTO_LABEL[impacto].cls}`}>
                      {IMPACTO_LABEL[impacto].label}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                        Trámites aplicables
                      </span>
                      <span className="font-display text-3xl font-extrabold text-gradient">
                        {applicable.length}
                      </span>
                    </div>
                    <ul className="mt-3 max-h-64 space-y-1.5 overflow-auto pr-1">
                      {applicable.map((code) => (
                        <li key={code} className="flex items-start gap-2 text-sm text-ink-600">
                          <IconCheck width={15} height={15} className="mt-0.5 flex-none text-verde" />
                          {CATALOG_BY_CODE[code]?.name ?? code}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full py-3.5">
                {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Generar diagnóstico'}
                <IconArrowRight width={16} height={16} />
              </button>
              <p className="text-center text-xs text-ink-400">
                Podrás editar estos datos en cualquier momento.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  )
}
