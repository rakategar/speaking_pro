// Public URL builder for Storage objects.
//
// Server-side Supabase traffic goes to SUPABASE_INTERNAL_URL (local Kong), so
// client.storage.getPublicUrl() would hand back an internal address that is
// useless in a browser and would be persisted into columns like
// profiles.avatar_url. Always build browser-facing URLs from the public origin
// instead.
export function publicStorageUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
