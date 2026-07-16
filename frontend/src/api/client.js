export async function apiFetch(url, { auth = true, ...options } = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers }
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
