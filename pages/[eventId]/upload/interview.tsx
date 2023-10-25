import Head from "next/head";
import { GetStaticPropsContext } from "next";
import router from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactTags, { Tag } from "react-tag-autocomplete";
import { getEvent, getEvents } from "../../../lib/firebase";
import { IoPhoneLandscapeSharp, IoPhonePortraitSharp } from "react-icons/io5";
import { BiError } from "react-icons/bi";
import { Event } from "../../../types";
import { track, identify } from "../../../lib/mixpanel";
import { checkIpad, checkIphone } from "../../../utils/platformDetection";
import { MultipartFileUploader } from "../../../utils/uppy";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface Props {
  title: string;
  orientation: "landscape" | "portrait";
  eventId: string;
  guests: Tag[];
}

export default function Home(props: Props) {
  const { title, orientation, eventId, guests } = props;
  let guestId = "";
  if (typeof window !== "undefined" && router.query.guestId) {
    guestId = router.query.guestId as string;
    identify(guestId);
  }
  const defaultTag = guests
    ? guests.find((guest) => guest.id === guestId)
    : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  const [fileId, setFileId] = useState("");
  const [file, setFile] = useState<File>();
  const [videoMetadata, setVideoMetadata] = useState({});
  const [suggestions, setSuggestions] = useState<Tag[]>(guests);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [multipartFileUploader, setMultipartFileUploader] = useState<any>();
  const reactTags = useRef<ReactTags>();

  const onProgressUpdate = (fileId: string, value: number) => {
    if (value > progress) setProgress(value);
  };

  const onUploadFail = (fileId: string) => {
    setError("Upload failed. Please retry.");
    setIsSubmitting(false);
    setProgress(0);
  };

  const onUploadSuccess = async (fileId: string) => {
    setIsSubmitting(false);
    router.push(
      `/success?eventId=${eventId}&guestId=${guestId}&type=interview_upload`
    );
  };

  useEffect(() => {
    setMultipartFileUploader(
      MultipartFileUploader({
        eventId,
        guestId,
        guests,
        uploadType: "interview",
        onProgressUpdate,
        onUploadSuccess,
        onUploadFail,
      })
    );
  }, [eventId, guestId, guests]);

  // Handle Tags
  useEffect(() => {
    setTags(defaultTag ? [defaultTag] : []);
  }, [defaultTag]);

  const onDelete = useCallback(
    (tagIndex: number) => {
      if (tagIndex < 0) return;
      setSuggestions([...suggestions, tags[tagIndex]]);
      setTags(
        tags.filter((tag, i) => {
          if (tag.id === guestId) return true;
          return i !== tagIndex;
        })
      );
      track("Guest tag deleted", { eventId, guestId });
    },
    [eventId, guestId, suggestions, tags]
  );

  const onAddition = useCallback(
    (newTag: any) => {
      setTags([...tags, newTag]);
      setSuggestions(
        suggestions.filter((suggestion) => newTag.id !== suggestion.id)
      );
      track("Guest tag added", { eventId, guestId });
    },
    [eventId, guestId, suggestions, tags]
  );

  // Handle Video
  const handleInterviewSelection = (videoFile: File | null) => {
    if (!videoFile) return;

    let blobURL = URL.createObjectURL(videoFile);
    setVideoSrc(blobURL);
    setFile(videoFile);

    // Remove previous file
    if (fileId) multipartFileUploader.removeFile(fileId);

    const id = multipartFileUploader.addFile({
      name: videoFile.name,
      type: videoFile.type,
      data: videoFile,
    });

    setFileId(id);

    setVideoMetadata({
      type: "video",
      fileExt: videoFile.name.slice(
        videoFile.name.lastIndexOf(".") + 1,
        videoFile.name.length
      ),
    });
  };

  const checkVideoMetadata = (video: HTMLVideoElement) => {
    let err = "";
    const videoOrientation =
      video.videoWidth > video.videoHeight ? "landscape" : "portrait";
    if (videoOrientation !== orientation)
      err = `${err}Video must be in ${orientation}. `;
    if (video.duration > 60) err = `${err} Video must be under 60 seconds. `;
    if (
      (orientation === "landscape" && video.videoWidth < 1280) ||
      (orientation === "portrait" && video.videoHeight < 1280)
    )
      err = `${err} Video resolution is too low. Did you record using the camera initiated from the 'Choose File' button on this page? Please record using your native phone camera app instead and return here to upload the video.`;

    setVideoMetadata({
      ...videoMetadata,
      height: video.videoHeight,
      width: video.videoWidth,
    });

    setError(err);

    track("Interview selected", {
      eventId,
      guestId,
      orientation: videoOrientation,
      videoHeight: video.videoHeight,
      videoWidth: video.videoWidth,
      duration: video.duration,
      error: err,
    });
  };

  // Handle Form Submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fileId) return;
    setIsSubmitting(true);

    try {
      // If previous upload failed -> trigger retry
      if (error === "Upload failed!")
        await multipartFileUploader.retryUpload(fileId);
      else await multipartFileUploader.upload();
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      setProgress(0);
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
                    Record with your phone camera and choose to upload from
                    photo gallery.
                  </p>
                  <p className="block text-sm text-gray-500 mt-1 mb-4">
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
                    onClick={() => {
                      track("Select interview clicked", {
                        eventId,
                        guestId,
                      });
                    }}
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
                        // Only need to autoplay and pause on iPhones and iPads
                        // since they don't load the first frame as a poster
                        autoPlay={checkIphone() || checkIpad()}
                        // @ts-ignore
                        onLoad={(e) => e.target.pause()}
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
                        className="flex justify-start p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800"
                        role="alert"
                      >
                        <div>
                          <BiError className="mr-2" size={24} />
                          <span className="sr-only">Error</span>
                        </div>
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
                    disabled={
                      !videoSrc ||
                      tags.length === 0 ||
                      isSubmitting ||
                      (error !== "" && error !== "Upload failed!")
                    }
                    type="submit"
                    className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      (!videoSrc ||
                        tags.length === 0 ||
                        (error !== "" && error !== "Upload failed!")) &&
                      "bg-indigo-200 text-indigo-400 hover:bg-indigo-200"
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="h-6 w-6">
                        <CircularProgressbar
                          value={progress}
                          strokeWidth={16}
                        />
                      </div>
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

    // Filter out events without interviews enabled
    const eventsWithInterviews = events.filter(
      (event) => (event.data() as Event).interviews.enabled
    );

    // Create paths from events
    const paths = eventsWithInterviews.map((event) => {
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

    // If event doesn't exist or doesn't have interview service enabled -> 404
    if (!event || !event.interviews.enabled)
      return {
        notFound: true,
      };

    // Create guests array for tags
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
