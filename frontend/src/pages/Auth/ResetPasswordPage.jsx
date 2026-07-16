import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { PasswordToggle } from "@/components/ui/PasswordToggle";
import { resetPassword } from "@/api/auth";

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [nuevaContrasena,     setNuevaContrasena]     = useState("");
    const [confirmarContrasena, setConfirmarContrasena] = useState("");
    const [showNueva,           setShowNueva]           = useState(false);
    const [showConfirmar,       setShowConfirmar]       = useState(false);
    const [loading,             setLoading]             = useState(false);
    const [error,               setError]               = useState("");
    const [exitoso,             setExitoso]             = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nuevaContrasena !== confirmarContrasena) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await resetPassword(token, nuevaContrasena);
            setExitoso(true);
        } catch (err) {
            setError(err.message || "Ocurrió un error. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row">

            {/* ── Panel izquierdo ── */}
            <div className="hidden md:flex md:w-[55%] lg:w-[58%] flex-col justify-between p-10 relative overflow-hidden"
                style={{ background: "linear-gradient(150deg, #8B7CF6 0%, #514990 60%, #1e3a65 100%)" }}>
                <div className="flex items-center gap-2.5">
                    <Logo className="w-9 h-9" />
                    <span className="text-white text-xl font-bold tracking-wide">APPLIK</span>
                </div>
                <div className="space-y-4 flex flex-col items-center text-center">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight w-full">
                        Nueva<br />contraseña
                    </h1>
                    <p className="text-purple-200 text-sm lg:text-base leading-relaxed max-w-sm">
                        Elige una contraseña segura para proteger tu cuenta.
                    </p>
                </div>
                <p className="text-purple-300 text-xs">© 2026 Applik. Plataforma de reclutamiento impulsada por IA.</p>
                <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
            </div>

            {/* ── Panel derecho ── */}
            <div className="flex-1 flex flex-col justify-center items-center bg-white px-6 py-10 sm:px-10">

                <div className="flex md:hidden flex-col items-center gap-3 mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(150deg, #8B7CF6 0%, #514990 100%)" }}>
                        <div style={{ filter: "brightness(0) invert(1)" }}><Logo className="w-9 h-9" /></div>
                    </div>
                    <span className="text-slate-900 text-xl font-bold tracking-wide">APPLIK</span>
                </div>

                <div className="w-full max-w-sm">
                    {!token ? (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Link inválido</h2>
                            <p className="text-slate-500 text-sm mb-6">
                                El enlace de recuperación no es válido o ya no funciona.
                            </p>
                            <Link to="/recuperar-contrasena"
                                className="w-full inline-block bg-violet-600 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98] text-sm text-center">
                                Solicitar nuevo enlace
                            </Link>
                        </div>
                    ) : exitoso ? (
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="size-8 text-violet-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Contraseña actualizada</h2>
                            <p className="text-slate-500 text-sm mb-6">
                                Tu contraseña ha sido restablecida exitosamente.
                            </p>
                            <Link to="/login"
                                className="w-full inline-block bg-violet-600 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98] text-sm text-center">
                                Ir a iniciar sesión
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-slate-900 mb-1 text-center md:text-left">Restablecer contraseña</h2>
                            <p className="text-slate-500 text-sm mb-6 text-center md:text-left">
                                Ingresa tu nueva contraseña para recuperar el acceso.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                        <input
                                            type={showNueva ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={nuevaContrasena}
                                            onChange={(e) => setNuevaContrasena(e.target.value)}
                                            required
                                            minLength={8}
                                            className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                                        />
                                        <PasswordToggle visible={showNueva} onToggle={() => setShowNueva(!showNueva)} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar contraseña</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                        <input
                                            type={showConfirmar ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmarContrasena}
                                            onChange={(e) => setConfirmarContrasena(e.target.value)}
                                            required
                                            minLength={8}
                                            className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
                                        />
                                        <PasswordToggle visible={showConfirmar} onToggle={() => setShowConfirmar(!showConfirmar)} />
                                    </div>
                                </div>

                                {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                                <button type="submit" disabled={loading}
                                    className="w-full bg-violet-600 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98] text-sm disabled:opacity-60 disabled:pointer-events-none">
                                    {loading ? "Restableciendo..." : "Restablecer contraseña"}
                                </button>
                            </form>
                        </>
                    )}

                    <Link to="/login" className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-500 hover:text-violet-600 transition-colors">
                        <ArrowLeft className="size-4" />
                        Volver a iniciar sesión
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
