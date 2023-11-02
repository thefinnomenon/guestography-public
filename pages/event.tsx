import { FormEvent, useState } from "react";
import { ClipLoader } from "react-spinners";
import {
  IoPhoneLandscapeSharp,
  IoPhonePortraitSharp,
  IoWarningOutline,
} from "react-icons/io5";
import { track } from "../lib/mixpanel";
import { type SingleValue } from "react-select";

import dynamic from "next/dynamic";
import Script from "next/script";
import { geocodeByPlaceId, getLatLng } from "react-google-places-autocomplete";
import GuestsTable from "../components/GuestsTable";
import { Guest } from "../types";
import { parseGuestListCSV } from "../utils/format";
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
  const [isInterviewsChecked, setIsInterviewsChecked] = useState(true);
  const [isMediaChecked, setIsMediaChecked] = useState(true);
  const [interviewOrientation, setInterviewOrientation] = useState("landscape");
  // const [interviewsInitialMessage, setInterviewsInitialMessage] = useState<
  //   string | undefined
  // >(undefined);
  const [interviewsInitialMessageTime, setInterviewsInitialMessageTime] =
    useState("");
  // const [interviewsReminderMessage, setInterviewsReminderMessage] = useState<
  //   string | undefined
  // >(undefined);
  const [interviewsReminderMessageTime, setInterviewsReminderMessageTime] =
    useState("");
  // const [mediaInitialMessage, setMediaInitialMessage] = useState<
  //   string | undefined
  // >(undefined);
  const [mediaInitialMessageTime, setMediaInitialMessageTime] = useState("");
  const [mediaCollectionMessageTime, setMediaCollectionMessageTime] =
    useState("");
  // const [mediaCollectionMessage, setMediaCollectionMessage] = useState<
  //   string | undefined
  // >(undefined);

  // const interviewsInitialDefaultMessage = `Hi {{FirstName}}! We are collecting guest interviews using Guestography for ${eventTitle} and it’s your turn!\n\nPlease record a short video message (<10 seconds per person) using your smartphone (in ${
  //   interviewOrientation === "landscape" ? "landscape ↔️" : "portrait ↕️"
  // }!) and upload it using the link below.\n{{UploadLink}}\n\nFeel free to include other guests in your video but please mark them in the participants list on the upload page so we know that we already got them!`;
  // const interviewsReminderDefaultMessage = `Hi {{FirstName}}, Guestography again! Just a friendly reminder that there’s still time to record and submit a video message for ${eventTitle}.\n\n{{UploadLink}}`;
  // const mediaInitialDefaultMessage = `Hi {{FirstName}}, we hope you are excited for ${eventTitle}! We wanted to let you know that we are using Guestography to collect photos and videos from everyone so please snap away and tomorrow you will recieve a message asking you to upload your best shots!`;
  // const mediaCollectionDefaultMessage = `Good morning {{FirstName}}! Guestography here and we hope that you had fun at ${eventTitle} yesterday and invite you to share any photos and videos you took by uploading them using the link below.\n\n{{UploadLink}}`;

  const getEstimatedEventEnd = (start: string) => {
    if (!start) return "";
    let d = new Date(start);
    // Correct time zone offset for generating iso string
    d.setMinutes(d.getMinutes() + 60 * 4 - d.getTimezoneOffset());
    return d.toISOString().slice(0, -1);
  };

  const getNextMorning = (start: string) => {
    if (!start) return "";
    let d = new Date(start);
    d.setDate(d.getDate() + 1);
    d.setUTCHours(10);
    d.setMinutes(0);
    return d.toISOString().slice(0, -1);
  };

  const getHourBefore = (start: string) => {
    if (!start) return "";
    let d = new Date(start);
    // Correct time zone offset for generating iso string
    d.setMinutes(d.getMinutes() - 60 - d.getTimezoneOffset());
    return d.toISOString().slice(0, -1);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);

    // Add geocode and latLng to location
    let enhancedLocation = location;
    try {
      if (location?.value?.place_id) {
        const geocode = await geocodeByPlaceId(location.value.place_id);
        if (geocode[0]) {
          const latLng = await getLatLng(geocode[0]);
          enhancedLocation.geocode = geocode[0];
          enhancedLocation.latLong = latLng;
        }
      }
    } catch (err) {
      console.error("Failed to geocode location: ", location, err);
    }

    const eventData = {
      firstName,
      lastName,
      email,
      phone,
      title: eventTitle,
      date: new Date(eventStart).toISOString(),
      dateEnd: new Date(
        eventEnd || getEstimatedEventEnd(eventStart)
      ).toISOString(),
      location: enhancedLocation,
      guests: guestList,
      interviews: {
        enabled: isInterviewsChecked,
        orientation: interviewOrientation,
        initialMessage: {
          // message: interviewsInitialMessage || interviewsInitialDefaultMessage,
          schedule: new Date(
            interviewsInitialMessageTime || eventStart
          ).toISOString(),
        },
        reminderMessage: {
          // message:
          //   interviewsReminderMessage || interviewsReminderDefaultMessage,
          schedule: new Date(
            interviewsReminderMessageTime || getEstimatedEventEnd(eventStart)
          ).toISOString(),
        },
      },
      media: {
        enabled: isMediaChecked,
        initialMessage: {
          // message: mediaInitialMessage || mediaInitialDefaultMessage,
          schedule: new Date(
            mediaInitialMessageTime || getHourBefore(eventStart)
          ).toISOString(),
        },
        collectionMessage: {
          // message: mediaCollectionMessage || mediaCollectionDefaultMessage,
          schedule: new Date(
            mediaCollectionMessageTime || getNextMorning(eventStart)
          ).toISOString(),
        },
      },
    };

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
            <h1 className="text-2xl sm:col-span-2">Personal Information</h1>
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
                  placeholder="555-987-6543"
                  onChange={(e) => setPhone(e.target.value)}
                  value={phone}
                  required
                />
              </div>
            </div>
            <h1 className="mt-8 text-2xl sm:col-span-2">Event Information</h1>
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
                  name="date"
                  id="date"
                  onChange={(e) => setEventStart(e.target.value)}
                  required
                  min={new Date().toLocaleDateString()}
                  max={eventEnd}
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
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
                  value={eventEnd || getEstimatedEventEnd(eventStart)}
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
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
                {/* <input
                  type="text"
                  name="location"
                  id="location"
                  placeholder="10 Rainbow Blvd., Niagara Falls, NY 14303"
                  onChange={(e) => setLocation(e.target.value)}
                  value={location}
                  required
                  className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                /> */}
              </div>
            </div>
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
                      phone: addGuestPhone,
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
            <fieldset className="space-y-5 mt-6 sm:col-span-2">
              <h1 className="text-2xl sm:col-span-2">Services</h1>
              <legend className="sr-only">Services</legend>
              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="interviews"
                    aria-describedby="interviews-description"
                    name="interviews"
                    type="checkbox"
                    onChange={() =>
                      setIsInterviewsChecked(!isInterviewsChecked)
                    }
                    checked={isInterviewsChecked}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="interviews"
                    className="font-medium text-gray-700"
                  >
                    Interviews
                  </label>
                  <p
                    id="interviews-description"
                    className="text-gray-500 text-sm mt-1"
                  >
                    Collect self-recorded wedding messages from your guests &
                    create a wedding interview video.
                  </p>
                </div>
              </div>
              <div className={`ml-6 ${isInterviewsChecked ? "show" : "hide"}`}>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="interviews-orientation"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Video Orientation
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    Guests will be required to film in the selected video
                    orientation.
                  </p>
                  <fieldset className="mt-4 mb-6">
                    <legend className="sr-only">Video orientation</legend>
                    <div className="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
                      <div className="flex items-center">
                        <input
                          id="interviews-orientation-landscape"
                          name="interviews-orientation"
                          value="landscape"
                          type="radio"
                          onChange={(e) =>
                            setInterviewOrientation(e.target.value)
                          }
                          checked={interviewOrientation === "landscape"}
                          className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label
                          htmlFor="interviews-orientation-landscape"
                          className="ml-3 block text-sm font-medium text-gray-700"
                        >
                          <IoPhoneLandscapeSharp className="mr-2 inline text-2xl" />
                          Landscape
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="interviews-orientation-portrait"
                          name="interviews-orientation"
                          value="portrait"
                          type="radio"
                          onChange={(e) =>
                            setInterviewOrientation(e.target.value)
                          }
                          checked={interviewOrientation === "portrait"}
                          className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label
                          htmlFor="interviews-orientation-portrait"
                          className="ml-3 block text-sm font-medium text-gray-700"
                        >
                          <IoPhonePortraitSharp className="mr-2 inline text-2xl" />
                          Portrait
                        </label>
                      </div>
                    </div>
                  </fieldset>
                </div>
                <h1 className="text-xl sm:col-span-2 mb-2">Initial Message</h1>
                <div className="sm:col-span-2 mb-4">
                  <label
                    htmlFor="interviews-initial-schedule"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Schedule
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    We recommend scheduling the message at the start of the
                    event or during a specific downtime (e.g. cocktail hour)
                  </p>
                  <div className="mt-1">
                    <input
                      type="datetime-local"
                      name="interviews-initial-schedule"
                      id="interviews-initial-schedule"
                      onChange={(e) =>
                        setInterviewsInitialMessageTime(e.target.value)
                      }
                      value={interviewsInitialMessageTime || eventStart}
                      required={isInterviewsChecked}
                      min={eventStart}
                      max={interviewsReminderMessageTime}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {/* <div className="sm:col-span-2">
                  <label
                    htmlFor="interviews-initial-message"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    &#123;&#123;FirstName&#125;&#125; will be replaced with the
                    first name of the guest for each message.
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    &#123;&#123;UploadLink&#125;&#125; will be replaced with the
                    interview upload link.
                  </p>
                  <div className="mt-1">
                    <textarea
                      id="interviews-initial-message"
                      name="interviews-initial-message"
                      rows={10}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={(e) =>
                        setInterviewsInitialMessage(e.target.value)
                      }
                      value={
                        interviewsInitialMessage !== undefined
                          ? interviewsInitialMessage
                          : interviewsInitialDefaultMessage
                      }
                      required={isInterviewsChecked}
                    />
                  </div>
                </div> */}
                <h1 className="text-xl sm:col-span-2 mt-6 mb-2">Reminder</h1>
                <div className="sm:col-span-2 mb-4">
                  <label
                    htmlFor="interviews-reminder-schedule"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Schedule
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    We recommend scheduling the message at the end of the event.
                  </p>
                  <div className="mt-1">
                    <input
                      type="datetime-local"
                      name="interviews-reminder-schedule"
                      id="interviews-reminder-schedule"
                      onChange={(e) =>
                        setInterviewsReminderMessageTime(e.target.value)
                      }
                      value={
                        interviewsReminderMessageTime ||
                        getEstimatedEventEnd(eventStart)
                      }
                      min={interviewsInitialMessageTime}
                      max={eventEnd}
                      required={isInterviewsChecked}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {/* <div className="sm:col-span-2">
                  <label
                    htmlFor="interviews-reminder-message"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    &#123;&#123;FirstName&#125;&#125; will be replaced with the
                    first name of the guest for each message.
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    &#123;&#123;UploadLink&#125;&#125; will be replaced with the
                    interview upload link.
                  </p>
                  <div className="mt-1">
                    <textarea
                      id="interviews-reminder-message"
                      name="interviews-reminder-message"
                      rows={5}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={(e) =>
                        setInterviewsReminderMessage(e.target.value)
                      }
                      value={
                        interviewsReminderMessage !== undefined
                          ? interviewsReminderMessage
                          : interviewsReminderDefaultMessage
                      }
                      required={isInterviewsChecked}
                    />
                  </div>
                </div> */}
              </div>
              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="media"
                    aria-describedby="media-description"
                    name="media"
                    type="checkbox"
                    onChange={() => setIsMediaChecked(!isMediaChecked)}
                    checked={isMediaChecked}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="media" className="font-medium text-gray-700">
                    Media
                  </label>
                  <p id="media-description" className="text-gray-500">
                    Collect photos & videos taken by guests & create a gallery.
                  </p>
                </div>
              </div>
              <div className={`${isMediaChecked ? "show" : "hide"} ml-6`}>
                <h1 className="text-xl sm:col-span-2 mb-2">Initial Message</h1>
                <div className="sm:col-span-2 mb-4">
                  <label
                    htmlFor="interviews-initial-schedule"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Schedule
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    We recommend scheduling the message before the start of the
                    event.
                  </p>
                  <div className="mt-1">
                    <input
                      type="datetime-local"
                      name="media-initial-schedule"
                      id="media-initial-schedule"
                      onChange={(e) =>
                        setMediaInitialMessageTime(e.target.value)
                      }
                      value={
                        mediaInitialMessageTime || getHourBefore(eventStart)
                      }
                      max={mediaCollectionMessageTime}
                      required={isMediaChecked}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {/* <div className="sm:col-span-2">
                  <label
                    htmlFor="media-initial-message"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    &#123;&#123;FirstName&#125;&#125; will be replaced with the
                    first name of the guest for each message.
                  </p>
                  <div className="mt-1">
                    <textarea
                      id="media-initial-message"
                      name="media-initial-message"
                      rows={4}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={(e) => setMediaInitialMessage(e.target.value)}
                      value={
                        mediaInitialMessage !== undefined
                          ? mediaInitialMessage
                          : mediaInitialDefaultMessage
                      }
                      required={isMediaChecked}
                    />
                  </div>
                </div> */}
                <h1 className="text-xl sm:col-span-2 mt-6 mb-2">
                  Collection Message
                </h1>
                <div className="sm:col-span-2 mb-4">
                  <label
                    htmlFor="media-collection-schedule"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Schedule
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    We recommend scheduling the message on the morning after the
                    event ends.
                  </p>
                  <div className="mt-1">
                    <input
                      type="datetime-local"
                      name="media-collection-schedule"
                      id="media-collection-schedule"
                      onChange={(e) =>
                        setMediaCollectionMessageTime(e.target.value)
                      }
                      value={
                        mediaCollectionMessageTime || getNextMorning(eventStart)
                      }
                      min={mediaInitialMessageTime}
                      required={isMediaChecked}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {/* <div className="sm:col-span-2">
                  <label
                    htmlFor="media-collection-message"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <p className="text-gray-500 text-sm mt-1">
                    &#123;&#123;FirstName&#125;&#125; will be replaced with the
                    first name of the guest for each message.
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    &#123;&#123;UploadLink&#125;&#125; will be replaced with the
                    media upload link.
                  </p>
                  <div className="mt-1">
                    <textarea
                      id="media-collection-message"
                      name="media-collection-message"
                      rows={5}
                      className="block w-full rounded-md border-gray-300 py-3 px-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      onChange={(e) =>
                        setMediaCollectionMessage(e.target.value)
                      }
                      value={
                        mediaCollectionMessage !== undefined
                          ? mediaCollectionMessage
                          : mediaCollectionDefaultMessage
                      }
                      required={isMediaChecked}
                    />
                  </div>
                </div> */}
              </div>
            </fieldset>
            <div className="sm:col-span-2">
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
