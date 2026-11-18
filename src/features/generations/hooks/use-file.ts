import { create } from "zustand";

interface FileStore {
  file: File | null;
  previewUrl: string | null;
  setFile: (file: File | null) => void;
  clearFile: () => void;
}

const revoke = (url: string | null) => {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
};

export const useFileStore = create<FileStore>((set, get) => ({
  file: null,
  previewUrl: null,

  setFile: (file) => {
    revoke(get().previewUrl);
    set({ file, previewUrl: file ? URL.createObjectURL(file) : null });
  },

  clearFile: () => {
    revoke(get().previewUrl);
    set({ file: null, previewUrl: null });
  },
}));
