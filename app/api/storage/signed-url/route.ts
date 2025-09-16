// app/api/storage/signed-url/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function sanitizeFileName(name: string) {
  // Entfernt problematische Zeichen, Umlaute etc.
  const base = name.trim().toLowerCase().replace(/\s+/g, "-");
  return base.replace(/[^a-z0-9._-]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawName: string = body?.fileName || `upload-${Date.now()}.bin`;
    const fileType: string = body?.fileType || "application/octet-stream";

    const fileName = sanitizeFileName(rawName) || `upload-${Date.now()}.bin`;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase ENV fehlen (URL oder SERVICE_ROLE)." },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey);

    // Optional: Bucket existiert?
    const buckets = await admin.storage.listBuckets();
    if (Array.isArray(buckets)) {
      const hasUploads = buckets.some((b: any) => b.name === "uploads");
      if (!hasUploads) {
        return NextResponse.json(
          { error: "Bucket 'uploads' existiert nicht. Bitte in Supabase anlegen (privat)." },
          { status: 400 }
        );
      }
    }

    const objectPath = `u/${crypto.randomUUID()}-${fileName}`;

    // WICHTIG: contentType mitgeben – behebt viele 400-Fälle
    const { data, error } = await admin
      .storage
      .from("uploads")
      .createSignedUploadUrl(objectPath, {
        upsert: false,
        contentType: fileType,          // <— neu
        cacheControl: "3600"            // optional
      });

    if (error) {
      // Der genaue Supabase-Fehler hilft uns weiter
      return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: objectPath, fileType });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "signed-url error" }, { status: 400 });
  }
}

