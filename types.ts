/**
 * PENDING: Checkout not completed
 * UNPAID: Checkout completed but payment hasn't finished
 * PAID: Payment received
 * SCHEDULED: In task queue
 * ACTIVE: Event active
 * COMPLETED: Event completed
 */
export type EventStatus =
  | "PENDING"
  | "UNPAID"
  | "PAID"
  | "SCHEDULED"
  | "ACTIVE"
  | "COMPLETED";

export interface Event {
  status: EventStatus;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  startAt: string;
  endAt: string;
  location: Location;
  managementKey: string;
  plan: "standard";
}

export interface Location {
  address: string;
  label?: string;
  latLng: { lat: string; lng: string };
}

export interface MediaService {
  enabled: boolean;
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

export interface Media {
  id: string;
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
}

export type UploadType = "media";

