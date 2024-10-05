import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { IoChevronBackOutline } from "react-icons/io5";

export default function NavBar() {
  const router = useRouter();
  const path = router.pathname;
  const [query, setQuery] = useState<{
    eventId?: string;
    guestId?: string;
    key?: string;
  }>({});

  useEffect(() => {
    if (router.isReady) setQuery(router.query);
  }, [router]);

  let buttonData, showBackNavToGallery;
  switch (path) {
    case "/":
      buttonData = {
        title: "CREATE EVENT",
        href: "event",
      };
      break;
    case "/[eventId]":
      buttonData = query.eventId &&
        query.guestId && {
          title: "UPLOAD",
          href: `${query.eventId}/upload/media?guestId=${query.guestId}`,
        };
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
                href={`/${query.eventId}?key=${query.key}`}
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
                  <span className="text-xl font-medium hidden sm:block">
                    Guestography
                  </span>
                </div>
              </a>
            </div>
            {buttonData && (
              <a
                className="cursor-pointer inline-fle items-center justify-center rounded-md border border-transparent bg-white px-6 py-3 text-base font-medium text-indigo-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-indigo-100"
                href={buttonData.href}
              >
                {buttonData.title}
              </a>
            )}
          </div>
        </div>
      </>
    </nav>
  );
}
