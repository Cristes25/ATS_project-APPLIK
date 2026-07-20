import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Search, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  User, SlidersHorizontal, ArrowLeft, Building2, CheckCircle2, Sparkles,
} from "lucide-react"
import { fetchPublicJobs } from "@/api/jobs"
import { getTenantId } from "@/lib/token"
import { matchScoreAPorcentaje } from "@/lib/matchScore"

const ordenOpciones = ["Más recientes", "Más relevantes", "Mayor salario"]

const POR_PAGINA = 6

// ─── Dropdown de ordenamiento (portal) ───────────────────────────────────────

function OrdenarDropdown({ valor, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos]         = useState({ top: 0, left: 0, width: 0 })
  const triggerRef  = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (
        triggerRef.current  && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setAbierto(false)
    }
    const handleScroll = () => setAbierto(false)
    document.addEventListener("mousedown", handleClick)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      document.removeEventListener("mousedown", handleClick)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const handleToggle = () => {
    if (!abierto && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const dropWidth = Math.max(rect.width, 180)
      const rawLeft = rect.left
      const clampedLeft = Math.min(rawLeft, window.innerWidth - dropWidth - 8)
      setPos({ top: rect.bottom + 4, left: Math.max(8, clampedLeft), width: dropWidth })
    }
    setAbierto(!abierto)
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-all hover:border-slate-300"
      >
        <span>{valor}</span>
        <ChevronDown className={`size-4 text-slate-400 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 rounded-xl border border-slate-100 bg-white py-1 shadow-lg animate-dropdown"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {ordenOpciones.map((o, i) => (
            <button
              key={o}
              onClick={() => { onChange(o); setAbierto(false) }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors animate-fadeItem ${
                valor === o ? "bg-violet-600 text-white font-semibold rounded-lg mx-1 w-[calc(100%-8px)]" : "text-slate-600 hover:bg-slate-50"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span>{o}</span>
              {valor === o && <CheckCircle2 className="size-4" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Sección de filtro en sidebar ─────────────────────────────────────────────

function FiltroSeccion({ titulo, opciones, seleccionados, onToggle }) {
  const [abierto, setAbierto] = useState(true)

  if (opciones.length === 0) return null

  return (
    <div className="border-b border-slate-100 py-4">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-800"
      >
        {titulo}
        <ChevronDown className={`size-4 text-slate-400 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="mt-3 space-y-2">
          {opciones.map((op) => (
            <label key={op} className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => onToggle(op)}
                className={`size-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  seleccionados.includes(op)
                    ? "border-violet-600 bg-violet-600"
                    : "border-slate-300 group-hover:border-violet-400"
                }`}
              >
                {seleccionados.includes(op) && <div className="size-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-slate-600">{op}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar de filtros ───────────────────────────────────────────────────────

const ETIQUETAS_FILTRO = {
  categorias:  "Categoría",
  ubicaciones: "Ubicación",
  modalidades: "Modalidad",
  niveles:     "Nivel de Experiencia",
}

function SidebarFiltros({ opciones, filtros, onToggle, onLimpiar }) {
  const hayFiltros = Object.values(filtros).some((sel) => sel.length > 0)
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">Filtros</h2>
        {hayFiltros && (
          <button onClick={onLimpiar} className="text-xs font-medium text-violet-600 hover:text-violet-700">
            Limpiar
          </button>
        )}
      </div>
      {Object.entries(opciones).map(([clave, ops]) => (
        <FiltroSeccion
          key={clave}
          titulo={ETIQUETAS_FILTRO[clave]}
          opciones={ops}
          seleccionados={filtros[clave]}
          onToggle={(v) => onToggle(clave, v)}
        />
      ))}
    </div>
  )
}

// ─── Card de trabajo ──────────────────────────────────────────────────────────

function JobCard({ job }) {
  const navigate = useNavigate()
  const destino  = job.public_token ? `/trabajo/${job.public_token}` : `/trabajo/${job.id}`
  // El backend solo calcula la compatibilidad si el candidato está autenticado.
  const compatibilidad = matchScoreAPorcentaje(job.match_score)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-violet-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-14 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <User className="size-6 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">{job.titulo ?? job.title}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="size-3.5 shrink-0" />
              <span>{job.empresa ?? job.Department?.name ?? "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="size-3.5 shrink-0" />
              <span>Nicaragua</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(destino)}
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Ver detalles
        </button>
      </div>

      {compatibilidad != null && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5">
          <Sparkles className="size-3.5 shrink-0 text-teal-500" />
          <span className="text-xs text-teal-600">Compatibilidad: {compatibilidad}%</span>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function TrabajosPage() {
  const [searchParams]    = useSearchParams()
  const [busqueda,        setBusqueda]        = useState(searchParams.get("q") || "")
  const [inputFocus,      setInputFocus]      = useState(false)
  const [orden,           setOrden]           = useState("Más recientes")
  const [pagina,          setPagina]          = useState(1)
  const [filtrosMobile,   setFiltrosMobile]   = useState(false)
  const [vacantesReales,  setVacantesReales]  = useState([])
  const [cargando,        setCargando]        = useState(false)
  const [error,           setError]           = useState("")

  const [filtros, setFiltros] = useState({ categorias: [], ubicaciones: [], modalidades: [], niveles: [] })

  useEffect(() => {
    const tenantId = getTenantId() ?? searchParams.get("empresa")
    if (!tenantId) return
    setCargando(true)
    fetchPublicJobs(tenantId)
      .then(setVacantesReales)
      .catch(err => setError(err.message ?? "No se pudieron cargar las vacantes"))
      .finally(() => setCargando(false))
  }, [])

  // Opciones de cada filtro derivadas de los valores reales de las vacantes.
  // FiltroSeccion se auto-oculta si la lista viene vacía (campo aún sin datos).
  const opciones = {
    categorias:  [...new Set(vacantesReales.map((j) => j.Department?.name).filter(Boolean))].sort(),
    ubicaciones: [...new Set(vacantesReales.map((j) => j.location).filter(Boolean))].sort(),
    modalidades: [...new Set(vacantesReales.map((j) => j.contract_type).filter(Boolean))].sort(),
    niveles:     [...new Set(vacantesReales.map((j) => j.experience_level).filter(Boolean))].sort(),
  }

  // El filtrado es instantáneo: al seleccionar una opción se aplica y se vuelve
  // a la primera página, sin botón de "aplicar".
  const toggleFiltro = (clave, valor) => {
    setPagina(1)
    setFiltros((prev) => {
      const arr = prev[clave]
      return {
        ...prev,
        [clave]: arr.includes(valor) ? arr.filter((v) => v !== valor) : [...arr, valor],
      }
    })
  }

  const limpiarFiltros = () => {
    setPagina(1)
    setFiltros({ categorias: [], ubicaciones: [], modalidades: [], niveles: [] })
  }

  const resultados = vacantesReales.filter((j) => {
    const titulo  = j.titulo ?? j.title ?? ""
    const empresa = j.empresa ?? j.Department?.name ?? ""
    const matchQ = !busqueda || titulo.toLowerCase().includes(busqueda.toLowerCase()) || empresa.toLowerCase().includes(busqueda.toLowerCase())
    const matchC = filtros.categorias.length  === 0 || filtros.categorias.includes(j.Department?.name)
    const matchU = filtros.ubicaciones.length === 0 || filtros.ubicaciones.includes(j.location)
    const matchM = filtros.modalidades.length === 0 || filtros.modalidades.includes(j.contract_type)
    const matchN = filtros.niveles.length     === 0 || filtros.niveles.includes(j.experience_level)
    return matchQ && matchC && matchU && matchM && matchN
  })

  useEffect(() => { setPagina(1) }, [busqueda, orden])

  const ordenados = [...resultados].sort((a, b) => {
    if (orden === "Más recientes") {
      const da = new Date(a.createdAt ?? 0).getTime()
      const db = new Date(b.createdAt ?? 0).getTime()
      return db - da || b.id - a.id
    }
    if (orden === "Mayor salario") {
      const sa = parseFloat(a.salary_max ?? a.salario ?? 0)
      const sb = parseFloat(b.salary_max ?? b.salario ?? 0)
      return sb - sa
    }
    // Más relevantes: por compatibilidad con el perfil del candidato.
    // Sin sesión el backend no la calcula, así que se cae al orden por id.
    return (b.match_score ?? 0) - (a.match_score ?? 0) || b.id - a.id
  })

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA))
  const paginados    = ordenados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  return (
    <div className="space-y-6 pb-16">

      {/* ── Hero + Buscador ── */}
      <section className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 sm:text-4xl">Explorar Trabajos</h1>
        <p className="mt-1 text-sm text-slate-400">Encuentra oportunidades según tu perfil e intereses</p>

        <div className="mx-auto mt-6 max-w-lg">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className={`size-4 shrink-0 transition-colors duration-200 ${inputFocus ? "text-violet-500" : "text-slate-400"}`} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onFocus={() => setInputFocus(true)}
              onBlur={() => setInputFocus(false)}
              placeholder="Buscar por puesto o empresa..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* ── Layout: sidebar + contenido ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Sidebar — solo desktop */}
        <aside className="hidden lg:block lg:w-60 shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SidebarFiltros opciones={opciones} filtros={filtros} onToggle={toggleFiltro} onLimpiar={limpiarFiltros} />
        </aside>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Barra superior: contador + botón filtros mobile + ordenar */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{resultados.length}</span> trabajos encontrados
            </p>
            <div className="flex items-center gap-2">
              {/* Botón filtros — solo mobile */}
              <button
                onClick={() => setFiltrosMobile(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 lg:hidden"
              >
                <SlidersHorizontal className="size-3.5" />
                Filtros
              </button>
              {/* Ordenar por */}
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="hidden sm:block">Ordenar por:</span>
                <OrdenarDropdown valor={orden} onChange={setOrden} />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}

          {/* Grid de trabajos */}
          {cargando ? (
            <div className="flex items-center justify-center py-20 rounded-2xl border border-slate-200 bg-white">
              <p className="text-sm text-slate-400">Cargando vacantes...</p>
            </div>
          ) : paginados.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {paginados.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-slate-200 bg-white">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-slate-100">
                <Search className="size-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700">No se encontraron resultados</p>
              <p className="mt-1 text-sm text-slate-400">Intenta con otros filtros o términos de búsqueda</p>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-violet-300 hover:text-violet-600 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPagina(n)}
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-medium transition-all ${
                    pagina === n
                      ? "bg-violet-600 text-white"
                      : "border border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-violet-300 hover:text-violet-600 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel de filtros mobile (slide-over) ── */}
      {filtrosMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setFiltrosMobile(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl flex flex-col">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
              <button onClick={() => setFiltrosMobile(false)}>
                <ArrowLeft className="size-5 text-slate-600" />
              </button>
              <h2 className="flex-1 font-semibold text-slate-800">Filtros</h2>
              {Object.values(filtros).some((sel) => sel.length > 0) && (
                <button onClick={limpiarFiltros} className="text-xs font-medium text-violet-600 hover:text-violet-700">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {Object.entries(opciones).map(([clave, ops]) => (
                <FiltroSeccion
                  key={clave}
                  titulo={ETIQUETAS_FILTRO[clave]}
                  opciones={ops}
                  seleccionados={filtros[clave]}
                  onToggle={(v) => toggleFiltro(clave, v)}
                />
              ))}
            </div>
            <div className="border-t border-slate-100 p-4">
              <button
                onClick={() => setFiltrosMobile(false)}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-700"
              >
                Ver {resultados.length} resultados
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
