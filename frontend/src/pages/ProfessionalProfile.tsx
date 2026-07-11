import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as db from '../lib/db'
import { ALCALDIAS, CATALOG } from '../data/catalog'
import { formatDate } from '../lib/format'
import { SectionTitle, Spinner, VerifiedBadge } from '../components/common'
import {
  IconArrowRight,
  IconBadgeCheck,
  IconCheck,
  IconPlus,
  IconUpload,
} from '../components/icons'
import type { Certification, Professional } from '../lib/types'

interface FormState {
  nombre: string
  profesion: string
  especialidades: string[]
  procedures_codes: string[]
  cedula: string
  bio: string
  ciudad: string
  alcaldias: string[]
  telefono: string
  email: string
  sitio_web: string
}

const EMPTY: FormState = {
  nombre: '',
  profesion: '',
  especialidades: [],
  procedures_codes: [],
  cedula: '',
  bio: '',
  ciudad: 'Ciudad de México',
  alcaldias: [],
  telefono: '',
  email: '',
  sitio_web: '',
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

export default function ProfessionalProfile() {
  const { profile } = useAuth()
  const { notify } = useToast()
  const [pro, setPro] = useState<Professional | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [certs, setCerts] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [espInput, setEspInput] = useState('')

  // Certificación nueva
  const [certName, setCertName] = useState('')
  const [certEmisor, setCertEmisor] = useState('')
  const [certVenc, setCertVenc] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const p = await db.getMyProfessional(profile.id)
      if (p) {
        setPro(p)
        setForm({
          nombre: p.nombre,
          profesion: p.profesion,
          especialidades: p.especialidades,
          procedures_codes: p.procedures_codes,
          cedula: p.cedula ?? '',
          bio: p.bio ?? '',
          ciudad: p.ciudad,
          alcaldias: p.alcaldias,
          telefono: p.telefono ?? '',
          email: p.email ?? profile.email,
          sitio_web: p.sitio_web ?? '',
        })
        setCerts(await db.listCertifications(p.id))
      } else {
        setForm((f) => ({ ...f, nombre: profile.full_name, email: profile.email }))
      }
      setLoading(false)
    })()
  }, [profile])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  function addEsp() {
    const v = espInput.trim()
    if (v && !form.especialidades.includes(v)) set('especialidades', [...form.especialidades, v])
    setEspInput('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      const saved = await db.upsertProfessional(profile.id, {
        ...form,
        sitio_web: form.sitio_web || null,
      })
      setPro(saved)
      notify(pro ? 'Perfil actualizado' : 'Perfil profesional creado 🎉')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function addCert(e: React.FormEvent) {
    e.preventDefault()
    if (!pro) {
      notify('Primero guarda tu perfil.', 'error')
      return
    }
    try {
      const c = await db.addCertification(pro.id, {
        file: certFile,
        nombre: certName,
        emisor: certEmisor,
        fecha_vencimiento: certVenc || null,
      })
      setCerts((cs) => [...cs, c])
      setCertName('')
      setCertEmisor('')
      setCertVenc('')
      setCertFile(null)
      notify('Certificación agregada')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error', 'error')
    }
  }

  if (loading) return <Spinner label="Cargando tu perfil…" />

  return (
    <div className="container-app py-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle
          eyebrow="Perfil profesional"
          title={pro ? 'Mi perfil profesional' : 'Crea tu perfil profesional'}
          description="Completa tu información y sube tus certificaciones para aparecer en el marketplace."
        />
        {pro && <VerifiedBadge verified={pro.verified} />}
      </div>

      {pro && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 px-5 py-3.5">
          <span className="text-sm text-brand-800">
            Tu perfil ya es visible en el marketplace.
          </span>
          <Link to={`/profesional/${pro.id}`} className="btn-secondary">
            Ver mi perfil público <IconArrowRight width={16} height={16} />
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Formulario perfil */}
        <form onSubmit={save} className="space-y-6 lg:col-span-2">
          <section className="glass-card p-6 sm:p-7">
            <h3 className="font-display text-base font-bold text-ink-900">Información general</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Nombre / Razón social *</label>
                <input required className="input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
              </div>
              <div>
                <label className="label">Profesión / Título *</label>
                <input
                  required
                  className="input"
                  placeholder="Ej. DRO, Abogado, Unidad de Verificación…"
                  value={form.profesion}
                  onChange={(e) => set('profesion', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Cédula / Registro</label>
                <input className="input" value={form.cedula} onChange={(e) => set('cedula', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Descripción / Bio</label>
                <textarea
                  className="input min-h-[90px]"
                  placeholder="Describe tu experiencia y servicios…"
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="glass-card p-6 sm:p-7">
            <h3 className="font-display text-base font-bold text-ink-900">Contacto y cobertura</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
              </div>
              <div>
                <label className="label">Correo</label>
                <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Sitio web</label>
                <input
                  className="input"
                  placeholder="https://…"
                  value={form.sitio_web}
                  onChange={(e) => set('sitio_web', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Alcaldías donde ofreces servicio</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALCALDIAS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => set('alcaldias', toggle(form.alcaldias, a))}
                      className={`badge border transition ${
                        form.alcaldias.includes(a)
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-ink-200 bg-white text-ink-600 hover:bg-white/60'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-6 sm:p-7">
            <h3 className="font-display text-base font-bold text-ink-900">Especialidades</h3>
            <div className="mt-3 flex gap-2">
              <input
                className="input"
                placeholder="Agrega una especialidad y presiona Enter"
                value={espInput}
                onChange={(e) => setEspInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addEsp()
                  }
                }}
              />
              <button type="button" onClick={addEsp} className="btn-secondary flex-none">
                <IconPlus width={16} height={16} />
              </button>
            </div>
            {form.especialidades.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {form.especialidades.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => set('especialidades', form.especialidades.filter((x) => x !== e))}
                    className="badge bg-brand-50 text-brand-700 hover:bg-rojo-light hover:text-rojo-dark"
                  >
                    {e} ✕
                  </button>
                ))}
              </div>
            )}

            <h3 className="mt-6 font-display text-base font-bold text-ink-900">Trámites que resuelves</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CATALOG.map((c) => {
                const on = form.procedures_codes.includes(c.code)
                return (
                  <button
                    type="button"
                    key={c.code}
                    onClick={() => set('procedures_codes', toggle(form.procedures_codes, c.code))}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition ${
                      on ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-ink-200 hover:border-ink-300'
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 flex-none place-items-center rounded-md border ${
                        on ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300'
                      }`}
                    >
                      {on && <IconCheck width={12} height={12} />}
                    </span>
                    {c.name}
                  </button>
                )
              })}
            </div>
          </section>

          <button type="submit" disabled={saving} className="btn-primary w-full py-3">
            {saving ? 'Guardando…' : pro ? 'Guardar cambios' : 'Publicar mi perfil'}
            <IconArrowRight width={16} height={16} />
          </button>
        </form>

        {/* Certificaciones */}
        <aside className="lg:col-span-1">
          <div className="glass-card sticky top-24 p-6">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <IconBadgeCheck width={18} height={18} className="text-brand-600" /> Certificaciones
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Sube los documentos que avalan tu registro o acreditación.
            </p>

            {certs.length > 0 && (
              <ul className="mt-4 space-y-2">
                {certs.map((c) => (
                  <li key={c.id} className="rounded-xl bg-white/60 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                      {c.nombre}
                      {c.verified && <IconCheck width={14} height={14} className="text-verde" />}
                    </div>
                    <div className="text-xs text-ink-500">
                      {c.emisor}
                      {c.fecha_vencimiento ? ` · vence ${formatDate(c.fecha_vencimiento)}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={addCert} className="mt-4 space-y-3 border-t border-ink-100 pt-4">
              <input
                required
                className="input"
                placeholder="Nombre de la certificación"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Emisor"
                value={certEmisor}
                onChange={(e) => setCertEmisor(e.target.value)}
              />
              <div>
                <label className="label text-xs">Vigencia (opcional)</label>
                <input
                  type="date"
                  className="input"
                  value={certVenc}
                  onChange={(e) => setCertVenc(e.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-2.5 text-sm text-ink-500 hover:border-brand-400">
                <IconUpload width={16} height={16} />
                {certFile ? certFile.name : 'Subir documento'}
                <input type="file" className="hidden" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
              </label>
              <button type="submit" className="btn-secondary w-full">
                <IconPlus width={16} height={16} /> Agregar certificación
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  )
}
