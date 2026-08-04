// Formato del salario de una vacante para la UI.
// Devuelve "A convenir" cuando es negociable o no hay rango cargado;
// si no, el rango con su moneda (ej. "25.000 – 30.000 NIO").
export function formatearSalario(vacante) {
  if (vacante?.salary_negotiable) return "A convenir"
  const min = Number(vacante?.salary_min) || 0
  const max = Number(vacante?.salary_max) || 0
  if (!min && !max) return "A convenir"
  const moneda = vacante?.currency || "NIO"
  return `${min.toLocaleString("es")} – ${max.toLocaleString("es")} ${moneda}`
}
