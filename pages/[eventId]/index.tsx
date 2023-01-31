import { GetStaticPropsContext } from "next";
import Head from "next/head";
import Image from "next/image";
import {
  getEvent,
  getEvents,
  getInterviews,
  getMedia,
} from "../../lib/firebase";
import { Interview, Media, GalleryMedia } from "../../types";
import PhotoAlbum, { RenderPhoto } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// import optional lightbox plugins
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { useEffect, useRef, useState } from "react";
import { relative } from "path";

interface Props {
  title: string;
  eventId: string;
  interviews?: Interview[];
  media?: GalleryMedia[];
}

export default function Home(props: Props) {
  const { title, interviews, media } = props;
  const [slides, setSlides] = useState<any>();
  const [index, setIndex] = useState(-1);
  const [downloadList, setDownloadList] = useState([]);

  useEffect(() => {
    if (!media) return;

    const slides = media.map(
      // @ts-ignore
      ({ alt: type, title: guest, src, width, height }) => {
        if (type === "video") {
          return {
            type,
            guest,
            description: `Video by ${guest}`,
            width,
            height,
            sources: [
              {
                src,
              },
            ],
          };
        } else {
          return {
            src,
            width,
            height,
            alt: guest,
          };
        }
      }
    );

    setSlides(slides);
  }, [media]);

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
              {media && (
                <PhotoAlbum
                  layout="rows"
                  photos={media}
                  // @ts-ignore
                  renderPhoto={renderPhoto}
                  onClick={({ index }) => setIndex(index)}
                />
              )}
              {slides && (
                <Lightbox
                  slides={slides}
                  open={index >= 0}
                  index={index}
                  close={() => setIndex(-1)}
                  plugins={[Fullscreen, Slideshow, Thumbnails, Zoom, Video]}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const renderPhoto: RenderPhoto = ({
  layout,
  layoutOptions,
  imageProps: {
    alt: type,
    title: guest,
    src,
    style,
    onClick,
    ...restImageProps
  },
}) => {
  return (
    <div
      className="gallery-item-wrapper"
      style={{
        position: "relative",
        border: "2px solid #eee",
        borderRadius: "4px",
        boxSizing: "content-box",
        alignItems: "center",
        width: style?.width,
        padding: `${layoutOptions.padding - 2}px`,
        paddingBottom: 0,
      }}
    >
      {type === "image" ? (
        <>
          <input
            data-href={src}
            className="gallery-item-select"
            type="checkbox"
          />
          <div className="gallery-item-overlay" onClick={onClick} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={src}
            style={{ ...style, width: "100%", padding: 0 }}
            onClick={onClick}
            {...restImageProps}
          />
        </>
      ) : (
        <div className="gallery-video">
          <input className="gallery-item-select" type="checkbox" />
          <div className="gallery-item-overlay" onClick={onClick} />
          <div onClick={onClick}>
            <video
              preload="metadata"
              src={src}
              style={{ ...style, width: "100%", padding: 0 }}
            />
          </div>

          <div onClick={onClick}>
            <svg
              className="play-btn"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 311.69 311.69"
            >
              <path d="M155.84,0A155.85,155.85,0,1,0,311.69,155.84,155.84,155.84,0,0,0,155.84,0Zm0,296.42A140.58,140.58,0,1,1,296.42,155.84,140.58,140.58,0,0,1,155.84,296.42Z"></path>
              <polygon points="218.79 155.84 119.22 94.34 119.22 217.34 218.79 155.84"></polygon>
            </svg>
          </div>
        </div>
      )}
      <div className="gallery-item-info">
        <div className="flex justify-between">
          {guest}
          <a href={src} target="_blank" rel="noreferrer">
            Download
          </a>
        </div>
      </div>
    </div>
  );
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
    let interviews = await getInterviews(eventId);

    // Get media from db
    let media = await getMedia(eventId);

    // TODO: Generate blurhashes
    // const blurImagePromises = results.resources.map((image: ImageProps) => {
    //   return getBase64ImageUrl(image);
    // });
    // const imagesWithBlurDataUrls = await Promise.all(blurImagePromises);

    // for (let i = 0; i < reducedResults.length; i++) {
    //   reducedResults[i].blurDataUrl = imagesWithBlurDataUrls[i];
    // }

    // This is to make the Firestore timestamp object serializable
    interviews = JSON.parse(JSON.stringify(interviews));
    media = JSON.parse(JSON.stringify(media));

    const galleryMedia = media.map((m) => {
      return {
        src: m.publicUrl,
        height: m.metadata.height,
        width: m.metadata.width,
        // react-photo-gallery doesn't let us pass in custom props for render
        // so we will just hijack these ones
        alt: m.metadata.type,
        title: m.guestId,
      };
    });

    return {
      props: {
        title: event.title,
        eventId,
        interviews,
        media: galleryMedia,
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
