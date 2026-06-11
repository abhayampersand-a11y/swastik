"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "lucide-react"

export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose?: () => void
  children: React.ReactNode
  className?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-sm rounded-xl bg-background p-6 shadow-xl",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            destructive ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          )}
        >
          <AlertTriangleIcon className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function NoticeDialog({
  open,
  title,
  description,
  variant = "info",
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  variant?: "info" | "success" | "warning"
  onClose: () => void
}) {
  const Icon = variant === "success" ? CheckCircleIcon : variant === "warning" ? AlertTriangleIcon : InfoIcon
  const color =
    variant === "success"
      ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
      : variant === "warning"
        ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", color)}>
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>OK</Button>
      </div>
    </Modal>
  )
}
