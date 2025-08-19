
export const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toSafeFilename = (str: string) =>
  str.replace(/[^a-z0-9]/gi, "_").toLowerCase();
