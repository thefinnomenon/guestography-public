import Head from "next/head";
import { GetStaticPropsContext } from "next";
import router from "next/router";
import { useEffect, useState } from "react";
import { getEvent, getEvents } from "../../../lib/firebase";
import { CircleLoader, ClipLoader } from "react-spinners";
import { Event, Metadata } from "../../../types";
import { GoFileMedia } from "react-icons/go";
import {
  MdOutlineCheckCircleOutline,
  MdErrorOutline,
  MdRefresh,
} from "react-icons/md";
import { track, identify } from "../../../lib/mixpanel";
import { CircularProgressbar } from "react-circular-progressbar";
import { MultipartFileUploader } from "../../../utils/uppy";
import Uppy from "@uppy/core";
import "react-circular-progressbar/dist/styles.css";

interface Props {
  title: string;
  eventId: string;
}

type MediaStatus = "queued" | "uploading" | "complete" | "error";

interface MediaItem {
  status: MediaStatus;
  file: File;
  fileId: string;
  progress: number;
  metadata?: Metadata;
}

export default function Home(props: Props) {
  const { title, eventId } = props;

  let guestId = "";
  if (typeof window !== "undefined" && router.query.guestId) {
    guestId = router.query.guestId as string;
    identify(guestId);
  }
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [multipartFileUploader, setMultipartFileUploader] = useState<Uppy>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [update, setUpdate] = useState<any>();

  // Handle updates
  useEffect(() => {
    if (!update) return;

    switch (update?.action) {
      case "upload-start": {
        const updatedMedia = [...media];
        update.fileIds.map((fileId: string) => {
          const index = media.findIndex((m) => m.fileId === fileId);
          updatedMedia[index] = {
            ...updatedMedia[index],
            status: "uploading",
            progress: 0,
          };
        });
        setUpdate(null);
        setMedia(updatedMedia);
        break;
      }
      case "progress-update": {
        const index = media.findIndex((m) => m.fileId === update.fileId);
        const updatedMedia = [...media];
        updatedMedia[index] = {
          ...updatedMedia[index],
          progress: update.progress,
        };
        setUpdate(null);
        setMedia(updatedMedia);
        break;
      }
      case "upload-error": {
        const index = media.findIndex((m) => m.fileId === update.fileId);
        const updatedMedia = [...media];
        updatedMedia[index] = {
          ...updatedMedia[index],
          progress: 0,
          status: "error",
        };
        setUpdate(null);
        setMedia(updatedMedia);
        break;
      }
      case "upload-success": {
        const index = media.findIndex((m) => m.fileId === update.fileId);
        const updatedMedia = [...media];
        updatedMedia[index] = {
          ...updatedMedia[index],
          status: "complete",
        };
        setUpdate(null);
        setMedia(updatedMedia);
      }
    }
  }, [JSON.stringify(media), JSON.stringify(update)]);

  useEffect(() => {
    const onUploadStart = (fileIds: string[]) => {
      console.log("Uploads starting... ", fileIds);
      setUpdate({ action: "upload-start", fileIds });
    };

    const onProgressUpdate = (fileId: string, progress: number) => {
      setUpdate({ action: "progress-update", fileId, progress });
    };

    const onUploadFail = (fileId: string) => {
      setUpdate({ action: "upload-error", fileId });
    };

    const onUploadSuccess = async (fileId: string) => {
      setUpdate({ action: "upload-success", fileId });
    };

    const onComplete = async (isComplete: boolean) => {
      if (isComplete) {
        setIsSubmitting(false);
        router.push(
          `/success?eventId=${eventId}&guestId=${guestId}&type=media_upload`
        );
      }
    };

    setMultipartFileUploader(
      MultipartFileUploader({
        eventId,
        guestId,
        uploadType: "media",
        onProgressUpdate,
        onUploadSuccess,
        onUploadFail,
        onComplete,
        onUploadStart,
      })
    );
  }, [eventId, guestId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!media) return;

    setIsSubmitting(true);

    try {
      multipartFileUploader.upload();
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleMediaSelection = async (files: FileList | null) => {
    if (!files || !multipartFileUploader) return;

    // Clear all files on new selection
    multipartFileUploader.cancelAll();

    const fileArr = Array.from(files);
    const mediaList: MediaItem[] = await Promise.all(
      fileArr.map(async (file, index) => {
        const fileId = multipartFileUploader.addFile({
          name: file.name,
          type: file.type,
          data: file,
        });

        return {
          file,
          fileId,
          progress: 0,
          status: "queued",
        };
      })
    );

    setMedia(mediaList);

    track("Media selected", {
      eventId,
      guestId,
      mediaMetadata: mediaList.map((media) => media.metadata),
    });
  };

  const getStatusIcon = (status: MediaStatus, item: MediaItem) => {
    switch (status) {
      case "queued":
        return null;
      case "uploading":
        return (
          <span className="h-6 w-6">
            <CircularProgressbar
              value={item.progress}
              text={`${item.progress}`}
              strokeWidth={12}
              styles={{
                path: {
                  stroke: "rgb(99 102 241)",
                },
                trail: {
                  stroke: "rgb(224 231 255)",
                },
                text: {
                  fill: "rgb(99 102 241)",
                  fontSize: "40px",
                },
              }}
            />
          </span>
        );
      case "complete":
        return <MdOutlineCheckCircleOutline size="1.5rem" />;
      case "error":
        return (
          <MdRefresh
            size="1.5rem"
            className="text-red-700 cursor-pointer"
            onClick={() => {
              // const index = media.findIndex((m) => m.fileId === item.fileId);
              // const updatedMedia = [...media];
              // updatedMedia[index] = {
              //   ...updatedMedia[index],
              //   status: "uploading",
              //   progress: 0,
              // };
              // setMedia(updatedMedia);
              if (multipartFileUploader)
                multipartFileUploader.retryUpload(item.fileId);
            }}
          />
        );
    }
  };

  return (
    <div>
      <Head>
        <title>{`${title} | Media`}</title>
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
                    onClick={() => {
                      track("Select media clicked", {
                        eventId,
                        guestId,
                      });
                    }}
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
                      {media &&
                        media.map((item) => (
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
                              {getStatusIcon(item.status, item)}
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
