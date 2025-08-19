import { FormEvent, useState } from "react";
import { ClipLoader } from "react-spinners";
import { IoWarningOutline } from "react-icons/io5";
import { RiRefund2Line } from "react-icons/ri";
import { track } from "../lib/mixpanel";
import { FaRegFileImage } from "react-icons/fa";
import { MdAccessTime } from "react-icons/md";

export default function Form() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [error, setError] = useState("");

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Format event data
    const eventData = {
      email,
      title: eventTitle,
      plan: "standard",
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

      if (res.status === 200 && resData && resData.checkoutUrl)
        window.location.href = resData.checkoutUrl;
      else {
        setIsSubmitting(false);
        throw Error(resData);
      }
    } catch (error) {
      console.error("Failed to submit event form", error);
      setError("Failed to create event. Please try again");
    }
  };

  return (
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
            <div className="sm:col-span-2 mt-3">
              <div className="relative rounded-lg bg-white border-gray-300 mb-2 border-2">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold">GALLERY</p>
                    <p className="text-xl font-medium">$20</p>
                  </div>
                  <div className="flex gap-2 items-center mt-2 mb-1">
                    <FaRegFileImage className="h-5 w-5" />
                    100GB of gallery storage
                  </div>
                  <div className="flex gap-2 items-center mb-1">
                    <MdAccessTime className="h-5 w-5" />
                    Media stored for 3 months
                  </div>
                  <div className="flex gap-2 items-center">
                    <RiRefund2Line className="h-5 w-5" />
                    7-Day Money Back Guarantee
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
  );
}
