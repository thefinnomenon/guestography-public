import { GetStaticPropsContext } from "next";
import Head from "next/head";
import Image from "next/image";
import { ClipLoader } from "react-spinners";
import {
  getEvent,
  getEvents,
  getInterview,
  getMedia,
} from "../../lib/firebase";
import { Interview, Media, GalleryMedia } from "../../types";
import PhotoAlbum, { RenderPhoto } from "react-photo-album";
import Lightbox, {
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
import { EventAndGuestContext } from "../../context/EventAndGuestContext";

interface Props {
  title: string;
  eventId: string;
  interview?: Interview;
  media?: GalleryMedia[];
  unsorted?: GalleryMedia[];
}

export default function Home(props: Props) {
  const router = useRouter();
  const { guestId } = router.query as { guestId: string };
  if (guestId) identify(guestId);
  const { title, interview, media, unsorted, eventId } = props;
  const [slides, setSlides] = useState<any>();
  const [index, setIndex] = useState(-1);
  const [isDownloadingInterview, setIsDownloadingInterview] = useState(false);
  const [
    interviewVideoPercentageComplete,
    setInterviewVideoPercentageComplete,
  ] = useState(0);
  const [downloadList, setDownloadList] = useState([]);

  useEffect(() => {
    const slidesMedia = media ? media.map((m) => mapMediatoSlides(m)) : [];
    const slidesUnsorted = unsorted
      ? unsorted.map((m) => mapMediatoSlides(m))
      : [];
    setSlides([...slidesMedia, ...slidesUnsorted]);
  }, [media, unsorted]);

  return (
    <div>
      <Head>
        <title>{`${title} gallery`}</title>
        <meta name="description" content={`${title} gallery`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="overflow-hidden bg-white py-16 px-4 sm:px-6 lg:px-8 lg:py-24">
          <div className="relative mx-auto max-w-5xl">
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
              {interview && (
                <>
                  <h2 className="text-2xl font-bold mb-4">Interview</h2>
                  <div className="relative">
                    <video
                      id="interview-video"
                      className="rounded-md"
                      onPlay={() => {
                        track("Interview video played", { eventId, guestId });
                      }}
                      onTimeUpdate={() => {
                        const video = document.getElementById(
                          "interview-video"
                        ) as HTMLVideoElement;
                        const percentageComplete = Math.floor(
                          (video.currentTime / video.duration) * 100
                        );
                        if (
                          percentageComplete > interviewVideoPercentageComplete
                        ) {
                          setInterviewVideoPercentageComplete(
                            percentageComplete
                          );
                          track(
                            `${percentageComplete}% of interview video watched`,
                            { eventId, guestId }
                          );
                        }
                      }}
                      onEnded={() => {
                        track("Interview video ended", { eventId, guestId });
                      }}
                      src={`${interview.publicUrl}`}
                      preload="none"
                      poster={interview.posterUrl}
                      controls
                    />
                    <button
                      aria-label="Download"
                      className="absolute top-2 right-2"
                      onClick={async () => {
                        setIsDownloadingInterview(true);
                        await downloadMedia(interview.publicUrl);
                        setIsDownloadingInterview(false);
                        track("Interview downloaded", { eventId, guestId });
                      }}
                      disabled={isDownloadingInterview}
                    >
                      {isDownloadingInterview ? (
                        <ClipLoader className="mr-1" size={16} color="white" />
                      ) : (
                        <MdOutlineFileDownload
                          size="1.5rem"
                          className="mt-1 text-white hover:text-indigo-200 cursor-pointer"
                        />
                      )}
                    </button>
                  </div>
                </>
              )}
              <EventAndGuestContext.Provider value={{ eventId, guestId }}>
                <h2 className="text-2xl font-bold mt-8 mb-4">Media</h2>
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
                    defaultContainerWidth={1200}
                    sizes={{ size: "calc(100vw - 240px)" }}
                  />
                )}
                <h2 className="text-2xl font-bold mt-8 mb-4">Unsorted Media</h2>
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
                    defaultContainerWidth={1200}
                    sizes={{ size: "calc(100vw - 240px)" }}
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
                    render={{ slide: NextJsImage, buttonZoom: () => <div /> }}
                    thumbnails={{
                      imageFit: "cover",
                      padding: 0,
                      showToggle: true,
                    }}
                  />
                )}
              </EventAndGuestContext.Provider>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const renderPhoto: RenderPhoto = ({
  photo,
  layout,
  layoutOptions,
  imageProps: { alt, src, style, onClick, ...restImageProps },
}) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const videoRef = useRef<HTMLVideoElement>();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { eventId, guestId } = useContext(EventAndGuestContext);

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
            placeholder="blur"
            // @ts-ignore
            blurDataURL={photo.blurDataURL}
            // @ts-ignore
            width={photo.width}
            // @ts-ignore
            height={photo.height}
            style={{ ...style, width: "100%", padding: 0 }}
            className="rounded-md"
            onClick={onClick}
            {...restImageProps}
          />
        </>
      ) : (
        <div className="gallery-video">
          {/* <input className="gallery-item-select" type="checkbox" /> */}
          <div
            className={`gallery-item-overlay ${loading && "force-display"}`}
          />
          <div
            onClick={(e) => {
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
              if (onClick) onClick(e);
            }}
          >
            <video
              // @ts-ignore
              ref={videoRef}
              className="rounded-md"
              preload="none"
              // @ts-ignore
              poster={photo.poster}
              onEnded={() => setIsPlaying(false)}
              src={src}
              style={{ ...style, width: "100%", padding: 0 }}
            />
          </div>

          <div
            onClick={() => {
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
        fill
        alt=""
        src={slide}
        loading="eager"
        placeholder="blur"
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

  // Note: Webkit bug where first promise never resolves
  //       so web share only works once...
  // if (
  //   navigator.canShare &&
  //   navigator.canShare(mediaShare) &&
  //   window?.navigator?.userAgent.match(/iphone/i)
  // ) {
  //   try {
  //     await navigator.share(mediaShare);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // } else {
  const link = document.createElement("a");
  link.href = mediaURL;
  link.download = mediaFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

    // Get interview from db
    let interview = await getInterview(eventId);

    // Get media from db
    let { media, unsortedMedia } = await getMedia(eventId);

    // This is to make the Firestore timestamp object serializable
    interview = JSON.parse(JSON.stringify(interview) || "{}");
    media = JSON.parse(JSON.stringify(media) || "{}");
    unsortedMedia = JSON.parse(JSON.stringify(unsortedMedia) || "{}");

    const galleryMedia = media.map((m) => {
      return {
        src: m.publicUrl,
        height: m.metadata.height,
        width: m.metadata.width,
        blurDataURL: m.blurDataURL || null,
        poster: m.posterUrl || null,
        type: m.metadata?.mimeType?.includes("image") ? "image" : "video",
        guest: m.guestId,
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
        guest: m.guestId,
      };
    });

    return {
      props: {
        title: event.title,
        eventId,
        interview,
        media: galleryMedia,
        unsorted: galleryUnsortedMedia,
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
