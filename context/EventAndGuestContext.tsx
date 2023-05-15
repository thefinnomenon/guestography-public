import { createContext } from "react";

export interface EventAndGuestContextData {
  eventId: string;
  guestId?: string;
}
 
export const eventAndGuestContextDefaultValue: EventAndGuestContextData = {
  eventId: '',
  guestId: ''
};
 
export const EventAndGuestContext = createContext<EventAndGuestContextData>(
  eventAndGuestContextDefaultValue
);