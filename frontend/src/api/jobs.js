import { apiFetch } from "./client"

const JOB = import.meta.env.VITE_JOB_SERVICE_URL

export async function fetchJobs() {
  const data = await apiFetch(`${JOB}/api/v1/jobs`)
  return Array.isArray(data.data) ? data.data : data
}

export const fetchJobStats = () =>
  apiFetch(`${JOB}/api/v1/jobs/stats`)

export const fetchJobById = (id) =>
  apiFetch(`${JOB}/api/v1/jobs/${id}`)

export const createJob = (body) =>
  apiFetch(`${JOB}/api/v1/jobs`, { method: "POST", body: JSON.stringify(body) })

export const updateJob = (id, body) =>
  apiFetch(`${JOB}/api/v1/jobs/${id}`, { method: "PATCH", body: JSON.stringify(body) })

export const deleteJob = (id) =>
  apiFetch(`${JOB}/api/v1/jobs/${id}`, { method: "DELETE" })

export const fetchDepartments = () =>
  apiFetch(`${JOB}/api/v1/departments`)

export const createDepartment = (name) =>
  apiFetch(`${JOB}/api/v1/departments`, { method: "POST", body: JSON.stringify({ name }) })

export async function fetchPublicJobs(tenantId) {
  const token = localStorage.getItem("applik_token")
  const data = await apiFetch(`${JOB}/api/v1/jobs/public?tenant_id=${tenantId}`, { auth: !!token })
  return Array.isArray(data.data) ? data.data : data
}

export const fetchPublicJobById = (id) =>
  apiFetch(`${JOB}/api/v1/jobs/public/${id}`, { auth: false })
