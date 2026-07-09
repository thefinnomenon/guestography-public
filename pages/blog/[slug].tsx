import Head from "next/head";
import Link from "next/link";
import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import {
  getBlogPost,
  getBlogSlugs,
  type BlogPostMeta,
} from "../../lib/blog";
import { absoluteUrl, formatDisplayDate, SITE_URL } from "../../lib/seo";

type BlogPostPageProps = {
  post: BlogPostMeta;
  source: MDXRemoteSerializeResult;
};

const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mt-12 text-2xl font-bold tracking-tight text-gray-900"
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-8 text-xl font-bold text-gray-900" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mt-5 text-base leading-8 text-gray-700" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mt-5 list-disc space-y-2 pl-6 text-gray-700" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mt-5 list-decimal space-y-2 pl-6 text-gray-700" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-8" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="font-semibold text-indigo-600 hover:text-indigo-500" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-gray-900" {...props} />
  ),
};

export default function BlogPostPage({ post, source }: BlogPostPageProps) {
  const canonicalPath = absoluteUrl(`/blog/${post.slug}`);
  const imageUrl = absoluteUrl(post.image);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: imageUrl,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Organization",
      name: "Guestography",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Guestography",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalPath,
    },
  };

  return (
    <>
      <Head>
        <title>{`${post.title} | Guestography`}</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={canonicalPath} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalPath} />
        <meta property="og:image" content={imageUrl} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:modified_time" content={post.publishedAt} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      </Head>
      <main className="min-h-screen bg-white">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5 lg:px-8">
            <Link
              href="/blog"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              &larr; Blog
            </Link>
            <Link
              href="/event"
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Create Event
            </Link>
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="font-medium text-indigo-600">{post.category}</span>
            <span>{formatDisplayDate(post.publishedAt)}</span>
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-600">
            {post.description}
          </p>

          <div className="mt-10 border-t border-gray-200 pt-4">
            <MDXRemote {...source} components={mdxComponents} />
          </div>
        </article>
      </main>
    </>
  );
}

export function getStaticPaths() {
  return {
    paths: getBlogSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const { content, ...post } = getBlogPost(params.slug);
  const source = await serialize(content);

  return {
    props: {
      post,
      source,
    },
  };
}
