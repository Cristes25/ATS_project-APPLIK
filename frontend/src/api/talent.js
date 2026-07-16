import { apiFetch } from "./client"

const TALENT = import.meta.env.VITE_TALENT_SERVICE_URL

// El backend guarda la etapa como enum en español/minúscula (status).
// La UI usa los labels de StageBadge. Traducimos backend → UI al leer.
const ETAPA_UI = {
  postulado:  "Recibido",
  revisando:  "Analizado",
  entrevista: "Bajo Entrevista",
  contratado: "Contratado",
  rechazado:  "Rechazado",
}

export const updateApplicationStage = (applicationId, stage) =>
  apiFetch(`${TALENT}/api/v1/talents/applications/${applicationId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  })

export const applyPublic = ({ rawCvText, law787Accepted, jobToken }) =>
  apiFetch(`${TALENT}/api/v1/talents/public/apply`, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ rawCvText, law787Accepted, jobToken }),
  })

// Lista de postulaciones del tenant, ya mapeada al shape que usa la UI.
export async function fetchApplications(tenantId) {
  const data = await apiFetch(`${TALENT}/api/v1/talents/applications?tenant_id=${tenantId}`)
  return data.map((app) => ({
    id:             app.application_id,
    application_id: app.application_id,   // se conserva para el PATCH de etapa
    nombre:         app.candidate_name,
    email:          app.email,
    posicion:       app.job_title,
    etapa:          ETAPA_UI[app.stage] ?? app.stage,
    score:          app.match_score,      // el backend ya lo devuelve en 0-100
  }))
}
