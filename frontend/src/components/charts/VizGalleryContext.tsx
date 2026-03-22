import { createContext } from "react";

/** When set, "Full screen" on a chart opens the group slideshow instead of local zoom. */
export type VizGalleryBus = {
  openGroupFullscreen: (stepIndex: number) => void;
};

export const VizGalleryBusContext = createContext<VizGalleryBus | null>(null);

/** Step index for this subtree (0-based). Undefined outside a multi-step gallery embed. */
export const VizGalleryStepIndexContext = createContext<number | undefined>(undefined);

/** True inside the group fullscreen overlay body (use local chart fullscreen + higher z-index). */
export const VizGalleryOverlayInnerContext = createContext(false);

/** Overlay reports nested ChartTableToggle fullscreen so Escape closes inner first. */
export const VizGalleryNestedFsContext = createContext<{
  setNestedFullscreenOpen: (open: boolean) => void;
} | null>(null);
