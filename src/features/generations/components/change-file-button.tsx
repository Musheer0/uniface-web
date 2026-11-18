import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useFileStore } from "../hooks/use-file";
import { MAX_PHOTO_LIMIT, MAX_VIDEO_LIMIT } from "@/lib/constants";

const ChangeFileButton = () => {
  const { file } = useFileStore();

  const { open, getInputProps } = useDropzone({
    accept: {
      "image/*": [],
      "video/*": [],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
    validator: (file) => {
      const limit = file.type.startsWith("video/")
        ? MAX_VIDEO_LIMIT
        : MAX_PHOTO_LIMIT;

      if (file.size > limit) {
        return {
          code: "file-too-large",
          message: "File too large",
        };
      }

      return null;
    },
    onDrop: (files) => {
      if (files.length) {
        useFileStore.getState().setFile(files[0]);
      }
    },
  });

  if (!file) return null;

  return (
    <>
      <input {...getInputProps()} />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={open}
        className="gap-2"
      >
        <Upload className="size-4" />
        Change file
      </Button>
    </>
  );
};

export default ChangeFileButton;