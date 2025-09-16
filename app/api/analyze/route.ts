// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { storagePath, descriptors } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase ENV fehlen." }, { status: 500 });
    }
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });
    }
    if (!storagePath) {
      return NextResponse.json({ error: "storagePath fehlt." }, { status: 400 });
    }

    // 1) Bild-URL (5 Min. gültig)
    const admin = createClient(supabaseUrl, serviceKey);
    const signed = await admin.storage.from("uploads").createSignedUrl(storagePath, 300);
    if (signed.error) {
      return NextResponse.json({ error: `SignedUrl Fehler: ${signed.error.message}` }, { status: 400 });
    }
    const imageUrl = signed.data.signedUrl;

    // 2) Schnell prüfen, ob es ein Bild ist
    const head = await fetch(imageUrl, { method: "HEAD" });
    if (!head.ok) {
      return NextResponse.json({ error: `Bild nicht abrufbar: ${head.status} ${head.statusText}` }, { status: 400 });
    }
    const ctype = head.headers.get("content-type") || "";
    if (!ctype.startsWith("image/")) {
      return NextResponse.json({ error: `Unerwarteter Content-Type: ${ctype}` }, { status: 400 });
    }

    // 3) OpenAI Vision via Chat Completions
    const client = new OpenAI({ apiKey: openaiKey });
    const prompt = `Analysiere den WhatsApp-Screenshot und formuliere eine passende Antwort.
Stil: ${descriptors?.tone ?? "freundlich, klar"}.
Ziel: ${descriptors?.goal ?? "höflich antworten und nächste Schritte vorschlagen"}.`;

    const cc = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Du bist ein WhatsApp Reply Assistant. Antworte kurz und natürlich." },
        {
          role: "user",
          // TypeScript nörgelt bei image-blobs – daher 'as any'
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } } as any
          ]
        }
      ]
    });

    const reply = cc.choices?.[0]?.message?.content ?? "Keine Antwort erhalten.";
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "analyze fatal" }, { status: 500 });
  }
}
