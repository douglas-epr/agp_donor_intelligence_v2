"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "agp_selected_upload_id";

type UploadContextType = {
  selectedUploadId: string | null;
  setSelectedUploadId: (id: string | null) => void;
};

const UploadContext = createContext<UploadContextType>({
  selectedUploadId: null,
  setSelectedUploadId: () => {},
});

export function UploadContextProvider({ children }: { children: React.ReactNode }) {
  const [selectedUploadId, setSelectedUploadIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedUploadIdState(stored);
  }, []);

  function setSelectedUploadId(id: string | null) {
    setSelectedUploadIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <UploadContext.Provider value={{ selectedUploadId, setSelectedUploadId }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext() {
  return useContext(UploadContext);
}
