import { FormEvent, useState } from "react";
import { ClipLoader } from "react-spinners";
import { IoWarningOutline } from "react-icons/io5";
import { track } from "../lib/mixpanel";
import { type SingleValue } from "react-select";

import dynamic from "next/dynamic";
import Script from "next/script";
import { geocodeByPlaceId } from "react-google-places-autocomplete";
import { FaRegFileImage } from "react-icons/fa";
import { IoPeople } from "react-icons/io5";
const GoogleLocationSearch = dynamic(
  () => import("../components/GoogleLocationSearch"),
  { ssr: false }
);
import "intl-tel-input/styles";
// @ts-ignore
const IntlTelInput = dynamic(() => import("intl-tel-input/reactWithUtils"), {
  ssr: false,
});

const tiers = [
  {
    id: "shindig",
    name: "SHINDIG",
    price: "$10/year",
    storage: "10GB",
    guests: 10,
  },
  {
    id: "gathering",
    name: "GATHERING",
    price: "$50/year",
    storage: "50GB",
    guests: 50,
  },
  {
    id: "celebration",
    name: "CELEBRATION",
    price: "$100/year",
    storage: "200GB",
    guests: 200,
  },
  {
    id: "festivity",
    name: "FESTIVITY",
    price: "$300/year",
    storage: "1TB",
    guests: 500,
  },
  {
    id: "enterprise",
    name: "ENTERPRISE",
    price: "CUSTOM",
    storage: "1TB",
    guests: 500,
  },
];

