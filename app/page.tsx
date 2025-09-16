"use client";
import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [reply, setReply] = useState<string>("");

  async function handleAnalyze() {
    if (!file) return;
    // 1) Signed Upload URL holen
    const signed = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileType: file.type })
    }).then(r => r.json());

    if (!signed?.signedUrl) { alert("Signed URL fehlgeschlagen"); return; }

    // 2) Direkt zu Supabase hochladen
    await fetch(signed.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

    // 3) Analyse anstoßen
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: signed.path,
        descriptors: { tone: "freundlich, klar", goal: "knapp antworten" }
      })
    }).then(r => r.json());

    setReply(res?.reply ?? "Keine Antwort erhalten.");
  }

  return (
    <main style={{ maxWidth: 720 }}>
      <h1>WhatsApp Screenshot → Antwortvorschlag</h1>
      <p>Wähle einen Screenshot (PNG/JPG) und klicke auf Analysieren.</p>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div style={{ marginTop: 12 }}>
        <button onClick={handleAnalyze} disabled={!file}>Analysieren</button>
      </div>
      {reply && (
        <>
          <h2 style={{ marginTop: 24 }}>Vorschlag</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
            {reply}
          </pre>
        </>
      )}
    </main>
  );
}
