import { useState } from "react";
import { formatPhoneNumber } from "../../utils/format";
import { GuestEventRecord } from "../../types";
import { getEvent, getEvents } from "../../lib/firebase";
import { GetStaticPropsContext } from "next";
import { ClipLoader } from "react-spinners";
import { useRouter } from "next/router";
import "intl-tel-input/styles";
import dynamic from "next/dynamic";
// @ts-ignore
const IntlTelInput = dynamic(() => import("intl-tel-input/reactWithUtils"), {
  ssr: false,
});

interface Props {
  title: string;
  eventId: string;
}

export default function Home(props: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [addGuestFirstName, setAddGuestFirstName] = useState("");
  const [addGuestLastName, setAddGuestLastName] = useState("");
  const [addGuestPhone, setAddGuestPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState<boolean | undefined>();

  return (
    <div className="mx-auto max-w-xl py-10 px-2">
      <h1 className="text-4xl mb-4 text-center">Join {props.title}</h1>
      <div className="my-2">
        <p className="block text-sm text-gray-500 mt-1 text-center mb-4">
          Enter your name and phone number to join the event!
        </p>
        <div className="flex gap-4 items-center w-full">
          <div className="flex flex-col gap-4 mb-3 w-full">
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
                <IntlTelInput
                  // @ts-ignore
                  onChangeNumber={setAddGuestPhone}
                  onChangeValidity={setIsPhoneValid}
                  initOptions={{
                    initialCountry: "us",
                  }}
                />
              </div>
            </div>
            <button
              disabled={
                isSaving ||
                !isPhoneValid ||
                !addGuestPhone ||
                (!addGuestFirstName && !addGuestLastName)
              }
              type="button"
              className={`inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 mt-4 text-base font-medium text-white shadow-sm ${
                isSaving ||
                !isPhoneValid ||
                !addGuestPhone ||
                (!addGuestFirstName && !addGuestLastName)
                  ? "bg-indigo-300"
                  : "hover:bg-indigo-700"
              } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              onClick={async () => {
                setIsSaving(true);
                await addGuest(props.eventId, {
                  firstName: addGuestFirstName,
                  lastName: addGuestLastName,
                  phone: formatPhoneNumber(addGuestPhone),
                });
                setAddGuestFirstName("");
                setAddGuestLastName("");
                setAddGuestPhone("");
                setIsSaving(false);

                const telInput =
                  document.getElementsByClassName("iti__tel-input")[0];
                // @ts-ignore
                telInput.value = "";

                router.push(`/${props.eventId}/joinSuccess`);
              }}
            >
              {isSaving ? <ClipLoader color="white" size={"1rem"} /> : "JOIN"}
            </button>
          </div>
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

    // If event doesn't exist or it not in a joinable state, return 404
    if (
      !event ||
      !(
        event.status === "PAID" ||
        event.status === "ACTIVE" ||
        event.status === "SCHEDULED"
      )
    )
      return {
        notFound: true,
      };

    return {
      props: {
        eventId,
        title: event.title,
      },
      revalidate: 60,
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

const addGuest = async (
  eventId: string,
  newGuest: Partial<GuestEventRecord>
) => {
  console.log("Adding guest", { eventId, newGuest });
  try {
    const res = await fetch("/api/updateGuests", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ eventId, newGuest, source: "self-enroll" }),
    });
    const resData = await res.json();

    if (res.status === 200) {
      console.log("added guest");
    } else throw Error(resData);
  } catch (error) {
    console.error("Failed to add guest", error);
  }
};
