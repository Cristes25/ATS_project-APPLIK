// Rango en que el backend entrega applications.match_score.
// Ajustar cuando se confirme con el backend:
//   100 → datos mock actuales (0-100)
//     1 → similitud coseno del AI Bridge (0-1)
//     2 → rango del SRS con W_bias (0-2)
export const ESCALA_MATCH = 100

// Convierte un match_score crudo a porcentaje 0-100 para la UI.
// Devuelve null cuando el candidato aún no tiene score (sin analizar).
export function matchScoreAPorcentaje(score) {
  if (score == null || Number.isNaN(Number(score))) return null
  const pct = (Number(score) / ESCALA_MATCH) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}
