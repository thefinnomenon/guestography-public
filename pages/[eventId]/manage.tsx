import { useState } from "react";
import {
  ImportGuestsFromContacts,
  determineValidGuests,
} from "../../utils/contacts";
import { formatPhoneNumber, parseGuestListCSV } from "../../utils/format";
import { GuestEventRecord } from "../../types";
import { IoWarningOutline } from "react-icons/io5";
import GuestsTable from "../../components/GuestsTable";
import { getEvent, getEvents, getGuests } from "../../lib/firebase";
import { GetStaticPropsContext } from "next";

interface Props {
  guestList: GuestEventRecord[];
  title: string;
  eventId: string;
}

export default function Home(props: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [guestList, setGuestList] = useState<Partial<GuestEventRecord>[]>(
    props.guestList
  );
  const [guestImportError, setGuestImportError] = useState("");
  const [addGuestFirstName, setAddGuestFirstName] = useState("");
  const [addGuestLastName, setAddGuestLastName] = useState("");
  const [addGuestPhone, setAddGuestPhone] = useState("");

  const handleSave = async () => {
    setIsSaving(true);

    const res = await fetch("/api/event", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
      body: JSON.stringify({ eventId: props.eventId, guests: guestList }),
    });

    setIsSaving(false);
  };

  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="text-4xl mb-4">Manage Event</h1>
      <div className="sm:col-span-2 my-2">
        <label
          htmlFor="guest-list"
          className="block text-sm font-medium text-gray-700"
        >
          Guest List
        </label>
        <p className="block text-sm text-gray-500 mt-1 mb-2">
          Import guests via a CSV guest list, directly from your phone contacts,
          manually, or using the invite link.
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
                  const newGuests = await parseGuestListCSV(e.target.files);
                  updateGuestList(
                    props.eventId,
                    guestList,
                    newGuests,
                    setGuestList
                  );
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
                updateGuestList(
                  props.eventId,
                  guestList,
                  await ImportGuestsFromContacts(),
                  setGuestList
                );
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
        <GuestsTable
          eventId={props.eventId}
          guests={guestList}
          setGuests={setGuestList}
        />
        <div className="flex flex-col sm:flex-row gap-4 mb-3">
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
          disabled={!addGuestPhone || (!addGuestFirstName && !addGuestLastName)}
          type="button"
          className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm ${
            !addGuestPhone || (!addGuestFirstName && !addGuestLastName)
              ? "bg-indigo-300"
              : "hover:bg-indigo-700"
          } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          onClick={() => {
            setGuestImportError("");
            updateGuestList(
              props.eventId,
              guestList,
              [
                {
                  firstName: addGuestFirstName,
                  lastName: addGuestLastName,
                  phone: formatPhoneNumber(addGuestPhone),
                },
              ],
              setGuestList
            );
            setAddGuestFirstName("");
            setAddGuestLastName("");
            setAddGuestPhone("");
          }}
        >
          ADD GUEST
        </button>
        {/* TODO: Add invite link with copy button */}
        <div className="float-right text-lg mt-2">
          Guest Count: {guestList.length}
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps(
  context: GetStaticPropsContext<{ eventId: string }>
) {
  // Get eventId from URL
  const eventId = context?.params?.eventId;

  // If no eventId, return 404
  if (!eventId)
    return {
      notFound: true,
    };

  try {
    // Get event from db
    const event = await getEvent(eventId);

    // If event doesn't exist
    if (!event)
      return {
        notFound: true,
      };

    // Get guests
    const guestList = await getGuests(eventId);

    return {
      props: {
        eventId,
        guestList: JSON.parse(JSON.stringify(guestList || [])),
      },
      revalidate: false,
    };
  } catch (e) {
    console.error(e);
    return {
      notFound: true,
    };
  }
}

export async function getStaticPaths() {
  try {
    // Fetch events from db
    const events = await getEvents();

    // If no events return 404
    if (!events)
      return {
        notFound: true,
      };

    // Create paths from events
    const paths = events.map((event) => {
      return { params: { eventId: event.id } };
    });

    return {
      paths,
      fallback: "blocking",
    };
  } catch (e) {
    console.error(e);
    return {
      notFound: true,
    };
  }
}

const updateGuestList = async (
  eventId: string,
  guestList: Partial<GuestEventRecord>[],
  newGuests: Partial<GuestEventRecord>[],
  updateLocal: (guests: Partial<GuestEventRecord>[]) => void
) => {
  console.log("Updating guest list", { eventId, guestList, newGuests });
  try {
    const res = await fetch("/api/updateGuests", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ eventId, guestList, newGuests }),
    });
    const resData = await res.json();

    if (res.status === 200) {
      console.log("updated guest list");
      updateLocal(resData);
    } else throw Error(resData);
  } catch (error) {
    console.error("Failed to update guest list", error);
  }
};

export const removeGuest = async (
  eventId: string,
  guestList: Partial<GuestEventRecord>[],
  guestPhoneNumberToRemove: string,
  updateLocal: (guests: Partial<GuestEventRecord>[]) => void
) => {
  console.log("Removing guest", {
    eventId,
    guestList,
    guestPhoneNumberToRemove,
  });
  try {
    const res = await fetch("/api/updateGuests", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
      body: JSON.stringify({
        eventId,
        guestList,
        guestPhoneNumberToRemove,
      }),
    });
    const resData = await res.json();

    if (res.status === 200) {
      console.log("updated guest list");
      updateLocal(resData);
    } else throw Error(resData);
  } catch (error) {
    console.error("Failed to update guest list", error);
  }
};