export default function Form() {
  const [hasFormBeenEdited, setHasFormBeenEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [location, setLocation] = useState<SingleValue<any>>();
  const [guestimate, setGuestimate] = useState(10);
  const [plan, setPlan] = useState("");

  const [error, setError] = useState("");

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Add geocode and latLng to location
    let enhancedLocation;
    try {
      if (location?.value?.place_id) {
        const geocode = await geocodeByPlaceId(location.value.place_id);
        if (geocode[0]) {
          enhancedLocation = {
            address: geocode[0].formatted_address,
            label: location?.description,
            latLng: {
              lat: geocode[0].geometry.location.lat,
              lng: geocode[0].geometry.location.lat,
            },
          };
        }
      }
    } catch (err) {
      console.error("Failed to geocode location: ", location, err);
    }

    // Check that eventStart is at least an hour in the future
    if (
      new Date(eventStart) <= new Date(new Date().getTime() + 60 * 60 * 1000)
    ) {
      setError(
        "Event must be scheduled for at least an hour in the future. Please modify the event start and click SCHEDULE again."
      );
      setIsSubmitting(false);
      return;
    }

    // Check that phone number is valid
    if (!isPhoneValid) {
      setError("Please enter a valid phone number");
      setIsSubmitting(false);
      return;
    }

    // Format event data
    const eventData = {
      firstName,
      lastName,
      email,
      phone,
      title: eventTitle,
      startAt: new Date(eventStart).toISOString(),
      location: enhancedLocation,
      plan,
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
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script
        type="text/javascript"
        strategy="beforeInteractive"
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_PLACES_API_KEY}&libraries=places`}
      />
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
          <p className="mt-4 text-lg leading-6 text-gray-500">
            Fill in the following information and click the SCHEDULE button to
            setup Guestography services for your event!
          </p>
        </div>
        <div className="mt-12">
          <form
            onChange={() => {
              if (!hasFormBeenEdited) {
                track("Event form edited");
                setHasFormBeenEdited(true);
              }
            }}
            onSubmit={handleFormSubmit}
            className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8"
          >
            <h1 className="text-2xl sm:col-span-2">Organizer Information</h1>
            {/* FIRST NAME */}
            <div>
              <label
                htmlFor="first-name"
                className="block text-sm font-medium text-gray-700"
              >
                First name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="first-name"
                  id="first-name"
                  autoComplete="given-name"
                  placeholder="Jim"
                  onChange={(e) => setFirstName(e.target.value)}
                  value={firstName}
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* LAST NAME */}
            <div>
              <label
                htmlFor="last-name"
                className="block text-sm font-medium text-gray-700"
              >
                Last name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="last-name"
                  id="last-name"
                  autoComplete="family-name"
                  placeholder="Halpert"
                  onChange={(e) => setLastName(e.target.value)}
                  value={lastName}
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
                  placeholder="jim@dundermifflinpaper.com"
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* PHONE */}
            <div className="sm:col-span-2">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone
              </label>
              <IntlTelInput
                // @ts-ignore
                onChangeNumber={setPhone}
                onChangeValidity={setIsPhoneValid}
                initOptions={{
                  initialCountry: "us",
                }}
              />
            </div>
            <h1 className="mt-8 text-2xl sm:col-span-2">Event Information</h1>
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
                  placeholder="Pam & Jim's Wedding"
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* EVENT START */}
            <div className="sm:col-span-2">
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700"
              >
                Start Date & Time
              </label>
              <div className="mt-1">
                <input
                  type="datetime-local"
                  name="startAt"
                  id="startAt"
                  onChange={(e) => setEventStart(e.target.value)}
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* EVENT LOCATION */}
            <div className="sm:col-span-2">
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700"
              >
                Location
              </label>
              <div className="mt-1">
                <GoogleLocationSearch
                  location={location}
                  setLocation={setLocation}
                />
              </div>
            </div>
            {/* GUESTIMATE & PRICING */}
            <div className="sm:col-span-2 mt-3">
              <label className="block mb-2 text-lg font-medium text-gray-900 dark:text-white">
                What is your Guestimate?
              </label>
              <p className="block text-sm text-gray-500 mt-1 mb-3">
                This will help us figure out which plan works best for your
                event. You can always upgrade later if you need more guests or
                storage.
              </p>
              <p className="text-md float-right font-medium">
                {guestimate === 10 && "< "}
                {guestimate === 500 && "> "}
                {guestimate} Guests
              </p>
              <input
                type="range"
                value={guestimate}
                step={10}
                min={10}
                max={500}
                onChange={(e) => setGuestimate(Number(e.target.value))}
                className="w-full h-3"
              ></input>
              <div className="mt-10">
                {tiers
                  .filter((tier) => {
                    if (guestimate === 500 && tier.id === "festivity")
                      return false;
                    return tier.guests >= guestimate;
                  })
                  .map((tier, i) => {
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setPlan(tier.id)}
                        className={`relative rounded-lg bg-white  border-gray-300 mb-2 border-2 cursor-pointer hover:border-indigo-300 ${
                          tier.id === plan && " !border-indigo-500 shadow-lg"
                        }`}
                      >
                        {i == 0 && tier.id !== "enterprise" && (
                          <span className="absolute bottom-2 right-2 text-sm text-indigo-500 font-medium">
                            Recommended
                          </span>
                        )}
                        {tier.name === "SHINDIG" && (
                          <div>
                            <span className="absolute shadow-md top-[-1rem] right-[-1rem] p-2 rounded-md text-sm bg-indigo-500 text-white font-medium">
                              First year free!
                            </span>
                          </div>
                        )}
                        <div className="px-4 py-5 sm:p-6">
                          <div className="flex justify-between items-center">
                            <p className="text-2xl font-bold">{tier.name}</p>
                            <p
                              className={`text-xl font-medium ${
                                tier.name === "SHINDIG" && "line-through"
                              }`}
                            >
                              {tier.price}
                            </p>
                          </div>
                          {tier.id !== "enterprise" && (
                            <>
                              <div className="flex gap-2 items-center mt-2 mb-1">
                                <FaRegFileImage className="h-5 w-5" />
                                {tier.storage} of gallery storage
                              </div>
                              <div className="flex gap-2 items-center">
                                <IoPeople className="h-5 w-5" />
                                Up to {tier.guests} guests
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* SCHEDULE BUTTON */}
            <div className="sm:col-span-2 mt-8">
              <button
                type="submit"
                className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-700 px-6 py-3 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  !isSubmitting && "hover:bg-indigo-600"
                }`}
                disabled={isSubmitting}
              >
                {!isSubmitting ? (
                  "SCHEDULE"
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
