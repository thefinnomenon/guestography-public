import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { IoChevronBackOutline } from "react-icons/io5";
import { useEffect, useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const path = router.pathname;
  const { eventId, guestId, key } = router.query;
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Fetch event status for gallery pages
  useEffect(() => {
    if (path === "/[eventId]" && eventId && typeof eventId === "string") {
      setStatusLoading(true);
      fetch(`/api/event-status/${eventId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.status) {
            setEventStatus(data.status);
          }
        })
        .catch((error) => {
          console.error("Error fetching event status:", error);
          // On error, allow upload button to show (fail open)
          setEventStatus("ACTIVE");
        })
        .finally(() => {
          setStatusLoading(false);
        });
    } else {
      // Reset state when not on gallery page
      setEventStatus(null);
      setStatusLoading(false);
    }
  }, [path, eventId]);

  let buttonData, showBackNavToGallery;
  switch (path) {
    case "/":
      buttonData = {
        title: "CREATE EVENT",
        href: "/event",
      };
      break;
    case "/[eventId]":
      // Only show upload button after status is loaded and event is not completed
      if (eventId && !statusLoading && eventStatus && eventStatus !== "COMPLETED") {
        buttonData = {
          title: "UPLOAD",
          href: `/${eventId}/upload/media`,
        };
      }
      break;
    case "/[eventId]/manage":
      showBackNavToGallery = true;
  }

  return (
    <nav className="bg-indigo-500">
      <>
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            {showBackNavToGallery && (
              <Link
                href={`/${eventId}?key=${key}`}
                className="p-4 mr-4"
              >
                <IoChevronBackOutline className="h-8 w-8 text-white hover:text-violet-200" />
              </Link>
            )}
            <div className="flex flex-row flex-1 flex-shrink-0 items-center sm:items-stretch sm:justify-start">
              <a href="https://guestography.com">
                <div className="flex items-center text-white">
                  <Image
                    className="mr-4"
                    src="/icon_white.png"
                    alt="Guestography logo"
                    height={40}
                    width={40}
                  />
                  <span
                    className={`text-xl font-medium ${
                      buttonData ? "hidden" : ""
                    } sm:block`}
                  >
                    Guestography
                  </span>
                </div>
              </a>
            </div>
            <div className="flex items-center gap-4">
              {path === "/" && (
                <Link
                  href="/blog"
                  className="rounded-md px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
                >
                  Blog
                </Link>
              )}
              {buttonData && (
                <Link
                  className="cursor-pointer inline-flex items-center justify-center rounded-md border border-transparent bg-white px-6 py-3 text-base font-medium text-indigo-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-indigo-100"
                  href={buttonData.href}
                >
                  {buttonData.title}
                </Link>
              )}
            </div>
          </div>
        </div>
      </>
    </nav>
  );
}
