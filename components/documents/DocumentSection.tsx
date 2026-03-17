"use client"

import { useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Trash2, Download, Upload } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { supabaseBrowser, DOCUMENTS_BUCKET } from "@/lib/supabase-browser"

interface DocumentType {
  id: string
  name: string
  defaultExpiryDays: number
}

interface Document {
  id: string
  fileName: string
  storagePath: string
  expiryDate: string | Date | null
  status: "Compliant" | "ExpiringSoon" | "NonCompliant"
  documentType: { name: string }
  uploadedAt: string | Date
  signedUrl: string | null
}

interface Props {
  nurseProfileId: string
  initialDocuments: Document[]
  documentTypes: DocumentType[]
  canEdit: boolean
}

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  Compliant: "success",
  ExpiringSoon: "warning",
  NonCompliant: "destructive",
}

export function DocumentSection({ nurseProfileId, initialDocuments, documentTypes, canEdit }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [docTypeId, setDocTypeId] = useState(documentTypes[0]?.id ?? "")
  const [expiryDate, setExpiryDate] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" })
      return
    }
    if (!docTypeId) {
      toast({ title: "Select a document type", variant: "destructive" })
      return
    }

    setUploading(true)
    try {
      // Step 1: Get signed upload URL
      const signRes = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, nurseProfileId, documentTypeId: docTypeId }),
      })
      if (!signRes.ok) throw new Error("Failed to get upload URL")
      const { token, path } = await signRes.json()

      // Step 2: Upload directly to Supabase using signed URL token
      const { error: uploadError } = await supabaseBrowser.storage
        .from(DOCUMENTS_BUCKET)
        .uploadToSignedUrl(path, token, file)
      if (uploadError) throw new Error(uploadError.message ?? "Upload failed")

      // Step 3: Save document record
      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nurseProfileId,
          documentTypeId: docTypeId,
          fileName: file.name,
          storagePath: path,
          expiryDate: expiryDate || undefined,
        }),
      })
      if (!docRes.ok) throw new Error("Failed to save document")
      const newDoc = await docRes.json()

      setDocuments((prev) => [newDoc, ...prev])
      toast({ title: "Document uploaded", description: file.name })
      if (fileRef.current) fileRef.current.value = ""
      setExpiryDate("")
    } catch (err) {
      toast({ title: "Upload failed", description: String(err), variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"?`)) return
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" })
    if (!res.ok) {
      toast({ title: "Delete failed", variant: "destructive" })
      return
    }
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
    toast({ title: "Document deleted" })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Documents</h3>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.documentType.name}
                  {doc.expiryDate && ` · Expires ${formatDate(doc.expiryDate)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                {doc.signedUrl && (
                  <a href={doc.signedUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(doc.id, doc.fileName)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="rounded-md border p-4 space-y-3">
          <p className="text-sm font-medium">Upload New Document</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select
                id="doc-type"
                value={docTypeId}
                onChange={(e) => setDocTypeId(e.target.value)}
              >
                {documentTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-expiry">Expiry Date</Label>
              <Input
                id="doc-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input id="doc-file" type="file" ref={fileRef} />
          </div>
          <Button onClick={handleUpload} disabled={uploading} size="sm">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      )}
    </div>
  )
}
