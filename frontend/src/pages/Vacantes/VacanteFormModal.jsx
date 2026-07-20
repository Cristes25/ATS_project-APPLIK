import { useState, useEffect } from "react"
import { Input, Textarea } from "@/components/ui/Input"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/Modal"
import { cn } from "@/lib/utils"
import { Sparkles, Loader2 } from "lucide-react"
import { fetchDepartments, createDepartment, createJob, updateJob } from "@/api/jobs"
import { generateJobDescription } from "@/api/ai"

const tiposContrato = ["Full Time", "Part Time", "Remoto", "Híbrido", "Contrato", "Temporal", "Prácticas"]

const nivelesExperiencia = ["Junior", "Mid-Level", "Senior", "Director"]

const rubrosLaborales = [
  "Administración",
  "Almacenamiento",
  "Apoyo de Oficina",
  "Banca | Servicios Financieros",
  "Call Center",
  "Compras",
  "Finanzas | Contabilidad | Auditoría",
  "Informática | Internet",
  "Mantenimiento",
  "Mercadeo | Ventas",
  "Operaciones | Logística",
  "Producción | Ingeniería | Calidad",
  "Publicidad | Comunicaciones | Servicios",
  "Puestos Profesionales",
  "Recursos Humanos",
  "Restaurantes",
  "Salud",
  "Telecomunicaciones",
  "Varios",
]

