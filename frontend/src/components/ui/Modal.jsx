import { useEffect } from "react"
import { cn } from "@/lib/utils"

// Anchos máximos del panel, alineados con los tamaños usados en los modales
const sizes = {
  sm:    "max-w-sm",
  md:    "max-w-md",
  lg:    "max-w-lg",
  xl:    "max-w-xl",
  "3xl": "max-w-3xl",
}

// Shell reutilizable: overlay oscuro + panel blanco centrado.
// La estructura interna (header, cuerpo, footer) la define cada consumidor vía children.
export function Modal({
  children,
  onClose,
  size = "lg",
  className,          // overrides del panel: padding, overflow, alturas máximas
  overlayClassName,   // overrides del overlay: blur, alineación para bottom-sheet
  closeOnBackdrop = true,
  closeOnEsc = true,
}) {
  useEffect(() => {
    if (!closeOnEsc) return
    const alPresionar = (e) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", alPresionar)
    return () => window.removeEventListener("keydown", alPresionar)
  }, [closeOnEsc, onClose])

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4",
        overlayClassName
      )}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={cn("w-full rounded-2xl bg-white shadow-xl", sizes[size], className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
