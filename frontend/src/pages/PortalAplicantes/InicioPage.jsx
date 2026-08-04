import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Search, Clock, ChevronLeft, ChevronRight, Building2, Sparkles } from "lucide-react"
import { fetchPublicJobs } from "@/api/jobs"
import { getTenantId } from "@/lib/token"
import { matchScoreAPorcentaje } from "@/lib/matchScore"
import { formatearSalario } from "@/lib/salario"
import { Avatar } from "@/components/ui/Avatar"

import dominusCan    from "@/assets/partners/dominus-can.jpg.jpeg"
import elGolazo      from "@/assets/partners/el-golazo.jpg.jpeg"
import tlaLogistics  from "@/assets/partners/tla-logistics.jpg.jpeg"
import ucaSjrc       from "@/assets/partners/uca-sjrc.jpg.jpeg"
import silvioArtola  from "@/assets/partners/silvio-artola.png.jpeg"
import neuropasitos  from "@/assets/partners/neuropasitos.png.jpeg"
import clinicaSanta  from "@/assets/partners/clinica-santamaria.jpg.jpeg"
import nicashoe      from "@/assets/partners/nicashoe.png.jpeg"

const empresas = [
  { nombre: "Dominus Can",          logo: dominusCan   },
  { nombre: "Tienda El Golazo",     logo: elGolazo     },
  { nombre: "Grupo TLA Logistics",  logo: tlaLogistics },
  { nombre: "UCA SJRC R.L",         logo: ucaSjrc      },
  { nombre: "Silvio Artola",        logo: silvioArtola },
  { nombre: "Neuropasitos",         logo: neuropasitos },
  { nombre: "Clínica Santamaría",   logo: clinicaSanta },
  { nombre: "Nicashoe",             logo: nicashoe     },
]
// ─── Página principal ─────────────────────────────────────────────────────────

function useEmpresasVisibles() {
  const getVisibles = () =>
    window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4
  const [visibles, setVisibles] = useState(getVisibles)
  useEffect(() => {
    const onResize = () => setVisibles(getVisibles())
    window.addEventListener("resize", onResize, { passive: true })
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return visibles
}

export default function InicioPage() {
  const navigate    = useNavigate()
  const [searchParams]  = useSearchParams()
  const [busqueda,   setBusqueda]   = useState("")
  const [inputFocus, setInputFocus] = useState(false)
  const [empresaIdx, setEmpresaIdx] = useState(0)
  const [jobs,       setJobs]       = useState([])
  const [cargando,   setCargando]   = useState(false)
  const [error,      setError]      = useState("")

  const empresasVisibles = useEmpresasVisibles()

  useEffect(() => {
    const tenantId = getTenantId() ?? searchParams.get("empresa")
    if (!tenantId) return
    setCargando(true)
    fetchPublicJobs(tenantId)
      .then(setJobs)
      .catch(err => setError(err.message ?? "No se pudieron cargar las vacantes"))
      .finally(() => setCargando(false))
  }, [])

  const handleBuscar = () => {
    const params = new URLSearchParams()
    if (busqueda) params.set("q", busqueda)
    navigate(`/trabajos?${params.toString()}`)
  }


  return (
    <div className="space-y-8 sm:space-y-12 pb-16">

{/* ── Hero + Buscador ── */}
      <section className="relative text-center rounded-2xl">

        {/* Contenido encima del parallax */}
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-800 sm:text-4xl">
            Encuentra tu próximo trabajo
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Descubre oportunidades que coinciden con tu perfil.
          </p>

          {/* Buscador */}
          <div className={`mx-auto mt-6 max-w-lg rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
            inputFocus ? "border-violet-400 shadow-violet-100 shadow-md" : "border-slate-200"
          }`}>

            {/* Input texto */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Search className={`size-4 shrink-0 transition-colors duration-200 ${inputFocus ? "text-violet-500" : "text-slate-400"}`} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onFocus={() => setInputFocus(true)}
                onBlur={() => setInputFocus(false)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                placeholder="Buscar tu trabajo ideal..."
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="p-3">
              <button
                onClick={handleBuscar}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      </section>


      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* ── Coincidencias ── */}
      <section>
        <h2 className="text-lg font-bold text-slate-800">Vacantes destacadas</h2>
        <p className="mb-4 text-sm text-slate-400">Explora las oportunidades publicadas</p>

        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-400">No hay vacantes disponibles</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {jobs.slice(0, 10).map((job) => {
              const dept   = job.Department?.name ?? "—"
              const salary = formatearSalario(job)
              return (
                <div
                  key={job.id}
                  className="shrink-0 w-56 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-violet-200 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-3 flex-1">
                    <Avatar name={dept} shape="square" className="size-14 text-xl" />
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight">{job.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Building2 className="size-3" /> {dept}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="size-3" /> {salary}
                      </div>
                    </div>
                  </div>
                  {matchScoreAPorcentaje(job.match_score) != null && (
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1">
                      <Sparkles className="size-3 shrink-0 text-teal-500" />
                      <span className="text-xs text-teal-600">{matchScoreAPorcentaje(job.match_score)}% compatible</span>
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/trabajo/${job.public_token}`)}
                    className="w-full rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:scale-[0.98] mt-auto"
                  >
                    Ver detalles
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Últimas Ofertas Publicadas ── */}
      <section>
        <h2 className="text-lg font-bold text-slate-800">Ultimas Ofertas Publicadas</h2>
        <p className="mb-4 text-sm text-slate-400">Descubre las últimas oportunidades publicadas</p>

        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-400">No hay vacantes disponibles</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {jobs.slice(0, 4).map((job) => {
              const dept   = job.Department?.name ?? "—"
              const salary = formatearSalario(job)
              return (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-violet-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={dept} shape="square" className="size-14 text-xl" />
                    <div>
                      <h3 className="font-semibold text-slate-800">{job.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Building2 className="size-3" /> {dept}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="size-3" /> {salary}
                      </div>
                    </div>
                  </div>
                  {matchScoreAPorcentaje(job.match_score) != null && (
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1">
                      <Sparkles className="size-3 shrink-0 text-teal-500" />
                      <span className="text-xs text-teal-600">{matchScoreAPorcentaje(job.match_score)}% compatible</span>
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/trabajo/${job.public_token}`)}
                    className="w-full rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Ver detalles
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Empresas Destacadas ── */}
      <section>
        <h2 className="text-lg font-bold text-slate-800">Empresas Destacadas</h2>
        <p className="mb-6 text-sm text-slate-400">Empresas que confían en APPLIK</p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setEmpresaIdx((i) => (i - 1 + empresas.length) % empresas.length)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-violet-300 hover:text-violet-600"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex flex-1 gap-4 overflow-hidden">
            {Array.from({ length: empresasVisibles }, (_, i) => empresas[(empresaIdx + i) % empresas.length]).map((e, i) => (
              <div
                key={`${e.nombre}-${i}`}
                className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white py-4 px-3 shadow-sm"
                style={{ minHeight: 80 }}
              >
                <img
                  src={e.logo}
                  alt={e.nombre}
                  className="max-h-12 max-w-full object-contain"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setEmpresaIdx((i) => (i + 1) % empresas.length)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-violet-300 hover:text-violet-600"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

    </div>
  )
}