function stripMarkdown(text) {
  if (!text) return ""
  return text
    .replace(/#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function VacanteFormModal({ vacante = null, onClose, onSave }) {
  const isEditing = vacante !== null

  const [titulo,        setTitulo]        = useState(vacante?.title              ?? "")
  const [departamento,   setDepartamento]   = useState(vacante?.Department?.name  ?? "")
  const [ubicacion,     setUbicacion]     = useState(vacante?.location           ?? "")
  const [contrato,      setContrato]      = useState(vacante?.contract_type      ?? "")
  const [experiencia,   setExperiencia]   = useState(vacante?.experience_level   ?? "")
  const [descripcion,   setDescripcion]   = useState(vacante?.description        ?? "")
  const [requisitos,    setRequisitos]    = useState(vacante?.requirements       ?? "")
  const [salarioMin,    setSalarioMin]    = useState(vacante?.salary_min         ?? "")
  const [salarioMax,    setSalarioMax]    = useState(vacante?.salary_max         ?? "")

  const [departments,  setDepartments]  = useState([])
  const [urlEmpresa,   setUrlEmpresa]   = useState("")
  const [mostrarUrlIA, setMostrarUrlIA] = useState(false)
  const [generandoIA,  setGenerandoIA]  = useState(false)
  const [errorIA,      setErrorIA]      = useState("")

  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState("")

  useEffect(() => {
    fetchDepartments()
      .then(data => setDepartments(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message ?? "No se pudieron cargar los departamentos"))
  }, [])

  const handleGenerarIA = async () => {
    // La IA redacta a partir de los requisitos: se exigen antes de generar.
    if (!titulo.trim() || !requisitos.trim()) return
    setMostrarUrlIA(true)
    if (!urlEmpresa.trim()) return

    setGenerandoIA(true)
    setErrorIA("")
    try {
      const data = await generateJobDescription(titulo, urlEmpresa, requisitos)
      setDescripcion(stripMarkdown(data.description))
    } catch (err) {
      setErrorIA(err.message ?? "No se pudo generar la descripción. Intenta de nuevo.")
    } finally {
      setGenerandoIA(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError("")

    let dept = departments.find(d => d.name === departamento)

    // Si el departamento no existe en el tenant aún, se crea automáticamente
    if (!dept) {
      try {
        dept = await createDepartment(departamento)
        setDepartments(prev => [...prev, dept])
      } catch (err) {
        setError(err.message ?? "No se pudo crear el departamento. Intenta de nuevo.")
        setGuardando(false)
        return
      }
    }

    const body = {
      title:            titulo,
      description:      descripcion,
      requirements:     requisitos || undefined,
      location:         ubicacion || undefined,
      contract_type:    contrato || undefined,
      experience_level: experiencia || undefined,
      salary_min:       parseFloat(salarioMin) || 0,
      salary_max:       parseFloat(salarioMax) || 0,
      department_id:    dept.id,
    }

    try {
      const data = isEditing
        ? await updateJob(vacante.id, body)
        : await createJob(body)
      onSave?.(data)
    } catch (err) {
      setError(err.message ?? "No se pudo guardar la vacante. Intenta de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  const handleDescartar = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  return (
    <Modal size="lg" onClose={onClose} className="max-h-[90vh] overflow-y-auto p-8">

        {/* Header */}
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditing ? "Editar Vacante" : "Crear Nueva Vacante"}
          </h2>
          <p className="text-sm text-slate-400">
            {isEditing ? "Editar información de vacante existente" : "Completa la información del nuevo puesto"}
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>

          <Input
            label="Título del Puesto"
            required
            placeholder="Ej. Gerente de Ventas"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Departamento</label>
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                required
                className={cn(
                  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800",
                  "focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/20",
                  "transition-colors"
                )}
              >
                <option value="" disabled>Selecciona...</option>
                {rubrosLaborales.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <Input
              label="Ubicación"
              placeholder="Ej. Managua"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
            />
          </div>

          {/* Tipo de Contrato + Nivel de Experiencia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Tipo de Contrato</label>
              <select
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800",
                  "focus:border-blue-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-dark/20"
                )}
              >
                <option value="" disabled>Selecciona...</option>
                {tiposContrato.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Nivel de Experiencia</label>
              <select
                value={experiencia}
                onChange={(e) => setExperiencia(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800",
                  "focus:border-blue-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-dark/20"
                )}
              >
                <option value="">Sin especificar</option>
                {nivelesExperiencia.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Paso 1 — Requisitos: la fuente de verdad que la IA usará para redactar */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Requisitos y responsabilidades</label>
            <p className="text-xs text-slate-400">
              Escribí los requisitos y responsabilidades reales del puesto. La IA los usará para redactar la descripción.
            </p>
            <Textarea
              required
              placeholder={"Ej:\n- 2+ años con React y Node.js\n- Experiencia con bases de datos SQL\n- Nivel de inglés intermedio\n- Trabajo en equipo y comunicación efectiva"}
              value={requisitos}
              onChange={(e) => setRequisitos(e.target.value)}
              rows={5}
            />
          </div>

          {/* Paso 2 — Descripción: la IA la redacta a partir de los requisitos de arriba */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Descripción del Puesto</label>
              <button
                type="button"
                onClick={handleGenerarIA}
                disabled={generandoIA || !titulo.trim() || !requisitos.trim()}
                title={!requisitos.trim() ? "Completá los requisitos primero" : undefined}
                className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600 transition-all hover:bg-violet-100 hover:border-violet-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generandoIA
                  ? <><Loader2 className="size-3 animate-spin" /> Redactando...</>
                  : <><Sparkles className="size-3" /> Redactar con IA</>
                }
              </button>
            </div>
            <p className="text-xs text-slate-400">
              A partir del título y los requisitos que escribiste, la IA redacta una descripción profesional. Podés editarla.
            </p>

            {mostrarUrlIA && (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="URL del sitio web de la empresa (ej. https://empresa.com)"
                  value={urlEmpresa}
                  onChange={(e) => setUrlEmpresa(e.target.value)}
                  className="flex-1 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleGenerarIA}
                  disabled={generandoIA || !urlEmpresa.trim()}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-40"
                >
                  {generandoIA ? <Loader2 className="size-3.5 animate-spin" /> : "Generar"}
                </button>
              </div>
            )}
            {errorIA && <p className="text-xs text-red-500">{errorIA}</p>}

            <Textarea
              placeholder="La descripción generada por la IA aparecerá acá. Podés editarla libremente."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={8}
            />
          </div>

          {/* Rango Salarial */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Rango Salarial
              <span className="ml-1 text-xs text-slate-400">(NIO)</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Mínimo"
                type="number"
                min="0"
                value={salarioMin}
                onChange={(e) => setSalarioMin(e.target.value)}
              />
              <Input
                placeholder="Máximo"
                type="number"
                min="0"
                value={salarioMax}
                onChange={(e) => setSalarioMax(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleDescartar}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={guardando}>
              {guardando
                ? <><Loader2 className="size-3.5 animate-spin mr-1" /> Guardando...</>
                : isEditing ? "Guardar Cambios" : "Guardar Vacante"
              }
            </Button>
          </div>

        </form>
    </Modal>
  )
}
