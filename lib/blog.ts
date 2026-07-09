import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { DEFAULT_OG_IMAGE } from "./seo";

const blogDirectory = path.join(process.cwd(), "content", "blog");

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  keywords: string[];
  readingTime: string;
  image: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
};

function getReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min read`;
}

function getSlugFromFilename(filename: string) {
  return filename.replace(/\.mdx$/, "");
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function getPostFilename(slug: string) {
  return path.join(blogDirectory, `${slug}.mdx`);
}

export function getBlogSlugs() {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  return fs
    .readdirSync(blogDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .map(getSlugFromFilename);
}

export function getBlogPost(slug: string): BlogPost {
  const source = fs.readFileSync(getPostFilename(slug), "utf8");
  const { content, data } = matter(source);

  return {
    slug,
    title: String(data.title || slug),
    description: String(data.description || ""),
    publishedAt: String(data.publishedAt || ""),
    category: String(data.category || "Guide"),
    keywords: toStringArray(data.keywords),
    readingTime: getReadingTime(content),
    image: String(data.image || DEFAULT_OG_IMAGE),
    content,
  };
}

export function getBlogPosts() {
  return getBlogSlugs()
    .map(getBlogPost)
    .filter((post) => post.publishedAt)
    .sort((a, b) => {
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    })
    .map(({ content, ...meta }) => meta);
}
