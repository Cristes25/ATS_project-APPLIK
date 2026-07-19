import { useState } from "react"
import { ArrowLeft, Loader2, Check } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { PasswordToggle } from "@/components/ui/PasswordToggle"
import { useAuth } from "@/context/AuthContext"
import { updateMe, changePassword } from "@/api/auth"

export default function PerfilPage({ onBack }) {
  const { user, updateUser } = useAuth()

  // Formulario de información personal
  const [nombre,        setNombre]        = useState(user?.first_name ?? "")
  const [apellido,      setApellido]      = useState(user?.last_name ?? "")
  const [guardandoInfo, setGuardandoInfo] = useState(false)
  const [errorInfo,     setErrorInfo]     = useState("")
  const [exitoInfo,     setExitoInfo]     = useState(false)

  // Formulario de contraseña
  const [contrasenaActual,    setContrasenaActual]    = useState("")
  const [contrasenaNueva,     setContrasenaNueva]     = useState("")
  const [contrasenaConfirmar, setContrasenaConfirmar] = useState("")
  const [verActual,           setVerActual]           = useState(false)
  const [verNueva,            setVerNueva]            = useState(false)
  const [verConfirmar,        setVerConfirmar]        = useState(false)
  const [guardandoPass,       setGuardandoPass]       = useState(false)
  const [errorPass,           setErrorPass]           = useState("")
  const [exitoPass,           setExitoPass]           = useState(false)

  const sinCambiosInfo = nombre === (user?.first_name ?? "") && apellido === (user?.last_name ?? "")

  const handleGuardarInfo = async (e) => {
    e.preventDefault()
    if (sinCambiosInfo) return
    setGuardandoInfo(true)
    setErrorInfo("")
    setExitoInfo(false)
    try {
      const res = await updateMe({ first_name: nombre, last_name: apellido })
      const datos = res.data ?? res
      updateUser({ ...datos, name: `${datos.first_name ?? nombre} ${datos.last_name ?? apellido}`.trim() })
      setExitoInfo(true)
    } catch (err) {
      setErrorInfo(err.message ?? "No se pudo actualizar la información")
    } finally {
      setGuardandoInfo(false)
    }
  }

  const handleCambiarContrasena = async (e) => {
    e.preventDefault()
    if (contrasenaNueva !== contrasenaConfirmar) {
      setErrorPass("Las contraseñas nuevas no coinciden")
      return
    }
    setGuardandoPass(true)
    setErrorPass("")
    setExitoPass(false)
    try {
      await changePassword({ currentPassword: contrasenaActual, newPassword: contrasenaNueva })
      setExitoPass(true)
      setContrasenaActual("")
      setContrasenaNueva("")
      setContrasenaConfirmar("")
    } catch (err) {
      setErrorPass(err.message ?? "No se pudo cambiar la contraseña")
    } finally {
      setGuardandoPass(false)
    }
  }

  const inputCls   = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-blue-dark focus:outline-none focus:ring-2 focus:ring-blue-dark/20"
  const readCls    = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
  const labelCls   = "mb-1.5 block text-sm font-medium text-slate-700"
  const primaryBtn = "rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"

  return (
    <div className="min-h-screen bg-applik-bg p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">Perfil</h1>
          <p className="text-sm text-slate-400">Administra tu información personal y contraseña</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Avatar */}
          <div className="rounded-2xl bg-white p-6 shadow-sm flex flex-col items-center gap-4">
            <Avatar name={user?.name ?? ""} size="lg" className="size-28 text-3xl" />
            <p className="font-semibold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-400 text-center">{user?.email}</p>
          </div>

          {/* Formularios */}
          <div className="space-y-6 lg:col-span-2">

            {/* Información personal */}
            <form onSubmit={handleGuardarInfo} className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <h2 className="text-base font-semibold text-slate-800">Información personal</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre</label>
                  <input
                    value={nombre}
                    onChange={(e) => { setNombre(e.target.value); setExitoInfo(false); setErrorInfo("") }}
                    required
                    minLength={2}
                    maxLength={50}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Apellido</label>
                  <input
                    value={apellido}
                    onChange={(e) => { setApellido(e.target.value); setExitoInfo(false); setErrorInfo("") }}
                    required
                    minLength={2}
                    maxLength={50}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Empresa</label>
                <input value={user?.tenant_name ?? ""} readOnly className={readCls} />
              </div>

              <div>
                <label className={labelCls}>Correo Electrónico</label>
                <input value={user?.email ?? ""} readOnly className={readCls} />
              </div>

              {errorInfo && <p className="text-xs text-red-500">{errorInfo}</p>}

              <div className="flex items-center justify-end gap-3">
                {exitoInfo && (
                  <p className="flex items-center gap-1 text-sm text-teal-600 font-medium">
                    <Check className="size-4" /> Cambios guardados
                  </p>
                )}
                <button type="submit" disabled={guardandoInfo || sinCambiosInfo} className={primaryBtn}>
                  {guardandoInfo
                    ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Guardando...</span>
                    : "Guardar cambios"
                  }
                </button>
              </div>
            </form>

            {/* Cambiar contraseña */}
            <form onSubmit={handleCambiarContrasena} className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <h2 className="text-base font-semibold text-slate-800">Cambiar contraseña</h2>

              <div>
                <label className={labelCls}>Contraseña actual</label>
                <div className="relative">
                  <input
                    type={verActual ? "text" : "password"}
                    value={contrasenaActual}
                    onChange={(e) => { setContrasenaActual(e.target.value); setExitoPass(false); setErrorPass("") }}
                    required
                    className={`${inputCls} pr-11`}
                  />
                  <PasswordToggle visible={verActual} onToggle={() => setVerActual(!verActual)} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={verNueva ? "text" : "password"}
                    value={contrasenaNueva}
                    onChange={(e) => { setContrasenaNueva(e.target.value); setExitoPass(false); setErrorPass("") }}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className={`${inputCls} pr-11`}
                  />
                  <PasswordToggle visible={verNueva} onToggle={() => setVerNueva(!verNueva)} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Confirmar nueva contraseña</label>
                <div className="relative">
                  <input
                    type={verConfirmar ? "text" : "password"}
                    value={contrasenaConfirmar}
                    onChange={(e) => { setContrasenaConfirmar(e.target.value); setExitoPass(false); setErrorPass("") }}
                    required
                    minLength={8}
                    className={`${inputCls} pr-11`}
                  />
                  <PasswordToggle visible={verConfirmar} onToggle={() => setVerConfirmar(!verConfirmar)} />
                </div>
              </div>

              {errorPass && <p className="text-xs text-red-500">{errorPass}</p>}

              <div className="flex items-center justify-end gap-3">
                {exitoPass && (
                  <p className="flex items-center gap-1 text-sm text-teal-600 font-medium">
                    <Check className="size-4" /> Contraseña actualizada
                  </p>
                )}
                <button
                  type="submit"
                  disabled={guardandoPass || !contrasenaActual || !contrasenaNueva || !contrasenaConfirmar}
                  className={primaryBtn}
                >
                  {guardandoPass
                    ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Cambiando...</span>
                    : "Cambiar contraseña"
                  }
                </button>
              </div>
            </form>

          </div>
        </div>

      </div>
    </div>
  )
}
