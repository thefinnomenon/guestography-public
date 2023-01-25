import { GetStaticPropsContext } from "next";
import Head from "next/head";
import Image from "next/image";
import {
  getEvent,
  getEvents,
  getInterviews,
  getMedia,
} from "../../lib/firebase";
import { Interview, Media } from "../../types";

interface Props {
  title: string;
  eventId: string;
  interviews?: Interview[];
  media?: Media[];
}

export default function Home(props: Props) {
  const { title, interviews, media } = props;

  return (
    <div>
      <Head>
        <title>{`${title} gallery`}</title>
        <meta name="description" content={`${title} gallery`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="overflow-hidden bg-white py-16 px-4 sm:px-6 lg:px-8 lg:py-24">
          <div className="relative mx-auto max-w-xl">
            <svg
              className="absolute left-full translate-x-1/2 transform"
              width={404}
              height={404}
              fill="none"
              viewBox="0 0 404 404"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="85737c0e-0916-41d7-917f-596dc7edfa27"
                  x={0}
                  y={0}
                  width={20}
                  height={20}
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    x={0}
                    y={0}
                    width={4}
                    height={4}
                    className="text-indigo-200"
                    fill="currentColor"
                  />
                </pattern>
              </defs>
              <rect
                width={404}
                height={404}
                fill="url(#85737c0e-0916-41d7-917f-596dc7edfa27)"
              />
            </svg>
            <svg
              className="absolute right-full bottom-0 -translate-x-1/2 transform"
              width={404}
              height={404}
              fill="none"
              viewBox="0 0 404 404"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="85737c0e-0916-41d7-917f-596dc7edfa27"
                  x={0}
                  y={0}
                  width={20}
                  height={20}
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    x={0}
                    y={0}
                    width={4}
                    height={4}
                    className="text-indigo-200"
                    fill="currentColor"
                  />
                </pattern>
              </defs>
              <rect
                width={404}
                height={404}
                fill="url(#85737c0e-0916-41d7-917f-596dc7edfa27)"
              />
            </svg>
            <h1 className="text-center text-4xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {title} Gallery
            </h1>
            <div className="mt-12">
              <h2 className="mb-4">Interview</h2>
              <ul>
                {interviews?.map((interview) => (
                  <li key={interview.publicUrl}>{interview.publicUrl}</li>
                ))}
              </ul>
              <h2 className="mt-8 mb-4">Media</h2>
              <div className="wrapper">
                {media?.map((m) => {
                  if (!m.publicUrl.includes("MOV"))
                    return <img src={m.publicUrl} />;
                  else return <video src={m.publicUrl} controls />;
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getStaticProps(
  context: GetStaticPropsContext<{ eventId: string }>
) {
  // Get eventId from URL
  const eventId = context?.params?.eventId;

  // If no eventId, return 404
  if (!eventId)
    return {
      notFound: true,
    };

  try {
    // Get event from db
    const event = await getEvent(eventId);

    // If event doesn't exist
    if (!event)
      return {
        notFound: true,
      };

    // Get interview from db
    const interviews = await getInterviews(eventId);

    // Get media from db
    const media = await getMedia(eventId);

    // TODO: Generate blurhashes
    // const blurImagePromises = results.resources.map((image: ImageProps) => {
    //   return getBase64ImageUrl(image);
    // });
    // const imagesWithBlurDataUrls = await Promise.all(blurImagePromises);

    // for (let i = 0; i < reducedResults.length; i++) {
    //   reducedResults[i].blurDataUrl = imagesWithBlurDataUrls[i];
    // }

    return {
      props: {
        title: event.title,
        eventId,
        interviews,
        media,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      notFound: true,
    };
  }
}

export async function getStaticPaths() {
  try {
    // Fetch events from db
    const events = await getEvents();

    // If no events return 404
    if (!events)
      return {
        notFound: true,
      };

    // Create paths from events
    const paths = events.map((event) => {
      return { params: { eventId: event.id } };
    });

    return {
      paths,
      fallback: "blocking",
    };
  } catch (e) {
    console.error(e);
    return {
      notFound: true,
    };
  }
}
