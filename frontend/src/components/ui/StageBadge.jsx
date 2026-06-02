import { cn } from "@/lib/utils"

const stageConfig = {
  Recibido: {
    label: "Recibido",
    className: "border border-slate-300 text-slate-600 bg-transparent",
  },
  Analizado: {
    label: "Analizado",
    className: "bg-blue-dark text-white border-transparent",
  },
  Seleccionado: {
    label: "Seleccionado",
    className: "bg-teal-light text-white border-transparent",
  },
  "Bajo Entrevista": {
    label: "Bajo Entrevista",
    className: "bg-purple-dark text-white border-transparent",
  },
  "Oferta Enviada": {
    label: "Oferta Enviada",
    className: "bg-blue-light text-white border-transparent",
  },
  Contratado: {
    label: "Contratado",
    className: "bg-teal-dark text-white border-transparent",
  },
  Rechazado: {
    label: "Rechazado",
    className: "bg-red-500 text-white border-transparent",
  },
}

export function StageBadge({ stage, className }) {
  const config = stageConfig[stage]

  if (!config) return null

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

// Etapas del pipeline lineal (selector de etapa, timeline de proceso).
// "Rechazado" es un estado terminal fuera del flujo, por eso no va acá.
export const STAGES = [
  "Recibido",
  "Analizado",
  "Seleccionado",
  "Bajo Entrevista",
  "Oferta Enviada",
  "Contratado",
]
