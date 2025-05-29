"use client"
import { useState, createContext, useContext } from "react";
import type { UIArtifact } from "@/components/create-artifact";

// Initial artifact state
const initialArtifact: UIArtifact = {
  documentId: undefined,
  title: "Resume",
  kind: "resume",
  content: "",
  isVisible: false,
  status: "idle",
};

// Context to hold artifact state
interface ArtifactContextType {
  artifact: UIArtifact;
  setArtifact: React.Dispatch<React.SetStateAction<UIArtifact>>;
  metadata: any;
  setMetadata: React.Dispatch<React.SetStateAction<any>>;
}

const ArtifactContext = createContext<ArtifactContextType | undefined>(
  undefined
);

// Provider component
export function ArtifactProvider({ children }: { children: React.ReactNode }) {
  const [artifact, setArtifact] = useState<UIArtifact>(initialArtifact);
  const [metadata, setMetadata] = useState<any>({});

  return (
    <ArtifactContext.Provider
      value={{ artifact, setArtifact, metadata, setMetadata }}
    >
      {children}
    </ArtifactContext.Provider>
  );
}

// Hook to use artifact state
export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (context === undefined) {
    throw new Error("useArtifact must be used within an ArtifactProvider");
  }
  return context;
}

// Hook to select artifact visibility
export function useArtifactVisibility() {
  const { artifact, setArtifact } = useArtifact();

  const showArtifact = () => {
    setArtifact((current) => ({ ...current, isVisible: true }));
  };

  const hideArtifact = () => {
    setArtifact((current) => ({ ...current, isVisible: false }));
  };

  const toggleArtifact = () => {
    setArtifact((current) => ({ ...current, isVisible: !current.isVisible }));
  };

  return {
    isVisible: artifact.isVisible,
    showArtifact,
    hideArtifact,
    toggleArtifact,
  };
}
