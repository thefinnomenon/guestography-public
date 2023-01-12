import Head from "next/head";
import { GetStaticPropsContext } from "next";
import router from "next/router";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { getEvent, getEvents } from "../../../lib/firebase";
import { ClipLoader } from "react-spinners";
import { Event } from "../../../types";
import { GoFileMedia } from "react-icons/go";
import { MdOutlineCheckCircleOutline, MdErrorOutline } from "react-icons/md";

interface Props {
  title: string;
  eventId: string;
}

type MediaStatus = "queued" | "uploading" | "complete" | "error";

interface MediaItem {
  status: MediaStatus;
  file: File;
  signedUrl: string;
}

export default function Home(props: Props) {
  const { title } = props;
  let guestId = "";
  if (typeof window !== "undefined" && router.query.guestId)
    guestId = router.query.guestId as string;
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Form Submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!media) return;

    try {
      // Upload video
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (res.status != 200) throw Error("Upload failed.");

      const url = uploadUrl.slice(0, uploadUrl.indexOf("?"));

      // Add entry in database
      const res2 = await fetch("/api/interview", {
        method: "POST",
        body: JSON.stringify({ eventId, guestId, url, guests: tags }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      setIsSubmitting(false);
      router.push(`/success`);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleMediaSelection = (files: FileList | null) => {
    if (!files) return;

    const fileArr = Array.from(files);
    // TODO: Get signed Urls
    const mediaList: MediaItem[] = fileArr.map((file) => {
      return {
        file,
        status: "queued",
      };
    });

    setMedia(mediaList);
  };

  const getStatusIcon = (status: MediaStatus) => {
    switch (status) {
      case "queued":
        return null;
      case "uploading":
        return <ClipLoader size="1.25rem" color="indigo" />;
      case "complete":
        return <MdOutlineCheckCircleOutline size="1.25rem" />;
      case "error":
        return <MdErrorOutline size="1.25rem" />;
    }
  };

  return (
    <div>
      <Head>
        <title>{title} | Media</title>
        <meta name="description" content={`Media upload for ${title}`} />
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
                onSubmit={handleSubmit}
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
                    onChange={(e) => handleMediaSelection(e.target.files)}
                    className="block w-full text-sm text-slate-500
    file:mr-4 file:py-2 file:px-4
    file:rounded-full file:border-0
    file:text-md file:font-semibold
    file:bg-indigo-50 file:text-indigo-500
    hover:file:bg-indigo-100"
                  />
                  <div>
                    <ul role="list" className="divide-y divide-indigo-200">
                      {media.map((item) => (
                        <li
                          key={item.file.name}
                          className="flex w-full justify-between items-center py-4"
                        >
                          <span className="flex gap-2 items-center">
                            <GoFileMedia
                              size="1rem"
                              className="text-indigo-700 mt-[1px]"
                            />
                            <span className="text-gray-500">
                              {item.file.name}
                            </span>
                          </span>
                          <span className="flex items-center text-indigo-500 fill-indigo-500">
                            {getStatusIcon(item.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button
                    disabled={!media}
                    type="submit"
                    className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      !media &&
                      "bg-indigo-200 text-indigo-400 hover:bg-indigo-200"
                    }`}
                  >
                    {isSubmitting ? (
                      <ClipLoader size={24} color="white" />
                    ) : (
                      "UPLOAD"
                    )}
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
    // Fetch events from db
    const events = await getEvents();

    // If no events return 404
    if (!events)
      return {
        notFound: true,
      };

    // Filter out events without media enabled
    const eventsWithMedia = events.filter(
      (event) => (event.data() as Event).media.enabled
    );

    // Create paths from events
    const paths = eventsWithMedia.map((event) => {
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

    // If event doesn't exist or doesn't have media service enabled -> 404
    if (!event || !event.media.enabled)
      return {
        notFound: true,
      };

    return {
      props: {
        title: event.title,
        eventId,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      notFound: true,
    };
  }
}
