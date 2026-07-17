// El backend entrega fechas DATEONLY ("YYYY-MM-DD"). Se extrae el año del string
// en vez de construir un Date: parsearlo daría el año anterior en zonas UTC negativas.
const anio = (fecha) => (fecha ? String(fecha).slice(0, 4) : null)

// Arma el periodo de una experiencia o estudio: "2019 – 2022", "2022 – Presente".
export function formatearPeriodo(inicio, fin, esActual) {
  const desde = anio(inicio)
  const hasta = esActual ? "Presente" : anio(fin)

  if (!desde && !hasta) return ""
  if (!desde) return String(hasta)
  if (!hasta) return String(desde)
  return `${desde} – ${hasta}`
}
