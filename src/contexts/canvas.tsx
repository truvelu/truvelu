import { useLocation } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

type CanvasContextProps = {
  open: boolean;
  selectedCanvasId: string | null;
  onSelectCanvas: (canvasId: string | null) => void;
};

const CanvasContext = React.createContext<CanvasContextProps | null>(null);

function useCanvas() {
  const context = React.useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider.");
  }

  return context;
}

function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);

  console.log({ selectedCanvasId });

  const onSelectCanvas = useCallback((canvasId: string | null) => {
    setSelectedCanvasId(canvasId);
  }, []);

  const open = useMemo(() => selectedCanvasId !== null, [selectedCanvasId]);

  return (
    <CanvasContext.Provider value={{ open, selectedCanvasId, onSelectCanvas }}>
      {children}
    </CanvasContext.Provider>
  );
}

export { useCanvas, CanvasProvider };
