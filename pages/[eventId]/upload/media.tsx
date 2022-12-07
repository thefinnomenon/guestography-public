import Head from "next/head";
import { GetStaticPropsContext } from "next";
import router from "next/router";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import ReactTags, { Tag, TagComponentProps } from "react-tag-autocomplete";
import { getEvent, getEvents } from "../../../lib/firebase";
import { IoPhoneLandscapeSharp, IoPhonePortraitSharp } from "react-icons/io5";
import { BiError } from "react-icons/bi";

interface Props {
  title: string;
}

export default function Home(props: Props) {
  const { title } = props;
  let guestId = "";
  if (typeof window !== "undefined" && router.query.guestId)
    guestId = router.query.guestId as string;

  const [error, setError] = useState("");
  const [media, setMedia] = useState<FileList | null>();

  return (
    <div>
      <Head>
        <title>{title} | Media</title>
        <meta name="description" content={`Interview upload for ${title}`} />
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
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h1>
              <h2 className="text-xl tracking-tight text-gray-900 sm:text-4xl">
                Media Upload
              </h2>
              <p className="mt-4 text-lg leading-6 text-gray-500">
                Upload the photos and videos you took of the event!
              </p>
            </div>
            <div className="mt-12">
              <form
                action="/api/interview"
                method="POST"
                encType="multipart/form-data"
                className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8"
              >
                <div className="sm:col-span-2">
                  <label
                    htmlFor="interview"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Media
                  </label>
                  <input
                    type="file"
                    name="interview"
                    accept="image/*, video/*"
                    multiple
                    onChange={(e) => setMedia(e.target.files)}
                    className="block w-full text-sm text-slate-500
    file:mr-4 file:py-2 file:px-4
    file:rounded-full file:border-0
    file:text-md file:font-semibold
    file:bg-indigo-50 file:text-indigo-500
    hover:file:bg-indigo-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    UPLOAD
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getStaticPaths() {
  try {
    const events = await getEvents();

    if (!events)
      return {
        notFound: true,
      };

    const paths = events.map((event) => {
      return { params: { eventId: event.id } };
    });

    return {
      paths,
      fallback: true,
    };
  } catch (e) {
    console.error(e);
    return {
      notFound: true,
    };
  }
}

export async function getStaticProps(
  context: GetStaticPropsContext<{ eventId: string }>
) {
  const eventId = context?.params?.eventId;
  if (!eventId)
    return {
      notFound: true,
    };

  try {
    const event = await getEvent(eventId);

    if (!event)
      return {
        notFound: true,
      };

    const guests = event.guests.map((guest) => {
      return {
        id: guest.id,
        name: `${guest.firstName} ${guest.lastName}`,
      };
    });

    return {
      props: {
        title: event.title,
        orientation: event.interviews.orientation,
        guests,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      notFound: true,
    };
  }
}
