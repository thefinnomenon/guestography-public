import Head from "next/head";
import { GetStaticPropsContext } from "next";
import router from "next/router";
import { useEffect, useState } from "react";
import { getEvent, getEvents } from "../../../lib/firebase";
import { IoWarningOutline } from "react-icons/io5";
import { ClipLoader } from "react-spinners";
import { Event, Metadata } from "../../../types";
import { GoFileMedia } from "react-icons/go";
import { MdOutlineCheckCircleOutline, MdRefresh } from "react-icons/md";
import { track, identify } from "../../../lib/mixpanel";
import { CircularProgressbar } from "react-circular-progressbar";
import { MultipartFileUploader } from "../../../utils/uppy";
import Uppy from "@uppy/core";
import "react-circular-progressbar/dist/styles.css";
import { checkIos } from "../../../utils/platformDetection";
import Cookies from "js-cookie";
import Link from "next/link";

interface Props {
  title: string;
  eventId: string;
}

type MediaStatus = "queued" | "uploading" | "complete" | "error";

interface MediaItem {
  status: MediaStatus;
  file: File;
  type: "image" | "video";
  src?: string;
  fileId: string;
  progress: number;
  metadata?: Metadata;
}

export default function Home(props: Props) {
  const { title, eventId } = props;

  const [guestName, setGuestName] = useState<string>("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [multipartFileUploader, setMultipartFileUploader] = useState<Uppy>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [update, setUpdate] = useState<any>();
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  let isIos = false;
  if (typeof window !== "undefined") isIos = checkIos();

  // Check for existing guest name in cookie on mount
  useEffect(() => {
    const savedName = Cookies.get(`guestName_${eventId}`);
    if (savedName) {
      setGuestName(savedName);
    } else {
      setShowNameModal(true);
    }
  }, [eventId]);

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
      // Disabled due to inefficiencies
      // case "preview-loaded": {
      //   const updatedMedia = [...media];
      //   updatedMedia[update.index] = {
      //     ...updatedMedia[update.index],
      //     src: update.src,
      //   };
      //   setUpdate(null);
      //   setMedia(updatedMedia);
      // }
    }
  }, [JSON.stringify(media), JSON.stringify(update)]);

  // Initialize Uppy instance
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
        setUploadComplete(true);
        
        // Check if user has already provided email
        const hasEmailCookie = Cookies.get("guestEmail");
        if (!hasEmailCookie) {
          setShowEmailCapture(true);
        }
      }
    };

    if (guestName) {
      // Sanitize guestName for use in file IDs (replace spaces with hyphens)
      const sanitizedGuestId = guestName.replace(/\s+/g, '-');
      
      setMultipartFileUploader(
        MultipartFileUploader({
          eventId,
          guestId: sanitizedGuestId,
          uploadType: "media",
          onProgressUpdate,
          onUploadSuccess,
          onUploadFail,
          onComplete,
          onUploadStart,
        })
      );
    }
  }, [eventId, guestName]);

  // Load selected files and set media previews (disabled)
  // Note: Since these are all high res images, ~20 already crashed the Android
  // browser so unless there is a way to grab a smaller preview this is a no go
  // useEffect(() => {
  //   if (!media) return;
  //   media.map((m, i) => {
  //     if (m.src || m.type === "video") return;

  //     const reader = new FileReader();
  //     reader.readAsDataURL(m.file);
  //     reader.onload = () =>
  //       setUpdate({
  //         action: "preview-loaded",
  //         index: i,
  //         src: reader.result as string,
  //       });
  //   });
  // }, [media]);

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      const trimmedName = nameInput.trim();
      setGuestName(trimmedName);
      Cookies.set(`guestName_${eventId}`, trimmedName, { expires: 365 * 10 }); // Cookie expires in 10 years
      setShowNameModal(false);
      identify(trimmedName);
      track("Guest name submitted", { eventId, guestName: trimmedName });
    }
  };

  const handleEmailSubmit = async () => {
    if (!emailInput.trim()) return;

    setIsSubmittingEmail(true);
    const trimmedEmail = emailInput.trim().toLowerCase();
    
    // Get name from guestName cookie
    const savedGuestName = Cookies.get(`guestName_${eventId}`) || "Anonymous";

    try {
      // Save email in cookie (never expires)
      Cookies.set("guestEmail", trimmedEmail, { expires: 365 * 10 });

      // Save to database via API
      const response = await fetch("/api/saveUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          name: savedGuestName,
          eventId: eventId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save user");
      }

      const result = await response.json();

      track("Email captured after upload", {
        eventId,
        guestName: savedGuestName,
        email: trimmedEmail,
        discountCodeSent: result.discountCodeSent,
      });

      setShowEmailCapture(false);
      
      // Show confirmation that discount code will be emailed
      if (result.discountCodeSent) {
        console.log("Discount code will be emailed to:", trimmedEmail);
      }
    } catch (error) {
      console.error("Error saving email:", error);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!media) return;
    if (!guestName) {
      setShowNameModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      if (multipartFileUploader) multipartFileUploader.upload();
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleMediaSelection = async (files: FileList | null) => {
    setError("");
    setMedia([]);
    setUploadComplete(false); // Reset upload complete state when selecting new files
    if (!files || !multipartFileUploader) return;

    // Clear all files on new selection
    multipartFileUploader.cancelAll();

    // Check for HEIC files
    const fileArr = Array.from(files);
    console.log(fileArr);
    if (fileArr.filter((file) => file.type === "image/heic").length !== 0) {
      track("Invalid media file selected", { eventId, guestName });
      setError(
        "Unsupported file format (HEIC). If on iOS, in the Photo Library, click Options, set Format to Most Compatible, and try the upload again."
      );
      return;
    }

    const mediaList: MediaItem[] = await Promise.all(
      fileArr.map(async (file) => {
        const fileId = multipartFileUploader.addFile({
          name: file.name,
          type: file.type,
          data: file,
        });

        return {
          file,
          fileId,
          type: file.type.includes("image") ? "image" : "video",
          progress: 0,
          status: "queued",
        };
      })
    );

    setMedia(mediaList);

    track("Media selected", {
      eventId,
      guestName,
      numberOfMedia: mediaList.length,
      numberOfVideos: mediaList.filter((m) => m.type === "video"),
      numberOfImages: mediaList.filter((m) => m.type === "image"),
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
            {item.progress === 0 ? (
              <ClipLoader size={20} color="rgb(99 102 241)" />
            ) : (
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
            )}
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
              if (multipartFileUploader) {
                track("Media upload retry", {
                  eventId,
                  guestName,
                });
                multipartFileUploader.retryUpload(item.fileId);
              }
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
        <div className="overflow-hidden bg-white py-4 px-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-xl">
            {/* Back to Gallery Button */}
            <div className="mb-8">
              <Link href={`/${eventId}`} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white border-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm">
                ← Back to Gallery
              </Link>
            </div>
          </div>
        </div>
        <div className="overflow-hidden bg-white px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24">
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
              {isIos && (
                <div
                  className="flex justify-start p-4 mt-8 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-200 dark:text-yellow-800"
                  role="alert"
                >
                  <div>
                    <IoWarningOutline className="mr-2" size={24} />
                    <span className="sr-only">Error</span>
                  </div>
                  <div className="text-left">
                    iOS Users: Please be patient after clicking <b>Add</b>,
                    especially with videos as iOS will do some processing on
                    each one.
                  </div>
                </div>
              )}
            </div>
            <div className="mt-12">
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8"
              >
                <div className="sm:col-span-2">
                  <label
                    htmlFor="interview"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Media
                  </label>
                  <input
                    type="file"
                    name="interview"
                    accept="image/*, video/*"
                    multiple
                    onClick={() => {
                      if (!guestName) {
                        setShowNameModal(true);
                        return;
                      }
                      track("Select media clicked", {
                        eventId,
                        guestName,
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
                  {error && (
                    <div
                      className="flex justify-start p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800"
                      role="alert"
                    >
                      <div>
                        <IoWarningOutline className="mr-2" size={24} />
                        <span className="sr-only">Error</span>
                      </div>
                      <div>{error}</div>
                    </div>
                  )}
                  <div>
                    <ul role="list" className="divide-y divide-indigo-200">
                      {media &&
                        media.map((item) => (
                          <li
                            key={item.file.name}
                            className="flex w-full justify-between items-center py-4 !ml-0"
                          >
                            <span className="flex shrink gap-2 items-center whitespace-nowrap truncate overflow-hidden min-w-0">
                              {!item.src && (
                                <GoFileMedia
                                  size="2.5rem"
                                  className="text-indigo-700 mt-[1px] shrink-0"
                                />
                              )}
                              {item.src && item.type === "image" && (
                                <img
                                  src={item.src}
                                  className="h-10 w-10 rounded-md shrink-0"
                                />
                              )}
                              <span className="flex whitespace-nowrap shrink truncate overflow-hidden text-gray-500 min-w-0">
                                {item.file.name}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center text-indigo-500 fill-indigo-500 ml-4">
                              {getStatusIcon(item.status, item)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button
                    disabled={media.length === 0 || uploadComplete}
                    type="submit"
                    className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      (media.length === 0 || uploadComplete) &&
                      "bg-indigo-200 text-indigo-400 hover:bg-indigo-200"
                    }`}
                  >
                    {isSubmitting ? (
                      <ClipLoader size={24} color="white" />
                    ) : uploadComplete ? (
                      "UPLOADED"
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


      {/* Name Input Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Welcome!
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Please enter your name to continue
                    </p>
                  </div>
                  <div className="mt-4">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleNameSubmit();
                        }
                      }}
                      placeholder="Your name"
                      className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={handleNameSubmit}
                  disabled={!nameInput.trim()}
                  className={`inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm ${
                    nameInput.trim()
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Capture Modal - Show after successful upload */}
      {showEmailCapture && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => setShowEmailCapture(false)}
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <MdOutlineCheckCircleOutline className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Upload Successful!
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Get 50% off your next Guestography event! Perfect for capturing memories at weddings, parties, and special occasions.
                    </p>
                  </div>
                  <div className="mt-4">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && emailInput.trim()) {
                          handleEmailSubmit();
                        }
                      }}
                      placeholder="Enter your email"
                      className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={handleEmailSubmit}
                  disabled={!emailInput.trim() || isSubmittingEmail}
                  className={`inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm ${
                    emailInput.trim() && !isSubmittingEmail
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {isSubmittingEmail ? (
                    <ClipLoader size={20} color="white" />
                  ) : (
                    "Get Your Discount Code"
                  )}
                </button>
                <p className="mt-3 text-xs text-center text-gray-500">
                  Click outside to skip
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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

    // If event doesn't exist -> 404
    if (!event)
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
