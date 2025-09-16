import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { fileName, fileType } = await req.json();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only!
  );

  const objectPath = `u/${crypto.randomUUID()}-${fileName}`;
  const { data, error } = await admin
    .storage.from("uploads")
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ signedUrl: data.signedUrl, path: objectPath, fileType });
}
