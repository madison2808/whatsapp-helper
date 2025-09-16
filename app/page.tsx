"use client";
import { useCallback, useMemo, useState } from "react";

type AnalyzeResult = { reply?: string; error?: string };

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [reply, setReply] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const onDrop = useCallback((f: FileList | null) => {
    if (!f || !f[0]) return;
    const accepted = f[0];
    if (!accepted.type.startsWith("image/")) {
      setError("Bitte ein Bild (PNG/JPG) auswählen.");
      return;
    }
    setError("");
    setReply("");
    setFile(accepted);
  }, []);

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    setReply("");
    try {
      if (!file) throw new Error("Kein Bild ausgewählt.");
      // 1) Signed URL
      const sRes = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type || "image/png" })
      });
      const sText = await sRes.text();
      const signed = JSON.parse(sText || "{}");
      if (!sRes.ok) throw new Error(signed?.error || "signed-url fehlgeschlagen");

      // 2) Upload
      const uRes = await fetch(signed.signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" }
      });
      if (!uRes.ok) throw new Error(`Upload Fehler: ${uRes.status} ${uRes.statusText}`);

      // 3) Analyze
      const aRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: signed.path,
          descriptors: { tone: "freundlich, klar", goal: "knapp antworten" }
        })
      });
      const aText = await aRes.text();
      const data: AnalyzeResult = JSON.parse(aText || "{}");
      if (!aRes.ok) throw new Error(data?.error || `analyze ${aRes.status}`);
      setReply(data?.reply || "");
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-10">
      <header className="mb-8">
        <h1 className="heading">WhatsApp Screenshot → Antwortvorschlag</h1>
        <p className="subtle mt-1">Ziehe einen Screenshot hierher oder wähle eine Datei aus.</p>
      </header>

      <div className="card p-6">
        {/* Dropzone */}
        <label
          className="dropzone block cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onDrop(e.dataTransfer?.files || null); }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onDrop(e.target.files)}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full h-12 w-12 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-xl">📷</span>
            </div>
            <div>
              <div className="font-medium">Bild hierher ziehen</div>
              <div className="subtle text-sm">oder klicken, um auszuwählen</div>
            </div>
          </div>
        </label>

        {/* Preview */}
        {file && (
          <div className="preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="w-full object-contain max-h-[420px] bg-black/5 dark:bg-white/5" />
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button className="btn" onClick={handleAnalyze} disabled={!file || loading}>
            {loading ? "Analysiere…" : "Analysieren"}
          </button>
          <button className="btn btn-secondary" onClick={() => { setFile(null); setReply(""); setError(""); }}>
            Zurücksetzen
          </button>
          {file && <span className="subtle text-sm">Datei: {file.name}</span>}
        </div>

        {/* Status */}
        {loading && (
          <div className="mt-4 subtle text-sm animate-pulse">
            ⏳ Bild wird hochgeladen & analysiert…
          </div>
        )}
        {error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            Fehler: {error}
          </div>
        )}
      </div>

      {/* Ergebnis */}
      {reply && (
        <div className="card p-6 mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Vorschlag</h2>
            <button
              className="btn btn-secondary"
              onClick={() => navigator.clipboard.writeText(reply)}
              title="In Zwischenablage kopieren"
            >
              Kopieren
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap leading-7">{reply}</p>
        </div>
      )}
    </div>
  );
}
