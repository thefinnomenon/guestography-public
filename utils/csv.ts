import Papa from "papaparse";

export const csvToJson = (file: File) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete(results) {
        resolve(results.data);
      },
      error(err) {
        reject(err);
      },
      transformHeader: (header: string) => {
        switch (header) {
          case "First Name":
            return "firstName";
          case "Last Name":
            return "lastName";
          case "Phone":
            return "phone";
          case "Email":
            return "email";
          case "Street Address 1":
            return "address1";
          case "Street Address 2":
            return "address2";
          case "City":
            return "city";
          case "State/Province":
            return "state";
          case "Zip/Postal Code":
            return "zip";
          case "Country":
            return "country";
          case "Wedding Day - RSVP":
            return "rsvp";
        }

        return header;
      },
      transform: (value, header) => {
        switch (header) {
          case "rsvp":
            return value === "Attending";
        }

        return value;
      },
    });
  });
};
