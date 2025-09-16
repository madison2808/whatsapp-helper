import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { storagePath, descriptors } = await req.json();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const signed = await admin.storage.from("uploads").createSignedUrl(storagePath, 60);
  if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 400 });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const prompt = `Analysiere den WhatsApp-Screenshot und formuliere eine passende Antwort.
Stil: ${descriptors?.tone ?? "freundlich, klar"}.
Ziel: ${descriptors?.goal ?? "höflich antworten und nächste Schritte vorschlagen"}.`;

  const r = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Du bist ein WhatsApp Reply Assistant. Antworte kurz und natürlich." },
      { role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: signed.data.signedUrl } }
      ] as any }
    ]
  });

  const reply = r.choices?.[0]?.message?.content ?? "Konnte nichts erkennen.";
  return NextResponse.json({ reply });
}
