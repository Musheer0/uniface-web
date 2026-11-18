"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload } from "lucide-react";

import { useFileStore } from "../hooks/use-file";
import { MAX_PHOTO_LIMIT, MAX_VIDEO_LIMIT } from "@/lib/constants";

const UploadFile = () => {
  const { file, setFile } = useFileStore();
  const [error, setError] = useState("");

  const validator = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return {
        code: "invalid-type",
        message: "Only images and videos are allowed.",
      };
    }

    const limit = file.type.startsWith("video/")
      ? MAX_VIDEO_LIMIT
      : MAX_PHOTO_LIMIT;

    if (file.size > limit) {
      return {
        code: "file-too-large",
        message: `File exceeds the ${limit / (1024 * 1024)} MB limit.`,
      };
    }

    return null;
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      setError("");
      if (rejections.length > 0) {
        setError(rejections[0].errors[0].message);
        return;
      }
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
    [setFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    validator,
    accept: { "image/*": [], "video/*": [] },
    multiple: false,
    maxFiles: 1,
    noClick: !!file,
    noKeyboard: !!file,
  });

  if (file) return null;

  return (
    <div
      {...getRootProps()}
      className={`relative flex-1 h-full min-h-0 overflow-hidden bg-black flex items-center justify-center transition-colors duration-200 cursor-pointer ${
        isDragActive ? "ring-2 ring-inset ring-red-500 bg-zinc-950" : ""
      }`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div
          className={`size-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center transition-all ${
            isDragActive ? "scale-110 border-red-500/50" : ""
          }`}
        >
          <Upload className="size-6 text-white/70" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white">
            {isDragActive ? "Drop your file here" : "Upload an image or video"}
          </p>
          <p className="text-xs text-zinc-500">Drag and drop or click to browse</p>
          <p className="text-[11px] text-zinc-600">
            Images up to {MAX_PHOTO_LIMIT / (1024 * 1024)} MB · Videos up to{" "}
            {MAX_VIDEO_LIMIT / (1024 * 1024)} MB
          </p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default UploadFile;
