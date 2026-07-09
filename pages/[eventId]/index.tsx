import { GetStaticPropsContext } from "next";
import Head from "next/head";
import Image from "next/image";
import { ClipLoader } from "react-spinners";
import { getEvent, getEvents, getMedia } from "../../lib/firebase";
import { GalleryMedia, EventStatus } from "../../types";
import PhotoAlbum, { RenderPhoto } from "react-photo-album";
import Lightbox, {
  ContainerRect,
  Render,
  Slide,
  isImageFitCover,
  isImageSlide,
  useLightboxProps,
} from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// import optional lightbox plugins
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import Download from "yet-another-react-lightbox/plugins/download";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { useContext, useEffect, useRef, useState } from "react";
import { MdOutlineFileDownload } from "react-icons/md";
import { track, identify } from "../../lib/mixpanel";
import { useRouter } from "next/router";
import { EventContext } from "../../context/EventContext";
import Link from "next/link";
import Cookies from "js-cookie";

interface Props {
  title: string;
  eventId: string;
  media?: GalleryMedia[];
  unsorted?: GalleryMedia[];
  eventStatus: EventStatus;
  discountCode?: string;
}

export default function Home(props: Props) {
  const router = useRouter();
  const { guestId, key, showEmailModal } = router.query as {
    guestId: string;
    key?: string;
    showEmailModal?: string;
  };
  if (guestId) identify(guestId);
  const { title, media, unsorted, eventId, discountCode, eventStatus } = props;
  const [slides, setSlides] = useState<any>();
  const [index, setIndex] = useState(-1);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  useEffect(() => {
    const slidesMedia = media ? media.map((m) => mapMediatoSlides(m)) : [];
    const slidesUnsorted = unsorted
      ? unsorted.map((m) => mapMediatoSlides(m))
      : [];
    setSlides([...slidesMedia, ...slidesUnsorted]);
  }, [media, unsorted]);

  useEffect(() => {
    // Check if we should show the email modal
    if (showEmailModal === "true") {
      const hasEmailCookie = Cookies.get("guestEmail");
      if (!hasEmailCookie) {
        setShowEmailCapture(true);
      }
      // Clean up the URL
      const newUrl = `/${eventId}`;
      router.replace(newUrl, undefined, { shallow: true });
    }
  }, [showEmailModal, eventId, router]);

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
        // You could show a toast notification or update the UI to confirm
        console.log("Discount code will be emailed to:", trimmedEmail);
      }
    } catch (error) {
      console.error("Error saving email:", error);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <div>
      <Head>
        <title>{`${title} gallery`}</title>
        <meta name="description" content={`${title} gallery`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {key && (
          <div className="h-12 flex justify-end gap-4 pt-4 pr-2 sm:pt-10 sm:pr-8 items-center">
            <Link href={`/${eventId}/manage?key=${key}`}>
              <button className="items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                <span>Manage Event</span>
              </button>
            </Link>
          </div>
        )}
        <div className="min-h-screen overflow-hidden bg-white py-16 px-4 sm:px-6 lg:px-8 lg:py-24">
          <div className="relative mx-auto max-w-5xl">
            <h1 className="text-center text-4xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {title} Gallery
            </h1>
            <div className="mt-12">
              <EventContext.Provider value={{ eventId }}>
                <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">Media</h2>
                {media && (
                  <PhotoAlbum
                    layout="masonry"
                    photos={media}
                    columns={(containerWidth) => {
                      if (containerWidth < 400) return 2;
                      if (containerWidth < 800) return 3;
                      return 4;
                    }}
                    // @ts-ignore
                    renderPhoto={renderPhoto}
                    onClick={({ index }) => setIndex(index)}
                    defaultContainerWidth={399}
                  />
                )}
                <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">Unsorted Media</h2>
                {unsorted && (
                  <PhotoAlbum
                    layout="masonry"
                    photos={unsorted}
                    columns={(containerWidth) => {
                      if (containerWidth < 400) return 2;
                      if (containerWidth < 800) return 3;
                      return 4;
                    }}
                    // @ts-ignore
                    renderPhoto={renderPhoto}
                    onClick={({ index }) =>
                      setIndex(media ? media.length + index : index)
                    }
                    defaultContainerWidth={399}
                  />
                )}
                {slides && (
                  <Lightbox
                    slides={slides}
                    open={index >= 0}
                    index={index}
                    close={() => setIndex(-1)}
                    plugins={[
                      Fullscreen,
                      Slideshow,
                      Thumbnails,
                      Zoom,
                      Video,
                      Download,
                      Captions,
                    ]}
                    download={{
                      download: async ({ slide }) => {
                        await downloadMedia(slide.src);
                        track("Media downloaded", {
                          eventId,
                          guestId,
                          uploaderId: slide.guest,
                          type: slide.type,
                        });
                      },
                    }}
                    captions={{ descriptionTextAlign: "center" }}
                    render={{
                      slide: NextJsImage,
                      thumbnail: NextJsImage,
                      buttonZoom: () => <div />,
                    }}
                    thumbnails={{
                      imageFit: "cover",
                      padding: 0,
                      showToggle: true,
                    }}
                  />
                )}
              </EventContext.Provider>
            </div>
          </div>
        </div>
      </main>

      {/* Email Capture Modal */}
      {showEmailCapture && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowEmailCapture(false)}
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Your photos look amazing!
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Get $10 off Guestography for your next event! We&apos;ll email
                      you an exclusive discount code.
                    </p>
                  </div>
                  <div className="mt-4">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEmailSubmit();
                        }
                      }}
                      placeholder="your@email.com"
                      className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
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
                    "Email Me My $10 Off Code"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const renderPhoto: RenderPhoto = ({
  photo,
  layoutOptions,
  imageProps: { alt, src, style, sizes, onClick },
}) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showFacade, setShowFacade] = useState(true);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [autoplay, setAutoplay] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const videoRef = useRef<HTMLVideoElement>();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { eventId } = useContext(EventContext);
  const guestId = "";

  // @ts-ignore
  const guest = photo.guest;
  // @ts-ignore
  const type = photo.type;

  return (
    <div
      className="gallery-item-wrapper"
      style={{
        position: "relative",
        boxSizing: "content-box",
        alignItems: "center",
        marginBottom: "8px",
        width: style?.width,
        padding: `${layoutOptions.padding - 2}px`,
        paddingBottom: 0,
      }}
    >
      {type === "image" ? (
        <>
          {/* <input
            data-href={src}
            className="gallery-item-select"
            type="checkbox"
          /> */}
          <div
            className={`gallery-item-overlay ${loading && "force-display"}`}
            onClick={onClick}
          />
          <Image
            alt={`Image by ${getGuestNameFromId(guest ? guest : "")}`}
            src={src}
            // @ts-ignore
            priority={photo.priority}
            // @ts-ignore
            // loading={photo.priority ? "eager" : "lazy"}
            // @ts-ignore
            placeholder={photo.blurDataURL ? "blur" : undefined}
            // @ts-ignore
            blurDataURL={photo.blurDataURL}
            // @ts-ignore
            width={photo.width}
            // @ts-ignore
            height={photo.height}
            style={{ ...style, width: "100%", height: "auto", padding: 0 }}
            className="rounded-md"
            onClick={onClick}
            // Two columns, three columns, four columns (default)
            sizes="(max-width: 400px) 50vw, (max-width: 800px) 33vw, 25vw"
            // {...restImageProps}
          />
        </>
      ) : (
        <div className="gallery-video">
          {/* <input className="gallery-item-select" type="checkbox" /> */}
          <div
            className={`gallery-item-overlay ${loading && "force-display"}`}
          />

          {showFacade ? (
            <Image
              alt={`Image by ${getGuestNameFromId(guest ? guest : "")}`}
              // @ts-ignore
              src={photo.poster}
              // @ts-ignore
              priority={photo.priority}
              // @ts-ignore
              // loading={photo.priority ? "eager" : "lazy"}
              // @ts-ignore
              placeholder={photo.blurDataURL ? "blur" : undefined}
              // @ts-ignore
              blurDataURL={photo.blurDataURL}
              // @ts-ignore
              width={photo.width}
              // @ts-ignore
              height={photo.height}
              style={{ ...style, width: "100%", height: "auto", padding: 0 }}
              className="rounded-md"
              onClick={(e) => {
                // Facade was clicked -> swap in video
                if (showFacade) setShowFacade(false);
                if (onClick) {
                  track("Slider opened", {
                    eventId,
                    guestId,
                    type,
                    uploaderId: guest,
                  });
                  onClick(e);
                }
              }}
              // Two columns, three columns, four columns (default)
              sizes="(max-width: 400px) 50vw, (max-width: 800px) 33vw, 25vw"
              // {...restImageProps}
            />
          ) : (
            <div
              onClick={() => {
                track("Slider opened", {
                  eventId,
                  guestId,
                  type,
                  uploaderId: guest,
                });

                if (isPlaying && videoRef.current) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
                // @ts-ignore
                if (onClick) onClick();
              }}
            >
              <video
                // @ts-ignore
                ref={videoRef}
                className="rounded-md"
                preload="none"
                autoPlay={autoplay}
                // @ts-ignore
                poster={photo.poster}
                onEnded={() => setIsPlaying(false)}
                src={src}
                style={{ ...style, width: "100%", padding: 0 }}
              />
            </div>
          )}

          <div
            onClick={() => {
              // Facade was clicked -> swap in autoplaying video
              if (showFacade) {
                setShowFacade(false);
                setAutoplay(true);
                setIsPlaying(true);
                return;
              }
              if (!videoRef.current) return;
              if (videoRef.current.paused) {
                track("Media video played inline", {
                  eventId,
                  guestId,
                  uploaderId: guest,
                });
                videoRef.current.play();
                setIsPlaying(true);
              } else {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }}
          >
            {isPlaying ? (
              <svg
                className="pause-btn"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 122.88 122.88"
              >
                <g>
                  <path d="M61.44,0c16.97,0,32.33,6.88,43.44,18c11.12,11.12,18,26.48,18,43.44c0,16.97-6.88,32.33-18,43.44 c-11.12,11.12-26.48,18-43.44,18c-16.97,0-32.33-6.88-43.44-18C6.88,93.77,0,78.41,0,61.44C0,44.47,6.88,29.11,18,18 C29.11,6.88,44.47,0,61.44,0L61.44,0z M42.3,39.47h13.59v43.95l-13.59,0V39.47L42.3,39.47L42.3,39.47z M66.99,39.47h13.59v43.95 l-13.59,0V39.47L66.99,39.47L66.99,39.47z M97.42,25.46c-9.21-9.21-21.93-14.9-35.98-14.9c-14.05,0-26.78,5.7-35.98,14.9 c-9.21,9.21-14.9,21.93-14.9,35.98s5.7,26.78,14.9,35.98c9.21,9.21,21.93,14.9,35.98,14.9c14.05,0,26.78-5.7,35.98-14.9 c9.21-9.21,14.9-21.93,14.9-35.98S106.63,34.66,97.42,25.46L97.42,25.46z" />
                </g>
              </svg>
            ) : (
              <svg
                className="play-btn"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 311.69 311.69"
              >
                <path d="M155.84,0A155.85,155.85,0,1,0,311.69,155.84,155.84,155.84,0,0,0,155.84,0Zm0,296.42A140.58,140.58,0,1,1,296.42,155.84,140.58,140.58,0,0,1,155.84,296.42Z"></path>
                <polygon points="218.79 155.84 119.22 94.34 119.22 217.34 218.79 155.84"></polygon>
              </svg>
            )}
          </div>
        </div>
      )}
      <div className={`gallery-item-info ${loading && "force-display"}`}>
        <div className="flex justify-between">
          {getGuestNameFromId(guest ? guest : "")}
          <button
            aria-label="Download"
            onClick={async () => {
              setLoading(true);
              await downloadMedia(src);
              setLoading(false);
              track("Media downloaded", {
                eventId,
                guestId,
                uploaderId: guest,
                type,
              });
            }}
            disabled={loading}
          >
            {loading ? (
              <ClipLoader className="mr-1" size={16} color="white" />
            ) : (
              <MdOutlineFileDownload
                size="1.2rem"
                className="mt-1 text-white hover:text-indigo-200 cursor-pointer"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const mapMediatoSlides = (media: GalleryMedia) => {
  // @ts-ignore
  const { type, guest, src, width, height, blurDataURL, poster } = media;

  if (type === "video") {
    return {
      type,
      guest,
      title: `Video by ${getGuestNameFromId(guest)}`,
      description: `Video by ${getGuestNameFromId(guest)}`,
      alt: `Video by ${getGuestNameFromId(guest)}`,
      width,
      height,
      poster,
      download: true,
      src,
      preload: "none",
      sources: [
        {
          src,
        },
      ],
    };
  } else {
    return {
      type,
      guest,
      src,
      width,
      height,
      title: `Image by ${getGuestNameFromId(guest)}`,
      description: `Image by ${getGuestNameFromId(guest)}`,
      blurDataURL,
      download: true,
      alt: `Image by ${getGuestNameFromId(guest)}`,
    };
  }
};

const NextJsImage = ({ slide, rect }: any) => {
  const { imageFit } = useLightboxProps().carousel;
  const cover = isImageSlide(slide) && isImageFitCover(slide, imageFit);

  const width = !cover
    ? Math.round(
        Math.min(rect.width, (rect.height / slide.height) * slide.width)
      )
    : rect.width;

  const height = !cover
    ? Math.round(
        Math.min(rect.height, (rect.width / slide.width) * slide.height)
      )
    : rect.height;

  return (
    <div style={{ position: "relative", width, height }}>
      <Image
        alt=""
        src={slide.poster || slide}
        height={height}
        width={width}
        // @ts-ignore
        placeholder={slide.blurDataURL ? "blur" : undefined}
        blurDataURL={slide.blurDataURL}
        draggable={false}
        style={{ objectFit: cover ? "cover" : "contain" }}
        sizes={`${Math.ceil((width / window.innerWidth) * 100)}vw`}
      />
    </div>
  );
};

// Use share dialog for iPhone & trigger normal download for other devices
const downloadMedia = async (src: string) => {
  const response = await fetch(src, { cache: "no-store" });
  const blob = await response.blob();
  const mediaURL = URL.createObjectURL(blob);
  const mediaFilename = getFilenameFromSource(src);
  const file = new File([blob], mediaFilename, {
    type: blob.type,
  });

  const mediaShare = {
    title: mediaFilename,
    files: [file],
  };

  // NOTE: Share dialog doesn't work well on Android
  if (
    navigator.canShare &&
    navigator.canShare(mediaShare) &&
    window?.navigator?.userAgent.match(/iphone/i)
  ) {
    try {
      await navigator.share(mediaShare);
    } catch (error) {
      console.error(error);
    }
  } else {
    const link = document.createElement("a");
    link.href = mediaURL;
    link.download = mediaFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const getFilenameFromSource = (src: string) => {
  return src.slice(src.lastIndexOf("/") + 1, src.length);
};

const getGuestNameFromId = (guestId: string) => {
  if (!guestId) return "Anonymous";
  return guestId.slice(0, guestId.lastIndexOf("-")).replace("-", " ").trim();
};

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

    // Get media from db
    let { media, unsortedMedia } = await getMedia(eventId);

    media = media ? JSON.parse(JSON.stringify(media)) : null;
    unsortedMedia = unsortedMedia
      ? JSON.parse(JSON.stringify(unsortedMedia))
      : null;

    const galleryMedia = media.map((m, index) => {
      return {
        src: m.publicUrl,
        height: m.metadata.height,
        width: m.metadata.width,
        blurDataURL: m.blurDataURL || null,
        poster: m.posterUrl || null,
        // Don't lazy load the first 12 images (above the fold)
        priority: index < 12,
        type: m.metadata?.mimeType?.includes("image") ? "image" : "video",
        guest: m.id,
      };
    });

    const galleryUnsortedMedia = unsortedMedia.map((m) => {
      return {
        src: m.publicUrl,
        height: m.metadata.height,
        width: m.metadata.width,
        blurDataURL: m.blurDataURL || null,
        poster: m.posterUrl || null,
        type: m.metadata?.mimeType?.includes("image") ? "image" : "video",
        guest: m.id,
      };
    });

    return {
      props: {
        title: event.title,
        eventId,
        media: galleryMedia,
        unsorted: galleryUnsortedMedia,
        eventStatus: event.status,
        discountCode: event.discountCode || null,
      },
      revalidate: 60,
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
