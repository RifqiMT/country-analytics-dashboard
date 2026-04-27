import { useEffect, useState } from "react";
import { postJson } from "../../api";
import {
  clearUserApiKeys,
  loadUserApiKeys,
  saveUserApiKeys,
  USER_API_KEYS_CHANGED_EVENT,
  type UserApiKeysScope,
} from "../../lib/userApiKeys";

export default function UserApiKeysHeaderPanel() {
  const [groqApiKey, setGroqApiKey] = useState("");
  const [tavilyApiKey, setTavilyApiKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [scope, setScope] = useState<UserApiKeysScope>("session");
  const [validating, setValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [groqStatus, setGroqStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [tavilyStatus, setTavilyStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      const v = loadUserApiKeys();
      setGroqApiKey(v.groqApiKey);
      setTavilyApiKey(v.tavilyApiKey);
      setRemember(v.remember);
      setScope(v.scope);
      setHydrated(true);
    };
    sync();
    window.addEventListener(USER_API_KEYS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(USER_API_KEYS_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveUserApiKeys({ groqApiKey, tavilyApiKey, remember, scope });
  }, [groqApiKey, tavilyApiKey, remember, scope, hydrated]);

  const onClear = () => {
    setGroqApiKey("");
    setTavilyApiKey("");
    setRemember(false);
    setScope("session");
    clearUserApiKeys();
    setValidationMessage(null);
    setGroqStatus("idle");
    setTavilyStatus("idle");
  };

  const hasAnyKey = groqApiKey.trim().length > 0 || tavilyApiKey.trim().length > 0;
  const canValidate = hasAnyKey && !validating;

  const runValidation = async () => {
    if (!canValidate) return;
    setValidating(true);
    setValidationMessage(null);
    if (groqApiKey.trim()) setGroqStatus("checking");
    if (tavilyApiKey.trim()) setTavilyStatus("checking");
    try {
      const result = await postJson<{
        groq: { ok: boolean; message: string };
        tavily: { ok: boolean; message: string };
      }>("/api/keys/validate", {});
      setGroqStatus(groqApiKey.trim() ? (result.groq.ok ? "valid" : "invalid") : "idle");
      setTavilyStatus(tavilyApiKey.trim() ? (result.tavily.ok ? "valid" : "invalid") : "idle");
      const parts: string[] = [
        `Groq: ${result.groq.ok ? "OK" : "Not valid"} — ${result.groq.message}`,
        `Tavily: ${result.tavily.ok ? "OK" : "Not valid"} — ${result.tavily.message}`,
      ];
      setValidationMessage(parts.join(" | "));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setGroqStatus(groqApiKey.trim() ? "invalid" : "idle");
      setTavilyStatus(tavilyApiKey.trim() ? "invalid" : "idle");
      setValidationMessage(`Validation request failed: ${msg}`);
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    setGroqStatus((prev) => (prev === "checking" ? prev : "idle"));
  }, [groqApiKey]);

  useEffect(() => {
    setTavilyStatus((prev) => (prev === "checking" ? prev : "idle"));
  }, [tavilyApiKey]);

  const statusChipClass = (status: "idle" | "checking" | "valid" | "invalid"): string => {
    if (status === "valid") return "bg-emerald-100 text-emerald-700";
    if (status === "invalid") return "bg-red-100 text-red-700";
    if (status === "checking") return "bg-amber-100 text-amber-700";
    return "bg-slate-200 text-slate-600";
  };
  const statusLabel = (status: "idle" | "checking" | "valid" | "invalid"): string => {
    if (status === "valid") return "Valid";
    if (status === "invalid") return "Invalid";
    if (status === "checking") return "Checking";
    return "Not checked";
  };

  return (
    <details className="group w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-600 [&::-webkit-details-marker]:hidden">
        <span>AI API Keys (App-wide)</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${hasAnyKey ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
          {hasAnyKey ? "Active" : "Not set"}
        </span>
      </summary>
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="min-w-0">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Groq key
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusChipClass(groqStatus)}`}>
              {statusLabel(groqStatus)}
            </span>
          </span>
          <input
            type="password"
            value={groqApiKey}
            onChange={(e) => setGroqApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="gsk_..."
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </label>
        <label className="min-w-0">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tavily key
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusChipClass(tavilyStatus)}`}>
              {statusLabel(tavilyStatus)}
            </span>
          </span>
          <input
            type="password"
            value={tavilyApiKey}
            onChange={(e) => setTavilyApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="tvly-..."
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600"
            />
            Remember keys in this browser
          </label>
          {remember ? (
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value === "local" ? "local" : "session")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
            >
              <option value="session">Session only</option>
              <option value="local">Persistent</option>
            </select>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Clear keys
          </button>
          <button
            type="button"
            onClick={runValidation}
            disabled={!canValidate}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {validating ? "Validating..." : "Validate keys"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Keys are active for the current session and attached to API requests across Assistant, PESTEL, Porter, and Business narrative flows.
      </p>
      {validationMessage ? (
        <p className="mt-1 text-[11px] text-slate-600">{validationMessage}</p>
      ) : null}
    </details>
  );
}
