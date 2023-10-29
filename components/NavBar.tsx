import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const path = router.pathname;
  const [query, setQuery] = useState<{ eventId?: string; guestId?: string }>(
    {}
  );

  useEffect(() => {
    if (router.isReady) setQuery(router.query);
  }, [router]);

  let buttonData;
  switch (path) {
    case "/":
      buttonData = {
        title: "CREATE EVENT",
        href: "event",
      };
      break;
    case "/[eventId]":
      buttonData = {
        title: "UPLOAD",
        href: `${query.eventId}/upload/media${
          query.guestId ? `?guestId=${query.guestId}` : ""
        }`,
      };
  }

  return (
    <nav className="bg-indigo-500">
      <>
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            <div className="flex flex-row flex-1 flex-shrink-0 items-center sm:items-stretch sm:justify-start">
              <a href="https://guestography.com">
                <div className="flex items-center text-white">
                  <Image
                    className="mr-4"
                    src="/logo.png"
                    alt="Guestography"
                    height={40}
                    width={40}
                  />
                  <span className="text-xl font-medium">Guestography</span>
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
