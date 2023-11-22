import { FormEvent, useState } from "react";
import { ClipLoader } from "react-spinners";
import { IoWarningOutline } from "react-icons/io5";
import { track } from "../lib/mixpanel";
import { type SingleValue } from "react-select";

import dynamic from "next/dynamic";
import Script from "next/script";
import { geocodeByPlaceId } from "react-google-places-autocomplete";
import GuestsTable from "../components/GuestsTable";
import { Guest } from "../types";
import { formatPhoneNumber, parseGuestListCSV } from "../utils/format";
import {
  ImportGuestsFromContacts,
  determineValidGuests,
} from "../utils/contacts";
const GoogleLocationSearch = dynamic(
  () => import("../components/GoogleLocationSearch"),
  { ssr: false }
);

export default function Form() {
  const [hasFormBeenEdited, setHasFormBeenEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [location, setLocation] = useState<SingleValue<any>>();
  const [guestList, setGuestList] = useState<Omit<Guest, "id">[]>([]);
  const [addGuestFirstName, setAddGuestFirstName] = useState("");
  const [addGuestLastName, setAddGuestLastName] = useState("");
  const [addGuestPhone, setAddGuestPhone] = useState("");
  const [guestImportError, setGuestImportError] = useState("");

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

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

    // Format event data
    const eventData = {
      firstName,
      lastName,
      email,
      phone,
      title: eventTitle,
      startAt: new Date(eventStart).toISOString(),
      endAt: new Date(eventEnd).toISOString(),
      location: enhancedLocation,
      guests: guestList,
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
                className="block text-sm font-medium text-gray-700"
              >
                Phone
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  autoComplete="tel"
                  className="block w-full rounded-md border-gray-300 py-3 px-4 focus:border-indigo-500 focus:ring-indigo-500" // pl-20
                  placeholder="+1-555-987-6543"
                  onChange={(e) => setPhone(e.target.value)}
                  value={phone}
                  required
                />
              </div>
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
                  min={new Date().toLocaleDateString()}
                  max={eventEnd}
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* EVENT END */}
            <div className="sm:col-span-2">
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700"
              >
                End Date & Time
              </label>
              <div className="mt-1">
                <input
                  type="datetime-local"
                  name="date"
                  id="date"
                  min={eventStart}
                  onChange={(e) => setEventEnd(e.target.value)}
                  value={eventEnd}
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
            {/* GUEST LIST */}
            <div className="sm:col-span-2">
              <label
                htmlFor="guest-list"
                className="block text-sm font-medium text-gray-700"
              >
                Guest List
              </label>
              <p className="block text-sm text-gray-500 mt-1 mb-3">
                Import a CSV of your guest list, add them directly from your
                phone contacts, or manually add each guest.
              </p>
              <div className="flex gap-4 items-center">
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-2 py-2 text-md font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => {
                      setGuestImportError("");
                      document?.getElementById("guest-list")?.click();
                    }}
                  >
                    Import CSV
                  </button>
                  <input
                    type="file"
                    accept=".csv"
                    name="guest-list"
                    id="guest-list"
                    onChange={async (e) => {
                      if (e.target.files) {
                        const uniqueGuests = determineValidGuests(
                          guestList,
                          await parseGuestListCSV(e.target.files)
                        );
                        if (uniqueGuests.length !== 0)
                          setGuestList([...uniqueGuests, ...guestList]);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-2 py-2 text-md font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={async () => {
                    setGuestImportError("");
                    try {
                      const uniqueGuests = determineValidGuests(
                        guestList,
                        await ImportGuestsFromContacts()
                      );
                      if (uniqueGuests.length !== 0)
                        setGuestList([...uniqueGuests, ...guestList]);
                    } catch (err: any) {
                      setGuestImportError(err.message);
                    }
                  }}
                >
                  Import From Phone
                </button>
              </div>
              {guestImportError !== "" && (
                <div
                  className="flex justify-start p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200"
                  role="alert"
                >
                  <div>
                    <IoWarningOutline className="mr-2" size={24} />
                    <span className="sr-only">Info</span>
                  </div>
                  <div
                    className="text-left"
                    dangerouslySetInnerHTML={{ __html: guestImportError }}
                  />
                </div>
              )}
              <GuestsTable guests={guestList} setGuests={setGuestList} />
              <div className="flex gap-4 mb-3">
                <div>
                  <label
                    htmlFor="guestFirstName"
                    className="text-sm font-medium leading-6 text-gray-900"
                  >
                    First Name
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="guestFirstName"
                      id="guestFirstName"
                      placeholder="Michael"
                      value={addGuestFirstName}
                      onChange={(e) => setAddGuestFirstName(e.target.value)}
                      className="w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="guestLastName"
                    className="text-sm font-medium leading-6 text-gray-900"
                  >
                    Last Name
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="guetsLastName"
                      id="guestLastName"
                      placeholder="Scott"
                      value={addGuestLastName}
                      onChange={(e) => setAddGuestLastName(e.target.value)}
                      className="w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="guestPhone"
                    className="text-sm font-medium leading-6 text-gray-900"
                  >
                    Phone
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="guestPhone"
                      id="guestPhone"
                      placeholder="570-555-4118"
                      value={addGuestPhone}
                      onChange={(e) => setAddGuestPhone(e.target.value)}
                      className="w-full rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
              </div>
              <button
                disabled={
                  !addGuestPhone || (!addGuestFirstName && !addGuestLastName)
                }
                type="button"
                className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm ${
                  !addGuestPhone || (!addGuestFirstName && !addGuestLastName)
                    ? "bg-indigo-300"
                    : "hover:bg-indigo-700"
                } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                onClick={() => {
                  setGuestImportError("");
                  const uniqueGuests = determineValidGuests(guestList, [
                    {
                      firstName: addGuestFirstName,
                      lastName: addGuestLastName,
                      phone: formatPhoneNumber(addGuestPhone),
                    },
                  ]);
                  if (uniqueGuests.length !== 0)
                    setGuestList([...uniqueGuests, ...guestList]);
                  setAddGuestFirstName("");
                  setAddGuestLastName("");
                  setAddGuestPhone("");
                }}
              >
                ADD GUEST
              </button>
              <div className="float-right text-lg mt-2">
                Guest Count: {guestList.length}
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
          </form>
        </div>
      </div>
    </div>
  );
}
