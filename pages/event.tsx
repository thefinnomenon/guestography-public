import { FormEvent, useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ClipLoader } from "react-spinners";
import { IoWarningOutline } from "react-icons/io5";
import { RiRefund2Line } from "react-icons/ri";
import { track } from "../lib/mixpanel";
import { FaRegFileImage } from "react-icons/fa";
import { MdAccessTime } from "react-icons/md";
import { absoluteUrl } from "../lib/seo";

export default function Form() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [error, setError] = useState("");
  const [discountCode, setDiscountCode] = useState<string | null>(null);

  useEffect(() => {
    if (router.isReady && router.query.discount) {
      setDiscountCode(router.query.discount as string);
    }
  }, [router.isReady, router.query.discount]);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Format event data
    const eventData = {
      email,
      title: eventTitle,
      plan: "standard",
      discountCode: discountCode,
    };

    // Create event
    try {
      const res = await fetch("/api/event", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(eventData),
      });
      const resData = await res.json();

      if (res.status === 200 && resData && resData.checkoutUrl) {
        window.location.href = resData.checkoutUrl;
      } else {
        setIsSubmitting(false);
        const errorMessage = resData?.message || resData?.error || "Failed to create event";
        console.error("Event creation failed:", resData);
        setError(errorMessage);
      }
    } catch (error) {
      console.error("Failed to submit event form", error);
      setIsSubmitting(false);
      setError("Failed to create event. Please check your connection and try again");
    }
  };

  return (
    <>
      <Head>
        <title>Create an Event Gallery | Guestography</title>
        <meta
          name="description"
          content="Create a Guestography event gallery and get printable QR code cards so guests can upload photos and videos from their phones."
        />
        <link rel="canonical" href={absoluteUrl("/event")} />
        <meta property="og:title" content="Create an Event Gallery" />
        <meta
          property="og:description"
          content="Create a QR code photo gallery for your wedding, party, fundraiser, reunion, or event."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={absoluteUrl("/event")} />
        <meta property="og:image" content={absoluteUrl("/landing-page/0.jpg")} />
      </Head>
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
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Create Event
          </h2>
          {discountCode && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-green-800">
                  Great! Your $10 discount ({discountCode}) will be automatically applied at checkout.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-12">
          <form
            onSubmit={handleFormSubmit}
            className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8"
          >
            {/* EVENT TITLE */}
            <div className="sm:col-span-2">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Title
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  onChange={(e) => setEventTitle(e.target.value)}
                  value={eventTitle}
                  placeholder="Sarah & Dave's Wedding"
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* EMAIL */}
            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2 mt-3">
              <div className="relative rounded-lg bg-white border-gray-300 mb-2 border-2">
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xl sm:text-2xl font-bold">GALLERY</p>
                    <p className="text-lg sm:text-xl font-medium">$49</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center text-sm sm:text-base">
                      <FaRegFileImage className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span>100GB of gallery storage</span>
                    </div>
                    <div className="flex gap-2 items-center text-sm sm:text-base">
                      <MdAccessTime className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span>Media stored for 12 months</span>
                    </div>
                    <div className="flex gap-2 items-center text-sm sm:text-base">
                      <RiRefund2Line className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span>7-Day Money Back Guarantee</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CREATE BUTTON */}
            <div className="sm:col-span-2 mt-8">
              <button
                type="submit"
                className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-700 px-6 py-3 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  !isSubmitting && "hover:bg-indigo-600"
                }`}
                disabled={isSubmitting}
              >
                {!isSubmitting ? (
                  "CREATE"
                ) : (
                  <ClipLoader size={24} color="white" />
                )}
              </button>
            </div>
            <div className="sm:col-span-2 mt-[-1.5rem]">
              {error && (
                <div
                  className="flex justify-start p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800"
                  role="alert"
                >
                  <div>
                    <IoWarningOutline className="mr-2" size={24} />
                    <span className="sr-only">Error</span>
                  </div>
                  <div className="mt-[0.1rem]">{error}</div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
        </div>
    </>
  );
}
