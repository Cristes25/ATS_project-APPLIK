import { X, Mail, Sparkles } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { Button } from "@/components/ui/button"

export default function EnviarCorreoModal({ candidato, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-dark/10">
              <Mail className="size-5 text-blue-dark" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Enviar Correo</h2>
              <p className="text-sm text-slate-400">Comunicación directa con el candidato</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Candidato */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <Avatar name={candidato.nombre} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{candidato.nombre}</p>
              <p className="text-xs text-slate-400 truncate">{candidato.email}</p>
            </div>
          </div>

          {/* Aviso pendiente */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Envío de correos en preparación
            </p>
            <p className="text-xs text-amber-700 leading-relaxed mb-3">
              Estamos terminando la integración con el servicio de correos. Una vez activo, podrás enviar mensajes al candidato desde aquí con plantillas predefinidas y seguimiento automático.
            </p>
            <p className="text-xs font-semibold text-amber-800 mb-1.5">Próximamente:</p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Plantillas predefinidas (invitación, actualización, solicitud de documentos)</li>
              <li>Envío automático cuando cambias la etapa del candidato</li>
              <li>Historial de comunicaciones por candidato</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex gap-3">
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Entendido
          </Button>
        </div>

      </div>
    </div>
  )
}
