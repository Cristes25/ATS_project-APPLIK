import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Users, Briefcase, UserPlus, Clock, ArrowRight } from "lucide-react"
import { StatCard, Card, CardContent } from "@/components/ui/Card"
import { Avatar } from "@/components/ui/Avatar"
import { StageBadge } from "@/components/ui/StageBadge"
import { Button } from "@/components/ui/button"
import { MatchScoreBar } from "@/components/ui/MatchScoreBar"
import { fetchJobStats, fetchJobs } from "@/api/jobs"
import { fetchApplications } from "@/api/talent"
import { getTenantId } from "@/lib/token"

const STATUS_LABEL = { published: "Activa", paused: "Pausada", closed: "Cerrada", draft: "Borrador" }

// Etapas que cuentan como "en proceso": ya pasaron el ingreso y aún no son terminales.
const ETAPAS_EN_PROCESO = ["Analizado", "Bajo Entrevista", "Seleccionado", "Oferta Enviada"]

const TOP_MATCHING = 4
const MAX_ACTIVIDAD = 5

export default function DashboardPage() {
  const navigate = useNavigate()
  const [tenantId] = useState(getTenantId)   // se lee del JWT una sola vez
  const [stats, setStats]                 = useState(null)
  const [jobs, setJobs]                   = useState([])
  const [postulaciones, setPostulaciones] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState("")

  useEffect(() => {
    Promise.all([
      fetchJobStats(),
      fetchJobs(),
      tenantId ? fetchApplications(tenantId) : Promise.resolve([]),
    ])
      .then(([s, j, apps]) => {
        setStats(s)
        setJobs(j.slice(0, 3))
        setPostulaciones(apps)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [tenantId])

  const statVal = (val) => loading ? "..." : val

  // Derivados de las postulaciones reales del tenant.
  const nuevosCandidatos = postulaciones.filter((p) => p.etapa === "Recibido").length
  const enProceso        = postulaciones.filter((p) => ETAPAS_EN_PROCESO.includes(p.etapa)).length

  // Priority Matching: mayor match score primero; los sin score analizado van al final.
  const topCandidatos = [...postulaciones]
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, TOP_MATCHING)

  // Actividad reciente: el backend ya devuelve las postulaciones por applied_at DESC.
  const actividadReciente = postulaciones.slice(0, MAX_ACTIVIDAD)

  return (
    <div className="space-y-6 bg-applik-bg min-h-screen">

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Panel Principal</h1>
        <p className="text-sm text-slate-400">Bienvenido de vuelta, aquí está el resumen de hoy</p>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Candidatos"        value={statVal(postulaciones.length)} icon={Users}    iconColor="text-blue-dark"    iconBg="bg-blue-dark/10"   />
        <StatCard label="Vacantes"          value={statVal(stats?.published)}     icon={Briefcase} iconColor="text-purple-dark" iconBg="bg-purple-dark/10" />
        <StatCard label="Nuevos Candidatos" value={statVal(nuevosCandidatos)}     icon={UserPlus} iconColor="text-teal-dark"    iconBg="bg-teal-dark/10"   />
        <StatCard label="En Proceso"        value={statVal(enProceso)}            icon={Clock}    iconColor="text-blue-light"   iconBg="bg-blue-light/10"  />
      </div>

      {/* Actividad Reciente + Posiciones Abiertas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Actividad Reciente (postulaciones recientes reales) */}
        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Actividad Reciente</h2>
              <button onClick={() => navigate("/candidatos")} className="text-xs text-blue-dark hover:underline">Ver todo</button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-400">...</p>
              ) : actividadReciente.length === 0 ? (
                <p className="text-sm text-slate-400">Aún no hay postulaciones.</p>
              ) : (
                actividadReciente.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate"><span className="font-medium text-slate-800">{p.nombre}</span> postuló a {p.posicion}</p>
                    </div>
                    <StageBadge stage={p.etapa} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posiciones Abiertas */}
        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Posiciones Abiertas</h2>
              <button onClick={() => navigate("/vacantes")} className="text-xs text-blue-dark hover:underline">Ver todo</button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-400">...</p>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-slate-400">Aún no hay vacantes.</p>
              ) : (
                jobs.map((job) => {
                  const label  = STATUS_LABEL[job.status] ?? job.status
                  const active = job.status === "published"
                  return (
                    <div key={job.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                        <p className="text-xs text-slate-400">{job.department?.name} · {job.application_count} candidatos</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        active ? "bg-teal-light/20 text-teal-dark" : "bg-slate-200 text-slate-500"
                      }`}>
                        {label}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Priority Matching (candidatos reales por match score) */}
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">Priority Matching</h2>
              <p className="text-xs text-slate-400">Candidatos con mayor compatibilidad</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate("/candidatos")}>
              Ver Candidatos <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">...</p>
          ) : topCandidatos.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay candidatos para rankear.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left text-xs font-medium text-slate-400">Candidato</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400">Posición</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400">Match Score</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400">Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  {topCandidatos.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.nombre} size="sm" />
                          <p className="font-medium text-slate-800 whitespace-nowrap">{c.nombre}</p>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 whitespace-nowrap">{c.posicion}</td>
                      <td className="py-3"><MatchScoreBar score={c.score} /></td>
                      <td className="py-3"><StageBadge stage={c.etapa} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
