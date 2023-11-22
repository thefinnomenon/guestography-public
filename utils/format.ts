import { Guest } from "../types";
import { csvToJson } from "./csv";

export const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toSafeFilename = (str: string) =>
  str.replace(/[^a-z0-9]/gi, "_").toLowerCase();

export const parseGuestListCSV = async (guestList: FileList | null) => {
  let guestListJson: Omit<Guest, "id">[] = [];
  if (guestList && guestList[0]) {
    // Convert CSV to JSON
    guestListJson = (await csvToJson(guestList[0])) as [any];
    // Filter out guests with no phone number
    guestListJson = guestListJson.filter((guest) => guest.phone);
    // Filter out extra properties
    guestListJson = guestListJson.map((guest) => {
      const { firstName, lastName, phone, email } = guest;
      return {
        firstName,
        lastName,
        phone,
        email,
      };
    });
  }

  return guestListJson;
};

export const formatPhoneNumber = (phone: string) => {
  return phone.indexOf("+") === -1
    ? `+1${phone.replace(/[^+\d]+/g, "")}`
    : phone.replace(/[^+\d]+/g, "");
};
