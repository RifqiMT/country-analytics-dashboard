import { useEffect } from "react";
import { getJson, postJson } from "../api";

const SESSION_KEY = "cap-app-bootstrap-v1";

/**
 * Once per browser tab session: prefetch catalogs and ask the backend to warm the full
 * country × metrics × year-range cache (same keys as dashboard series API).
 */
export function useAppBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode — still try network */
    }

    void getJson<unknown[]>("/api/countries").catch(() => {});
    void getJson<unknown[]>("/api/metrics").catch(() => {});
    void getJson<unknown>("/api/data-providers").catch(() => {});
    void postJson<{ status: string }>("/api/bootstrap/warm", {}).catch(() => {});
  }, []);
}
