"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { NoticeDialog } from "@/components/ui/modal"
import { FieldError } from "@/components/ui/field-error"
import { Settings2Icon, SaveIcon } from "lucide-react"
import { useCachedApi, useInvalidate } from "@/lib/redux/hooks"

interface Settings {
  business_name: string
  tagline: string
  email: string
  contact_number: string
  address: string
}

export default function SettingsPage() {
  const { data, loading } = useCachedApi<{ settings: Settings }>("/api/settings")
  const invalidateCache = useInvalidate()
  const [form, setForm] = useState<Settings>({ business_name: "", tagline: "", email: "", contact_number: "", address: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    if (data?.settings) {
      setForm({
        business_name: data.settings.business_name ?? "",
        tagline: data.settings.tagline ?? "",
        email: data.settings.email ?? "",
        contact_number: data.settings.contact_number ?? "",
        address: data.settings.address ?? "",
      })
    }
  }, [data])

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      setError("Business name is required")
      return
    }
    setSaving(true)
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    invalidateCache("/api/settings")
    setSaving(false)
    setSavedNotice(true)
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2Icon className="size-5" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            <SaveIcon className="size-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <>
                <div>
                  <Label>Business Name *</Label>
                  <Input
                    value={form.business_name}
                    aria-invalid={!!error}
                    onChange={(e) => { setForm({ ...form, business_name: e.target.value }); setError("") }}
                    placeholder="e.g., Swastik Mandap"
                  />
                  <FieldError msg={error} />
                  <p className="text-xs text-muted-foreground mt-1">
                    This name shows in the sidebar, header, invoices and estimates.
                  </p>
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    placeholder="e.g., Event & Decoration Services"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Contact Number</Label>
                    <Input
                      value={form.contact_number}
                      onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                      placeholder="e.g., +91 98765 43210"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g., admin@swastikmandap.com"
                    />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Shop / office address"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <NoticeDialog
        open={savedNotice}
        title="Settings saved!"
        description="Your business details have been updated everywhere."
        variant="success"
        onClose={() => setSavedNotice(false)}
      />
    </MainLayout>
  )
}
