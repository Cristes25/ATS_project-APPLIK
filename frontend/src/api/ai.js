import { apiFetch } from "./client"

const AI = import.meta.env.VITE_AI_SERVICE_URL

export const generateJobDescription = (jobTitle, companyUrl, requirements) =>
  apiFetch(`${AI}/api/v1/jobs/generate-description`, {
    method: "POST",
    body: JSON.stringify({ jobTitle, companyUrl, requirements }),
  })
