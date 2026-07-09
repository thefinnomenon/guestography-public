import type { GetServerSideProps } from "next";
import { getBlogPosts } from "../lib/blog";
import { SITE_URL } from "../lib/seo";

function buildUrl(path: string, lastmod?: string) {
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSitemap() {
  const staticUrls = [buildUrl("/"), buildUrl("/event"), buildUrl("/blog")];
  const blogUrls = getBlogPosts().map((post) =>
    buildUrl(`/blog/${post.slug}`, post.publishedAt)
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...blogUrls].join("\n")}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/xml");
  res.write(buildSitemap());
  res.end();

  return {
    props: {},
  };
};

export default function Sitemap() {
  return null;
}
