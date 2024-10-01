import { Guest, GuestEventRecord } from "../types";
import { formatPhoneNumber } from "./format";
import { checkAndroid, checkIos } from "./platformDetection";

type Contact = {
  name: string[];
  email: string[];
  tel: string[];
};

export const ImportGuestsFromContacts = async () => {
  const contacts = await readContacts();
  return contacts.map((c: Contact) => {
    const lastSpace = c.name[0].lastIndexOf(" ");
    return {
      firstName:
        lastSpace === -1 ? c.name[0] : c.name[0].substring(0, lastSpace),
      lastName:
        lastSpace === -1
          ? ""
          : c.name[0].substring(lastSpace + 1, c.name[0].length),
      phone: formatPhoneNumber(c.tel[0]),
      email: c.email[0],
    };
  }) as Omit<Guest, "id">[];
};

const readContacts = async () => {
  /* @ts-ignore */
  const api = navigator.contacts || navigator.mozContacts;

  if (api && !!api.select) {
    try {
      const contacts = await api.select(["name", "tel", "email"], {
        multiple: true,
      });

      return contacts;
    } catch (err) {
      console.error("Fetching contacts failed: " + err);
      throw Error("Failed to import from contacts");
    }
  } else {
    if (!checkAndroid() && !checkIos())
      throw Error(
        "In order to import from your phone, you must be in a mobile browser."
      );
    if (checkIos())
      throw Error(
        "<p>You must enable Contacts access</p><ul><li>Open iPhone <b>Settings</b> and select <b>Safari</b></li><li>Select <b>Advanced</b></li><li>Select <b>Feature Flags</b></li><li>Toggle the <b>Contact Picker API</b></li><li><b>Reload</b> the page</li>"
      );
    throw Error("Browser does not support Contacts API or permission denied.");
  }
};

export const determineValidGuests = (
  guestList: Partial<GuestEventRecord>[],
  guestsToPossiblyAdd: Partial<GuestEventRecord>[]
) => {
  return (
    guestsToPossiblyAdd
      // Guest entry must have either a first or last name and a phone number
      .filter(
        (guestToPossiblyAdd) =>
          (guestToPossiblyAdd.firstName || guestToPossiblyAdd.lastName) &&
          guestToPossiblyAdd.phone
      )
      // Guest entry must have a unique phone number
      .filter(
        (guestToPossiblyAdd) =>
          !guestList.find(
            (existingGuest) => existingGuest.phone === guestToPossiblyAdd.phone
          )
      )
  );
};
