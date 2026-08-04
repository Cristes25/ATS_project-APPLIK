export async function apiFetch(url, { auth = true, ...options } = {}) {
  const headers = { ...options.headers }

  // Content-Type: application/json solo cuando hay body JSON. Un request sin body
  // (ej. DELETE) no debe mandarlo, porque Fastify rechaza un body vacío con ese
  // header (FST_ERR_CTP_EMPTY_JSON_BODY → 400). FormData maneja su propio boundary.
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  if (auth) {
    const token = localStorage.getItem("applik_token")
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(url, { ...options, headers })
  let data
  try { data = await res.json() } catch { data = {} }
  if (!res.ok) {
    const error = new Error(data.error ?? data.message ?? "Error del servidor")
    error.status = res.status
    throw error
  }
  return data
}
