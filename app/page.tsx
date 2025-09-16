// 1) signed-url anfordern (mit fileType!)
const sRes = await fetch("/api/storage/signed-url", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fileName: file.name, fileType: file.type || "application/octet-stream" })
});
const signed = await sRes.json();

// 2) Upload mit Content-Type Header
await fetch(signed.signedUrl, {
  method: "PUT",
  body: file,
  headers: { "Content-Type": file.type || "application/octet-stream" }
});
