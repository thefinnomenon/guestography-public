export interface Event {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  date: string;
  location: string;
  guests: Guest[];
  interviews: InterviewsService;
  media: MediaService;
}

export interface Guest {
  id: string;
  address1: string;
  address2: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  rsvp: string;
  state: string;
  zipcode: string;
}

export interface InterviewsService {
  enabled: boolean;
  orientation: "landscape" | "portrait";
  initialMessage: Message;
  reminderMessage: Message;
}

export interface MediaService {
  enabled: boolean;
  initialMessage: Message;
  collectionMessage: Message;
}

export interface Message {
  message: string;
  schedule: string;
}

export interface GuestTag {
  id: string;
  name: string;
}

export interface Metadata {
  fileExt: string;
  type: "image" | "video";
  height: number;
  width: number;
}

export interface Interview {
  id: string;
  guestId: string;
  guest: GuestTag[];
  publicUrl: string;
  url: string;
  metadata: Metadata;
}

export interface Media {
  id: string;
  guestId: string;
  publicUrl: string;
  url: string;
  metadata: Metadata;
}

export interface GalleryMedia {
  src: string;
  height: number;
  width: number;
  type: "image" | "video";
  guest: string;
}
