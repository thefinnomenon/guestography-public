import Head from "next/head";
import { GetStaticPropsContext } from "next";
import router from "next/router";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import ReactTags, { Tag, TagComponentProps } from "react-tag-autocomplete";
import { getEvent, getEvents } from "../../../lib/firebase";
import { IoPhoneLandscapeSharp, IoPhonePortraitSharp } from "react-icons/io5";
import { BiError } from "react-icons/bi";
import { ClipLoader } from "react-spinners";

interface Props {
  title: string;
  orientation: "landscape" | "portrait";
  eventId: string;
  guests: Tag[];
}

export default function Home(props: Props) {
  const { title, orientation, eventId, guests } = props;
  let guestId = "";
  if (typeof window !== "undefined" && router.query.guestId)
    guestId = router.query.guestId as string;
  const defaultTag = guests
    ? guests.find((guest) => guest.id === guestId)
    : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [videoSrc, setVideoSrc] = useState("");
  const [file, setFile] = useState<File>();
  const [fileExt, setFileExt] = useState("");
  const [suggestions, setSuggestions] = useState(guests);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState("");
  const reactTags = useRef<ReactTags>();

  // Handle Tags
  useEffect(() => {
    setTags(defaultTag ? [defaultTag] : []);
  }, [defaultTag]);

  const onDelete = useCallback(
    (tagIndex: number) => {
      setTags(
        tags.filter((tag, i) => {
          if (tag.id === guestId) return true;
          return i !== tagIndex;
        })
      );
    },
    [guestId, tags]
  );

  const onAddition = useCallback(
    (newTag: any) => {
      setTags([...tags, newTag]);
    },
    [tags]
  );

  // Handle Video
  const handleInterviewSelection = (videoFile: File | null) => {
    if (!videoFile) return;

    setFileExt(
      videoFile.name.slice(
        videoFile.name.lastIndexOf(".") + 1,
        videoFile.name.length
      )
    );

    let blobURL = URL.createObjectURL(videoFile);
    setVideoSrc(blobURL);
    setFile(videoFile);
  };

  const checkVideoMetadata = (video: HTMLVideoElement) => {
    let err = "";
    const videoOrientation =
      video.videoWidth > video.videoHeight ? "landscape" : "portrait";
    if (videoOrientation !== orientation)
      err = `${err}Video must be in ${orientation}. `;
    if (video.duration >= 60) err = `${err} Video must be under 60 seconds. `;

    setError(err);
  };

  useEffect(() => {
    const retrieveUploadUrl = async () => {
      if (!fileExt) return;

      const res = await fetch(
        `/api/interview?eventId=${eventId}&guestId=${guestId}&fileExt=${fileExt}`
      );
      const { url } = await res.json();
      setUploadUrl(url);
      console.log("Presigned URL: ", url);
    };
    retrieveUploadUrl();
  }, [eventId, guestId, fileExt]);

  // Handle Form Submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!file) return;

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
      setError("Upload failed!");
    }
  };

  return (
    <div>
      <Head>
        <title>{`${title} | Interviews`}</title>
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
                Interview Upload
              </h2>
              <p className="mt-4 text-lg leading-6 text-gray-500">
                Record a short video message and upload it here.
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
                    Interview Video
                  </label>
                  <p className="block text-sm text-gray-500 mt-1 mb-2">
                    Must be{" "}
                    {orientation === "landscape" ? (
                      <>
                        <IoPhoneLandscapeSharp className="ml-1 mr-2 inline text-2xl" />
                        Landscape
                      </>
                    ) : (
                      <>
                        <IoPhonePortraitSharp className="ml-1 mr-2 inline text-2xl" />
                        Portrait
                      </>
                    )}{" "}
                    and less than 1 minute.
                  </p>
                  <input
                    type="file"
                    name="interview"
                    accept="video/*"
                    onChange={(e) =>
                      handleInterviewSelection(
                        e.target.files && e.target.files[0]
                      )
                    }
                    className="block w-full text-sm text-slate-500
    file:mr-4 file:py-2 file:px-4
    file:rounded-full file:border-0
    file:text-md file:font-semibold
    file:bg-indigo-50 file:text-indigo-500
    hover:file:bg-indigo-100"
                  />
                  <div className="flex flex-col justify-center gap-2">
                    {videoSrc && (
                      <video
                        src={videoSrc}
                        className={`${
                          videoSrc ? "show" : "hide"
                        } mt-4 rounded-md`}
                        controls
                        onLoadedMetadata={(metadata) => {
                          checkVideoMetadata(metadata.currentTarget);
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {error && (
                      <div
                        className="flex p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800"
                        role="alert"
                      >
                        <BiError className="text-lg mr-2" />
                        <span className="sr-only">Error</span>
                        <div>{error}</div>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2 mt-4">
                    <label
                      htmlFor="guests"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Tag Guests in Video
                    </label>
                    <ReactTags
                      id="guests"
                      name="guests"
                      placeholderText="Add guest"
                      noSuggestionsText="No matching guests"
                      // @ts-ignore
                      ref={reactTags}
                      tags={tags}
                      suggestions={suggestions}
                      onDelete={onDelete}
                      onAddition={onAddition}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button
                    disabled={!videoSrc || !uploadUrl || error}
                    type="submit"
                    className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      (!videoSrc || !uploadUrl || error) &&
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

function TagComponent({ tag, removeButtonText, onDelete }: TagComponentProps) {
  return (
    <span
      id="badge-dismiss-default"
      className="inline-flex items-center py-1 px-2 mr-2 text-sm font-medium text-indigo-800 bg-indigo-100 rounded dark:bg-indigo-200 dark:text-indigo-800"
    >
      <button
        type="button"
        className="inline-flex items-center py-0.5 mr-2 text-sm text-indigo-400 bg-transparent rounded-sm hover:bg-indigo-200 hover:text-indigo-900 dark:hover:bg-indigo-300 dark:hover:text-indigo-900"
        data-dismiss-target="#badge-dismiss-default"
        aria-label="Remove"
        onClick={onDelete}
      >
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path>
        </svg>
        <span className="sr-only">Remove guest</span>
      </button>
      {tag.name}
    </span>
  );
}

function SuggestionComponent({ item, query }: any) {
  return (
    <span id={item.id} className={"bg-slate-300"}>
      {item.name}
    </span>
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

    // If event doesn't exist or doesn't have interview service enabled -> 404
    if (!event || !event.interviews.enabled)
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
        eventId,
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
