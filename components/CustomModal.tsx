import React from "react"
import { motion, AnimatePresence } from "motion/react"
import { AlertTriangle, X } from "lucide-react"
import { cn } from "../lib/utils"

interface CustomModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "info"
}

export function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}: CustomModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                  variant === "danger" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                )}
              >
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 text-zinc-400 leading-relaxed">{message}</p>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={cn(
                  "rounded-xl px-6 py-2 text-sm font-medium text-white shadow-lg transition-all active:scale-95",
                  variant === "danger"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
