import { apiFetch } from "./client"
import { formatearPeriodo } from "@/lib/fechas"

const TALENT = import.meta.env.VITE_TALENT_SERVICE_URL

// El backend guarda la etapa como enum en español/minúscula (status).
// La UI usa los labels de StageBadge. Traducimos backend → UI al leer.
const ETAPA_UI = {
  postulado:      "Recibido",
  revisando:      "Analizado",
  entrevista:     "Bajo Entrevista",
  seleccionado:   "Seleccionado",
  oferta_enviada: "Oferta Enviada",
  contratado:     "Contratado",
  rechazado:      "Rechazado",
}

export const updateApplicationStage = (applicationId, stage) =>
  apiFetch(`${TALENT}/api/v1/talents/applications/${applicationId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  })

// El endpoint es público, pero si el candidato tiene sesión se manda el token
// para que el backend ligue la postulación a su cuenta. apiFetch omite la
// cabecera cuando no hay token, así que el flujo anónimo sigue funcionando.
export const applyPublic = (formData) =>
  apiFetch(`${TALENT}/api/v1/talents/public/apply`, {
    method: "POST",
    body: formData,
  })

// Perfil completo de una postulación: experiencia, educación, habilidades y CV.
export async function fetchApplicationDetails(applicationId) {
  const data = await apiFetch(`${TALENT}/api/v1/talents/applications/${applicationId}`)
  return {
    nombre:      data.candidate_name,
    email:       data.email,
    ciudad:      data.location,
    headline:    data.headline,
    // resume_url viene como ruta relativa (/uploads/cvs/...) que el talent-service
    // sirve como estático; se arma la URL absoluta para poder descargarlo.
    cvUrl:       data.resume_url ? `${TALENT}${data.resume_url}` : "",
    etapa:       ETAPA_UI[data.stage] ?? data.stage,
    score:       data.match_score,
    experiencias: (data.work_experiences ?? []).map((exp) => ({
      id:      exp.id,
      puesto:  exp.job_title,
      empresa: exp.company_name,
      periodo: formatearPeriodo(exp.start_date, exp.end_date, exp.is_current),
    })),
    educaciones: (data.educations ?? []).map((edu) => ({
      id:          edu.id,
      titulo:      [edu.degree, edu.field_of_study].filter(Boolean).join(" — "),
      institucion: edu.institution,
      periodo:     formatearPeriodo(edu.start_date, edu.end_date, edu.is_current),
    })),
    habilidades: (data.skills ?? []).map((s) => ({ id: s.id, nombre: s.name })),
  }
}

// Historial real de etapas por las que pasó una postulación.
export async function fetchApplicationHistory(applicationId) {
  const data = await apiFetch(`${TALENT}/api/v1/talents/applications/${applicationId}/history`)
  return (data.history ?? []).map((h) => ({
    etapa: ETAPA_UI[h.stage] ?? h.stage,
    fecha: h.changed_at,
  }))
}

// Lista de postulaciones del tenant, ya mapeada al shape que usa la UI.
export async function fetchApplications(tenantId) {
  const data = await apiFetch(`${TALENT}/api/v1/talents/applications?tenant_id=${tenantId}`)
  return data.map((app) => ({
    id:             app.application_id,
    application_id: app.application_id,   // se conserva para el PATCH de etapa
    nombre:         app.candidate_name,
    email:          app.email,
    posicion:       app.job_title,
    area:           app.area,             // departamento de la vacante
    reclutador:     app.recruiter,        // quien publicó la vacante
    etapa:          ETAPA_UI[app.stage] ?? app.stage,
    score:          app.match_score,      // el backend ya lo devuelve en 0-100
  }))
}
