import React, { MutableRefObject } from "react";
import Uppy from "@uppy/core";
import AwsS3Multipart from "@uppy/aws-s3-multipart";
import { UploadType } from "../types";
import { Tag } from "react-tag-autocomplete";

const fetchUploadApiEndpoint = async (endpoint: string, data: any) => {
  const res = await fetch(`/api/multipart-upload/${endpoint}`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return res.json();
};

export function MultipartFileUploader({
  eventId,
  guestId,
  guests,
  uploadType,
  onProgressUpdate,
  onUploadSuccess,
  onUploadFail,
  onComplete,
  onUploadStart,
}: {
  eventId: string;
  guestId: string;
  guests?: MutableRefObject<Tag[]>;
  uploadType: UploadType;
  onProgressUpdate: (fileId: string, progress: number) => void;
  onUploadSuccess: (fileId: string) => void;
  onUploadFail: (fileId: string) => void;
  onComplete?: (isComplete: boolean) => void;
  onUploadStart?: (fileIds: string[]) => void;
}) {
  const uppy = new Uppy().use(AwsS3Multipart, {
    createMultipartUpload: async (file) => {
      return fetchUploadApiEndpoint("create-multipart-upload", {
        uploadType,
        fileName: file.name,
        fileExt: file.extension,
        eventId,
        guestId,
        contentType: file.type,
      });
    },
    prepareUploadParts: (file, partData) =>
      fetchUploadApiEndpoint("prepare-upload-parts", {
        partData,
      }),
    completeMultipartUpload: (file, props) =>
      fetchUploadApiEndpoint("complete-multipart-upload", {
        uploadType,
        eventId,
        guestId,
        guests: guests?.current,
        ...props,
      }),
    listParts: (file, props) =>
      fetchUploadApiEndpoint("list-parts", { ...props }),
    abortMultipartUpload: (file, props) =>
      fetchUploadApiEndpoint("abort-multipart-upload", {
        ...props,
      }),
  });

  uppy.on("upload", (data) => {
    if (onUploadStart) onUploadStart(data.fileIDs);
  });
  uppy.on("upload-progress", (file, progress) => {
    if (!file) throw Error("File is undefined");
    onProgressUpdate(
      file.id,
      Math.round((100 * progress.bytesUploaded) / progress.bytesTotal)
    );
  });
  uppy.on("upload-success", (file) => {
    if (!file) throw Error("File is undefined");
    onUploadSuccess(file.id);
  });
  uppy.on("upload-error", (file, error) => {
    if (!file) throw Error("File is undefined");
    console.error("File upload error: ", file, error);
    onUploadFail(file.id);
  });
  uppy.on("complete", (result) => {
    if (onComplete) onComplete(result.failed.length === 0);
  });

  return uppy;
}
