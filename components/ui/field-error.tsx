export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1 text-xs text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-150">
      {msg}
    </p>
  )
}
