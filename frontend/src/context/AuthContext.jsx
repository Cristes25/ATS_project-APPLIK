import { createContext, useState, useContext, useEffect } from "react"
import { getMe, logoutApi } from "@/api/auth"
import { decodeToken } from "@/lib/token"

const AuthContext = createContext()

const AVATAR_COLORS = {
  aplicante: "from-purple-500 to-purple-700",
  reclutador: "from-blue-500 to-blue-700",
  admin:      "from-blue-500 to-blue-700",
}

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("applik_token")
    if (!token) { setLoading(false); return }

    getMe()
      .then(({ data }) => {
        const role = parseRole(token)
        const companyId = parseCompanyId(token)
        if (companyId) localStorage.setItem("applik_tenant_id", companyId)
        setUser({ ...data, role, avatar_color: AVATAR_COLORS[role] ?? AVATAR_COLORS.aplicante })
      })
      .catch(() => {
        localStorage.removeItem("applik_token")
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (tokenOrUser) => {
    if (typeof tokenOrUser === "object") {
      setUser(tokenOrUser)
      return
    }
    localStorage.setItem("applik_token", tokenOrUser)
    const { data } = await getMe()
    const role = parseRole(tokenOrUser)
    const companyId = parseCompanyId(tokenOrUser)
    if (companyId) localStorage.setItem("applik_tenant_id", companyId)
    setUser({ ...data, role, avatar_color: AVATAR_COLORS[role] ?? AVATAR_COLORS.aplicante })
  }

  const logout = async () => {
    const token = localStorage.getItem("applik_token")
    if (token) logoutApi().catch(() => {})
    localStorage.removeItem("applik_token")
    setUser(null)
  }

  const updateUser = (datosNuevos) => {
    setUser((prev) => prev ? { ...prev, ...datosNuevos } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

function parseRole(token) {
  return decodeToken(token)?.role ?? "aplicante"
}

function parseCompanyId(token) {
  return decodeToken(token)?.company_id ?? null
}
