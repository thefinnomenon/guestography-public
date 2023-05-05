import Head from "next/head";

interface Props {}

export default function Home(props: Props) {
  return (
    <div>
      <Head>
        <title>Contact Us</title>
        <meta name="description" content="Contact Us" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="overflow-hidden bg-white py-16 px-4 sm:px-6 lg:px-8 lg:py-24">
          Email us at support@guestography.com
        </div>
      </main>
    </div>
  );
}
