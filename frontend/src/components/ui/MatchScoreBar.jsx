import { cn } from "@/lib/utils"
import { matchScoreAPorcentaje } from "@/lib/matchScore"

export function MatchScoreBar({ score, showLabel = true, variant = "gradient", className }) {
  const pct = matchScoreAPorcentaje(score)

  const fillClass = variant === "solid"
    ? "bg-violet-600 transition-all duration-700"
    : "bg-gradient-to-r from-blue-dark to-teal-light"

  const bar = (
    <div className={cn("h-1.5 rounded-full bg-slate-100 overflow-hidden", showLabel ? "w-20" : "w-full", className)}>
      <div className={cn("h-full rounded-full", fillClass)} style={{ width: `${pct ?? 0}%` }} />
    </div>
  )

  if (!showLabel) return bar

  return (
    <div className="flex items-center gap-2">
      {bar}
      <span className="text-sm font-medium text-slate-700">
        {pct == null ? "Sin analizar" : `${pct}%`}
      </span>
    </div>
  )
}
