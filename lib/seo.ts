export const SITE_URL = "https://guestography.com";
export const DEFAULT_OG_IMAGE = "/landing-page/0.jpg";

export function absoluteUrl(path: string) {
  if (path.startsWith("http")) {
    return path;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
