"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { Button } from "@chatbotx.io/ui/components/ui/button"
import { ssiAiGovernanceAction } from "./actions"

type Inspection = { draftDigest: string; publishedVersion: number; publishedDigest: string | null; preview: string; versions: Array<{ version: number; digest: string }> }

/** Explicit inspection and publication: saving an editor is not publication. */
export function SsiPublicationPanel({ workspaceId, resourceId, kind, disabled = false }: {
  workspaceId: string; resourceId: string; kind: "persona" | "knowledge"; disabled?: boolean
}) {
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { execute, isExecuting } = useAction(ssiAiGovernanceAction.bind(null, workspaceId), {
    onSuccess: ({ data }) => {
      setError(null)
      if (data?.operation === "inspect") {
        setInspection({ draftDigest: data.draftDigest, publishedVersion: data.publishedVersion, publishedDigest: data.publishedDigest,
          preview: data.kind === "persona" ? JSON.stringify(data.draft, null, 2) : data.preview.join("\n\n"), versions: data.versions })
        setNotice(null)
      } else if (data?.operation === "publish") { setNotice(`Published v${data.version}. Reload inspection before another change.`); setInspection(null) }
    },
    onError: ({ error }) => { setInspection(null); setError(error.serverError ?? "Publication failed. Inspect again before retrying.") },
  })
  const busy = disabled || isExecuting
  return <section className="my-3 rounded-lg border p-3 text-sm" aria-label={`SSI ${kind} publication`}>
    <h3 className="font-semibold">SSI {kind === "persona" ? "Persona versions" : "Knowledge versions"}</h3>
    <p className="my-2 text-xs text-muted-foreground">{kind === "persona" ? "Publication pins saved configuration for SSI Copilot only. Legacy automatic replies are unchanged. Save editor changes before inspecting." : "Publish completed source chunks for SSI Copilot citations. This is versioned lexical retrieval, not Drive sync or hybrid search. The preview is limited to five excerpts."}</p>
    <Button size="sm" type="button" variant="outline" disabled={busy} onClick={() => execute({ kind, resourceId, operation: "inspect" })}>Inspect saved content</Button>
    {inspection && <>
      <p className="mt-2">Current publication: v{inspection.publishedVersion}</p>
      <pre className="my-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">{inspection.preview}</pre>
      <p className="my-2 break-all text-xs">Reviewed SHA-256: {inspection.draftDigest}</p>
      <Button size="sm" type="button" disabled={busy} onClick={() => execute({ kind, resourceId, operation: "publish", expectedVersion: inspection.publishedVersion, expectedDigest: inspection.draftDigest })}>Publish reviewed version</Button>
      {kind === "persona" && <details className="mt-2"><summary>Published history and rollback</summary>
        <p className="text-xs text-muted-foreground">Rollback creates a new version; it does not overwrite history. Confirm the selected version before applying.</p>
        {inspection.versions.map((version) => <div key={version.version} className="my-2 flex items-center gap-2">
          <span className="min-w-0 break-all text-xs">v{version.version} · {version.digest}</span>
          <Button size="sm" type="button" variant="outline" disabled={busy || version.version === inspection.publishedVersion} onClick={() => {
            if (window.confirm(`Publish a new version using saved persona v${version.version}?`)) execute({ kind, resourceId, operation: "publish", expectedVersion: inspection.publishedVersion, expectedDigest: version.digest, rollbackOfVersion: version.version })
          }}>Restore version</Button>
        </div>)}
      </details>}
    </>}
    {notice && <p role="status" className="mt-2">{notice}</p>}
    {error && <p role="alert" className="mt-2 text-destructive">{error}</p>}
  </section>
}
