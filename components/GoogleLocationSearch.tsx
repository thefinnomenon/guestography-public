import GooglePlacesAutocomplete from "react-google-places-autocomplete";

import { SingleValue } from "react-select";

type Props = {
  location: SingleValue<any>;
  setLocation(location: SingleValue<any>): void;
};

export default function GoogleLocationSearch({ location, setLocation }: Props) {
  return (
    <GooglePlacesAutocomplete
      selectProps={{
        value: location,
        onChange: setLocation,
        id: "location-select",
        instanceId: "location-select",
      }}
    />
  );
}
