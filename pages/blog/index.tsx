import Head from "next/head";
import Link from "next/link";
import { getBlogPosts, type BlogPostMeta } from "../../lib/blog";
import { absoluteUrl, formatDisplayDate } from "../../lib/seo";

type BlogIndexProps = {
  posts: BlogPostMeta[];
};

export default function BlogIndex({ posts }: BlogIndexProps) {
  const canonicalUrl = absoluteUrl("/blog");

  return (
    <>
      <Head>
        <title>Guestography Blog</title>
        <meta
          name="description"
          content="Guestography articles about collecting photos from weddings, parties, fundraisers, reunions, and other events."
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Guestography Blog" />
        <meta
          property="og:description"
          content="Guestography articles about collecting photos from weddings, parties, fundraisers, reunions, and other events."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
      </Head>
      <main className="min-h-screen bg-white">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 lg:px-8">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-gray-900"
            >
              Guestography
            </Link>
            <Link
              href="/event"
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Create Event
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
          <div className="grid gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block border-b border-gray-200 pb-8 transition-colors last:border-b-0 hover:border-indigo-200"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="font-medium text-indigo-600">
                    {post.category}
                  </span>
                  <span>{formatDisplayDate(post.publishedAt)}</span>
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 hover:underline">
                  {post.title}
                </h2>
                <p className="mt-3 text-base leading-7 text-gray-600">
                  {post.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

export function getStaticProps() {
  return {
    props: {
      posts: getBlogPosts(),
    },
  };
}
