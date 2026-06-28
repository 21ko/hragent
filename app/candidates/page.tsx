"use client";

import { useCallback, useEffect, useState } from "react";
import type { Candidate } from "@/lib/types";

interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
  needsReview: number;
  cached: number;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/candidates", { cache: "no-store" });
    const body = await response.json();
    setCandidates(body.candidates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => {
      setError("Impossible de charger les candidats.");
      setLoading(false);
    });
  }, [load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    setSummary(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const response = await fetch("/api/candidates/import", {
        method: "POST",
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Import impossible.");
      setSummary(body);
      await load();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Import impossible.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="badge bg-accent/10 text-accent">CV → profil structuré</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Candidats</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Importez des PDF, DOCX ou TXT. Le texte est extrait localement,
            validé puis dédupliqué par téléphone.
          </p>
        </div>
        <label className="btn-primary cursor-pointer">
          {uploading ? "Analyse en cours…" : "Importer des CV"}
          <input
            className="sr-only"
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            disabled={uploading}
            onChange={(event) => upload(event.target.files)}
          />
        </label>
      </div>

      {summary && (
        <div className="card grid gap-3 text-center sm:grid-cols-5">
          <Metric label="Importés" value={summary.imported} />
          <Metric label="Mis à jour" value={summary.updated} />
          <Metric label="À vérifier" value={summary.needsReview} />
          <Metric label="Ignorés" value={summary.skipped} />
          <Metric label="Depuis le cache" value={summary.cached} />
        </div>
      )}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {loading ? (
          <p className="p-6 text-sm text-muted">Chargement…</p>
        ) : candidates.length === 0 ? (
          <p className="p-6 text-sm text-muted">Aucun candidat.</p>
        ) : (
          <div className="divide-y divide-line">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center"
              >
                <div>
                  <p className="font-medium">{candidate.name}</p>
                  <p className="text-xs text-muted">{candidate.phone}</p>
                </div>
                <div>
                  <p className="text-sm">{candidate.role_type}</p>
                  <p className="text-xs text-muted">
                    {candidate.years_experience} an(s) d’expérience
                  </p>
                </div>
                <div>
                  <p className="text-sm">{candidate.city}</p>
                  <p className="text-xs text-muted">
                    {candidate.languages.join(", ") || "Langues à vérifier"}
                  </p>
                </div>
                <span
                  className={`badge ${
                    candidate.availability_status === "review"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {candidate.availability_status === "review"
                    ? "À vérifier"
                    : "Disponible"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
