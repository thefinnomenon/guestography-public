import { useEffect, useState } from "react";
import Image from "next/image";

const exampleImages = Array.from(
  Array(52).keys(),
  (item, i) => `/landing-page/${i}.jpg`
);

const eventTypes = [
  "Wedding",
  "Birthday",
  "New Years",
  "Trip",
  "Game Day",
  "Baby Shower",
  "Prom",
  "Bachelor Party",
  "Bachelorette Party",
  "Block Party",
  "Bridal Shower",
  "Reunion",
  "Race",
  "Fundraiser",
  "House Party",
  "Pool Party",
  "Concert",
];

const eventColors = [
  "indigo",
  "red",
  "blue",
  "orange",
  "green",
  "violet",
  "slateblue",
  "tomato",
  "Pink",
  "Gold",
  "LimeGreen",
  "HotPink",
  "SeaGreen",
  "SteelBlue",
  "Turquoise",
  "lightcoral",
  "RoyalBlue",
  "BurlyWood",
  "Peru",
  "Maroon",
  "Silver",
];

export default function Example() {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!index) {
      setIndex(Math.round(Math.random() * 100));
      return;
    }

    const interval = setInterval(() => setIndex(index + 1), 4000);
    return () => clearInterval(interval);
  }, [index]);

  return (
    <div className="bg-white mb-12">
      <main>
        <div className="relative isolate">
          <svg
            className="absolute inset-x-0 top-0 -z-10 h-[64rem] w-full stroke-gray-200 [mask-image:radial-gradient(32rem_32rem_at_center,white,transparent)]"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84"
                width={200}
                height={200}
                x="50%"
                y={-1}
                patternUnits="userSpaceOnUse"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
              <path
                d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                strokeWidth={0}
              />
            </svg>
            <rect
              width="100%"
              height="100%"
              strokeWidth={0}
              fill="url(#1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84)"
            />
          </svg>
          <div
            className="absolute left-1/2 right-0 top-0 -z-10 -ml-24 transform-gpu overflow-hidden blur-3xl lg:ml-24 xl:ml-48"
            aria-hidden="true"
          >
            <div
              className="aspect-[801/1036] w-[50.0625rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
              style={{
                clipPath:
                  "polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)",
              }}
            />
          </div>
          <div className="overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 lg:px-8 lg:pt-24">
              <div className="mx-auto max-w-2xl gap-x-14 lg:mx-0 lg:flex lg:max-w-none lg:items-center">
                <div className="w-full max-w-xl lg:shrink-0 xl:max-w-2xl">
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                    Capture your{" "}
                    <span
                      style={{
                        color:
                          eventColors[(index || 0) % (eventColors.length - 1)],
                      }}
                    >
                      {eventTypes[(index || 0) % (eventTypes.length - 1)]}
                    </span>{" "}
                    through the eyes of your guests
                  </h1>
                  <p className="relative mt-6 text-lg leading-8 text-gray-600 sm:max-w-md lg:max-w-none">
                    With Guestography, your guests will receive texts with
                    instructions on how to record and upload media for your
                    event. Simple to use, no app to download, and works for both
                    iPhone & Android (no green message bubble hate!).
                  </p>
                  <div className="mt-10 flex items-center gap-x-6">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                      href="/event"
                      className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-xl font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      Create Event
                    </a>
                    <a
                      href="https://guestography.com/alyssa-mikes-wedding-QUCb"
                      className="text-md font-semibold leading-6 text-gray-900"
                    >
                      See Demo Gallery <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
                <div className="mt-14 flex justify-end gap-8 sm:-mt-44 sm:justify-start sm:pl-20 lg:mt-0 lg:pl-0">
                  <div className="ml-auto w-44 flex-none space-y-8 pt-32 sm:ml-0 sm:pt-80 lg:order-last lg:pt-36 xl:order-none xl:pt-80">
                    <div className="relative">
                      <img
                        src={
                          exampleImages[
                            ((index || 0) * 5) % (exampleImages.length - 1)
                          ]
                        }
                        alt="Example event image"
                        className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10" />
                    </div>
                  </div>
                  <div className="mr-auto w-44 flex-none space-y-8 sm:mr-0 sm:pt-52 lg:pt-36">
                    <div className="relative">
                      <img
                        src={
                          exampleImages[
                            ((index || 0) * 5 + 1) % (exampleImages.length - 1)
                          ]
                        }
                        alt="Example event image"
                        className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10" />
                    </div>
                    <div className="relative">
                      <img
                        src={
                          exampleImages[
                            ((index || 0) * 5 + 2) % (exampleImages.length - 1)
                          ]
                        }
                        alt="Example event image"
                        className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10" />
                    </div>
                  </div>
                  <div className="w-44 flex-none space-y-8 pt-32 sm:pt-0">
                    <div className="relative">
                      <img
                        src={
                          exampleImages[
                            ((index || 0) * 5 + 3) % (exampleImages.length - 1)
                          ]
                        }
                        alt="Example event image"
                        className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10" />
                    </div>
                    <div className="relative">
                      <img
                        src={
                          exampleImages[
                            ((index || 0) * 5 + 4) % (exampleImages.length - 1)
                          ]
                        }
                        alt="Example event image"
                        className="aspect-[2/3] w-full rounded-xl bg-gray-900/5 object-cover shadow-lg"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Collect Media Block */}
        <div className="flex flex-wrap lg:flex-nowrap flex-col-reverse lg:flex-row mx-auto max-w-7xl px-6 py-12 sm:py-12 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-12">
          <div className="mt-0 lg:flex-shrink-0 lg:flex-grow">
            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
              <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
              <div className="rounded-[2rem] overflow-hidden w-[272px] h-[572px] bg-white dark:bg-gray-800">
                <img
                  className="object-cover object-center  w-[272px] h-[572px]"
                  src={exampleImages[(index || 0) % (exampleImages.length - 1)]}
                  alt="iPhone mockup with example event images"
                />
              </div>
            </div>
          </div>
          <div className="mb-12 mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Collect media from your guests
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              The media service collects photos and videos that your guests took
              during your event and creates a gallery for everyone to view.
            </p>
          </div>
        </div>
        {/* Collect Video Messages Block */}
        <div className="flex flex-wrap flex-col-reverse lg:flex-nowrap lg:flex-row-reverse mx-auto max-w-7xl px-6 py-12 sm:py-12 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-12">
          <div className="mt-0 lg:flex-shrink-0 lg:flex-grow">
            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
              <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
              <div className="rounded-[2rem] overflow-hidden w-[272px] h-[572px] bg-white dark:bg-gray-800"></div>
            </div>
          </div>
          <div className="mb-12 mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Create a video from guest messages
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              The video message service collects video messages from your guests
              and stiches them together to make a special video for your event.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
