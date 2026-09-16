const DEFAULT_SITE_URL = "http://localhost:3000";

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_SITE_URL;
}
