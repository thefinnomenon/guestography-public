import Head from "next/head";
import { useRouter } from "next/router";

export default function SuccessPage() {
  const router = useRouter();
  const { type, eventId } = router.query;

  let title, message;
  switch (type) {
    case "event_created":
      title = "Event Created!";
      message =
        "Thanks for creating your event with Guestography! You will receive an email shortly with your printable QR Code.";
      break;
    case "schedule":
      title = "Event Scheduled";
      message =
        "Thanks for creating your event with Guestography! You are all set, we will take it from here. Feel free to reach out if you need anything else.";
      break;
    case "media_upload":
      title = "Upload Success";
      message = "Thanks for uploading your photos & videos!";
      break;
    default:
      title = "Success";
      message = "Operation completed successfully!";
  }

  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content={`Upload was successful`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="h-screen">
        <div className="overflow-hidden bg-white py-16 px-4 sm:px-6 lg:px-8 lg:py-24 h-full">
          <div className="relative mx-auto max-w-xl h-full">
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
            <div className="flex flex-col justify-center items-center h-full">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-6">
                {title}
              </h1>
              <p className="text-xl text-center">{message}</p>
              {type === "event_created" && eventId && (
                <a
                  href={`/${eventId}`}
                  className="mt-8 inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Go to Gallery
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
