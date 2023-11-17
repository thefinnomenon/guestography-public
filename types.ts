export interface Event {
  /**
   * PENDING: Checkout not completed
   * UNPAID: Checkout completed but payment hasn't finished
   * PAID: Payment received
   * SCHEDULED: In task queue
   * COMPLETED: Event completed
   */
  status: "PENDING" | "UNPAID" | "PAID" | "SCHEDULED" | "COMPLETED";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  date: string;
  endDate: string;
  location: string;
  guests: Guest[];
  interviews: InterviewsService;
  media: MediaService;
}
export interface Guest {
  id: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  iMessage?: boolean;
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
  location?: { lat?: number; long?: number; alt?: number };
  device?: { make?: string; model?: string; version?: string };
  mimeType?: string;
  camera?: string;
  createdAt?: string;
  unsorted?: boolean;
  orientation?: "portrait" | "landscape" | null;
  type: "image" | "video";
  height: number;
  width: number;
  duration?: number;
}

export interface Interview {
  id: string;
  guestId: string;
  guest: GuestTag[];
  publicUrl: string;
  posterUrl: string;
  blurDataURL: string;
  url: string;
  metadata: Metadata;
}

export interface Media {
  id: string;
  guestId: string;
  blurDataURL?: string;
  posterUrl?: string;
  publicUrl: string;
  url: string;
  metadata: Metadata;
  uploadedAt: string;
}

export interface GalleryMedia {
  src: string;
  height: number;
  width: number;
  type: "image" | "video";
  guest: string;
}

export type UploadType = "interview" | "media";
