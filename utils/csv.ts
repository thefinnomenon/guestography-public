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
    });
  });
};
