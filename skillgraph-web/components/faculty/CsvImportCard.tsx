"use client";

import { useRef, useState } from "react";
import { Upload, Download, CheckCircle2 } from "lucide-react";

type Issue = { line: number; message: string };
type Result = Record<string, unknown> & { rows?: number; errors?: Issue[]; errorCount?: number; unmatched?: Issue[]; unmatchedCount?: number };

/**
 * Upload a CSV, preview what it would change (dry run), then confirm. `summary` turns the
 * server's counts into a sentence for this import type.
 */
export default function CsvImportCard({
  title,
  description,
  endpoint,
  templateHref,
  extraBody = {},
  summary,
  onImported,
}: {
  title: string;
  description: string;
  endpoint: string;
  templateHref: string;
  extraBody?: Record<string, unknown>;
  summary: (r: Result) => string;
  onImported?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null);
  const [preview, setPreview] = useState<Result | null>(null);
  const [done, setDone] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (csv: string, dryRun: boolean) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extraBody, csv, dryRun }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Import failed");
        return null;
      }
      return body as Result;
    } finally {
      setBusy(false);
    }
  };

  const choose = async (f: File | undefined) => {
    setPreview(null);
    setDone(null);
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return setError("Files are limited to 2 MB.");
    const csv = await f.text();
    setFile({ name: f.name, csv });
    setPreview(await send(csv, true));
  };

  const confirm = async () => {
    if (!file) return;
    const result = await send(file.csv, false);
    if (result) {
      setDone(result);
      setPreview(null);
      setFile(null);
      if (input.current) input.current.value = "";
      onImported?.();
    }
  };

  const issues = [...(preview?.errors ?? []), ...(preview?.unmatched ?? [])].sort((a, b) => a.line - b.line);
  const hidden = (preview?.errorCount ?? 0) + (preview?.unmatchedCount ?? 0) - issues.length;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-heading font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-lg">{description}</p>
        </div>
        <a href={templateHref} className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
          <Download size={12} /> Template
        </a>
      </div>

      <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md py-4 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-foreground transition-colors">
        <Upload size={14} />
        {file ? file.name : "Choose a CSV file"}
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={e => void choose(e.target.files?.[0])} />
      </label>

      {busy && <p className="text-xs text-muted-foreground mt-3" role="status">Checking…</p>}
      {error && <p className="text-xs text-red-400 mt-3" role="alert">{error}</p>}

      {preview && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-foreground">{summary(preview)}</p>
          {issues.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-400 mb-2">These rows will be skipped:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {issues.map(i => <li key={`${i.line}-${i.message}`}>Line {i.line}: {i.message}</li>)}
                {hidden > 0 && <li>…and {hidden} more</li>}
              </ul>
            </div>
          )}
          <button
            onClick={() => void confirm()}
            disabled={busy || !preview.rows}
            className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            Import
          </button>
        </div>
      )}

      {done && (
        <p className="flex items-center gap-2 text-sm text-emerald-400 mt-4" role="status">
          <CheckCircle2 size={14} /> Imported. {summary(done)}
        </p>
      )}
    </div>
  );
}
