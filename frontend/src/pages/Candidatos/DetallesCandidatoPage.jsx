import { useState, useEffect } from "react"
import { ArrowLeft, Download, CheckCircle2, Clock, Circle, Loader2 } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { StageBadge, STAGES } from "@/components/ui/StageBadge"
import { Button } from "@/components/ui/button"
import { matchScoreAPorcentaje } from "@/lib/matchScore"
import { fetchApplicationDetails, fetchApplicationHistory, fetchApplicationNotes, addApplicationNote } from "@/api/talent"

const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" })

const formatearFechaHora = (fecha) =>
  new Date(fecha).toLocaleString("es-NI", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

// El CV solo es descargable si el backend guardó una URL absoluta (S3).
const esDescargable = (url) => Boolean(url) && /^https?:\/\//.test(url)

function Seccion({ titulo, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-slate-800">{titulo}</h2>
      {children}
    </div>
  )
}

function SinDatos({ children }) {
  return <p className="text-sm text-slate-400">{children}</p>
}

export default function DetallesCandidatoPage({ candidato, onBack, onActualizarEtapa, onDescartar }) {
  const [detalle,   setDetalle]   = useState(null)
  const [historial, setHistorial] = useState([])
  const [notas,     setNotas]     = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState("")

  const [nuevaNota,    setNuevaNota]    = useState("")
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [errorNota,    setErrorNota]    = useState("")

  const applicationId = candidato?.application_id

  useEffect(() => {
    if (!applicationId) { setCargando(false); return }
    let vigente = true
    setCargando(true)
    setError("")

    Promise.all([
      fetchApplicationDetails(applicationId),
      // El historial y las notas son complementarios: si fallan, la ficha igual se muestra.
      fetchApplicationHistory(applicationId).catch(() => []),
      fetchApplicationNotes(applicationId).catch(() => []),
    ])
      .then(([datos, etapas, notasData]) => {
        if (!vigente) return
        setDetalle(datos)
        setHistorial(etapas)
        setNotas(notasData)
      })
      .catch((err) => {
        if (vigente) setError(err.message ?? "No se pudo cargar el perfil del candidato")
      })
      .finally(() => { if (vigente) setCargando(false) })

    return () => { vigente = false }
  }, [applicationId])

  const handleAgregarNota = async () => {
    const texto = nuevaNota.trim()
    if (!texto || guardandoNota) return
    setGuardandoNota(true)
    setErrorNota("")
    try {
      const nota = await addApplicationNote(applicationId, texto)
      setNotas((prev) => [nota, ...prev])   // el backend las ordena por fecha desc
      setNuevaNota("")
    } catch (err) {
      setErrorNota(err.message ?? "No se pudo guardar la nota")
    } finally {
      setGuardandoNota(false)
    }
  }

  if (!candidato) return null

  // Mientras carga el detalle se usan los datos que ya trae la lista.
  const nombre   = detalle?.nombre ?? candidato.nombre
  const email    = detalle?.email  ?? candidato.email
  const etapa    = detalle?.etapa  ?? candidato.etapa
  const scorePct = matchScoreAPorcentaje(detalle?.score ?? candidato.score)
  const fechaPorEtapa = Object.fromEntries(historial.map((h) => [h.etapa, h.fecha]))

  return (
    <div className="min-h-screen bg-applik-bg p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>

        {/* Header card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={nombre} size="lg" />
              <div>
                <h1 className="text-xl font-bold text-slate-800">{nombre}</h1>
                <p className="text-sm text-slate-500">{detalle?.headline ?? candidato.posicion}</p>
                <p className="text-xs text-slate-400">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              <Button variant="destructive" size="sm" onClick={onDescartar} className="flex-1 sm:flex-none">
                Descartar
              </Button>
              <Button variant="primary" size="md" onClick={onActualizarEtapa} className="flex-1 sm:flex-none">
                Manejar Aplicación
              </Button>
            </div>
          </div>

          {/* Match Score */}
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div>
              <p className="text-xs text-slate-400">Match Score</p>
              <p className="text-2xl font-bold text-blue-dark">
                {scorePct == null ? "Sin analizar" : `${scorePct}%`}
              </p>
            </div>
            <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-dark to-teal-light"
                style={{ width: `${scorePct ?? 0}%` }}
              />
            </div>
            <StageBadge stage={etapa} />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {cargando ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-20 shadow-sm">
            <Loader2 className="size-5 animate-spin text-violet-500" />
            <p className="text-sm text-slate-400">Cargando perfil del candidato...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Izquierda — Experiencia + Educación */}
            <div className="space-y-6 lg:col-span-2">

              <Seccion titulo="Experiencia Laboral">
                {detalle?.experiencias?.length > 0 ? (
                  <div className="space-y-4">
                    {detalle.experiencias.map((exp) => (
                      <div key={exp.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                        <p className="font-medium text-slate-800">{exp.puesto}</p>
                        <p className="text-sm text-slate-500">{exp.empresa}</p>
                        <p className="text-xs text-slate-400">{exp.periodo}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <SinDatos>La IA no extrajo experiencia laboral de este CV.</SinDatos>
                )}
              </Seccion>

              <Seccion titulo="Educación">
                {detalle?.educaciones?.length > 0 ? (
                  <div className="space-y-4">
                    {detalle.educaciones.map((edu) => (
                      <div key={edu.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                        <p className="font-medium text-slate-800">{edu.titulo}</p>
                        <p className="text-sm text-slate-500">{edu.institucion}</p>
                        <p className="text-xs text-slate-400">{edu.periodo}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <SinDatos>La IA no extrajo estudios de este CV.</SinDatos>
                )}
              </Seccion>

              <Seccion titulo="Notas del reclutador">
                <div className="space-y-2">
                  <textarea
                    value={nuevaNota}
                    onChange={(e) => { setNuevaNota(e.target.value); setErrorNota("") }}
                    placeholder="Agrega una observación sobre este candidato..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-dark focus:outline-none focus:ring-2 focus:ring-blue-dark/20"
                  />
                  {errorNota && <p className="text-xs text-red-500">{errorNota}</p>}
                  <div className="flex justify-end">
                    <Button variant="primary" size="sm" onClick={handleAgregarNota} disabled={!nuevaNota.trim() || guardandoNota}>
                      {guardandoNota
                        ? <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" /> Guardando...</span>
                        : "Agregar nota"}
                    </Button>
                  </div>
                </div>

                {notas.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {notas.map((n) => (
                      <div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                        <p className="text-sm text-slate-700 whitespace-pre-line">{n.texto}</p>
                        <p className="mt-1.5 text-xs text-slate-400">{n.autor} · {formatearFechaHora(n.fecha)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">Todavía no hay notas para este candidato.</p>
                )}
              </Seccion>

            </div>

            {/* Derecha — Info + Habilidades + Historial + CV */}
            <div className="space-y-6">

              <Seccion titulo="Información">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ciudad</span>
                    <span className="text-slate-700">{detalle?.ciudad || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email</span>
                    <span className="text-slate-700 truncate ml-2">{email || "—"}</span>
                  </div>
                </div>
              </Seccion>

              <Seccion titulo="Habilidades">
                {detalle?.habilidades?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detalle.habilidades.map((skill) => (
                      <span key={skill.id} className="rounded-full bg-blue-dark/10 px-3 py-1 text-xs text-blue-dark">
                        {skill.nombre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <SinDatos>La IA no extrajo habilidades de este CV.</SinDatos>
                )}
              </Seccion>

              {/* Timeline con el historial real de etapas */}
              <Seccion titulo="Historial de Proceso">
                <div className="relative">
                  {STAGES.map((nombreEtapa, i) => {
                    const fecha      = fechaPorEtapa[nombreEtapa]
                    const esActual   = nombreEtapa === etapa
                    const completada = Boolean(fecha) && !esActual
                    const pendiente  = !fecha && !esActual

                    return (
                      <div key={nombreEtapa} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                            esActual   ? "border-violet-500 bg-violet-500"
                            : completada ? "border-teal-500 bg-teal-500"
                            : "border-slate-200 bg-white"
                          }`}>
                            {esActual   && <div className="size-2 rounded-full bg-white" />}
                            {completada && <CheckCircle2 className="size-3.5 text-white" />}
                            {pendiente  && <Circle className="size-3 text-slate-300" />}
                          </div>
                          {i < STAGES.length - 1 && (
                            <div className={`w-0.5 flex-1 my-1 min-h-[20px] ${completada ? "bg-teal-200" : "bg-slate-100"}`} />
                          )}
                        </div>

                        <div className="pb-4 flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${
                            esActual ? "text-violet-700" : completada ? "text-slate-700" : "text-slate-300"
                          }`}>
                            {nombreEtapa}
                            {esActual && <span className="ml-2 text-xs font-normal text-violet-400">actual</span>}
                          </p>
                          {fecha && (
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="size-3" /> {formatearFecha(fecha)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Seccion>

              <Seccion titulo="CV">
                {esDescargable(detalle?.cvUrl) ? (
                  <a
                    href={detalle.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Download className="size-4" /> Descargar CV
                  </a>
                ) : (
                  <SinDatos>El archivo original no está disponible. El contenido del CV ya fue procesado por la IA.</SinDatos>
                )}
              </Seccion>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
