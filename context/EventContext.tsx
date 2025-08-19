import { createContext } from "react";

export interface EventContextData {
  eventId: string;
}
 
export const eventContextDefaultValue: EventContextData = {
  eventId: ''
};
 
export const EventContext = createContext<EventContextData>(
  eventContextDefaultValue
);