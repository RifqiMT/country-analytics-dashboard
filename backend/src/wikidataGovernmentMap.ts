import { getCache, setCache } from "./cache.js";
import { OUTBOUND_USER_AGENT } from "./httpClient.js";
import type { WikidataCountryEnrichment } from "./wikidataCountryProfile.js";
import { shortenHeadOfGovernmentOffice } from "./wikidataCountryProfile.js";

/**
 * One SPARQL round-trip for all sovereign states (P298 + P122 + P1313), cached server-side.
 * Used by the global “General” table so rows are not all empty when REST Countries omits `government`.
 */
export async function fetchWikidataGovernmentMap(): Promise<Map<string, WikidataCountryEnrichment>> {
  const key = "wikidata:map:gov:country:v2";
  const cached = getCache<Map<string, WikidataCountryEnrichment>>(key);
  if (cached) return cached;

  const query = `
    SELECT ?iso3 ?govLabel ?officeLabel WHERE {
      ?c wdt:P298 ?iso3 .
      ?c wdt:P31/wdt:P279* wd:Q6256 .
      OPTIONAL { ?c wdt:P122 ?gov . }
      OPTIONAL { ?c wdt:P1313 ?office . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;

  try {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": OUTBOUND_USER_AGENT,
      },
      body: new URLSearchParams({ query }).toString(),
    });
    if (!res.ok) {
      setCache(key, new Map(), 1000 * 60 * 15);
      return new Map();
    }
    const raw = (await res.json()) as {
      results?: { bindings?: Array<Record<string, { value: string } | undefined>> };
    };
    const bindings = raw.results?.bindings ?? [];
    type Acc = { govs: Set<string>; office?: string };
    const acc = new Map<string, Acc>();

    for (const b of bindings) {
      const isoRaw = b.iso3?.value;
      if (!isoRaw || typeof isoRaw !== "string") continue;
      const iso = isoRaw.toUpperCase();
      if (!/^[A-Z]{3}$/.test(iso)) continue;
      let row = acc.get(iso);
      if (!row) {
        row = { govs: new Set<string>() };
        acc.set(iso, row);
      }
      const gl = b.govLabel?.value;
      if (gl) row.govs.add(gl);
      const ol = b.officeLabel?.value;
      if (ol && !row.office) row.office = ol;
    }

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const out = new Map<string, WikidataCountryEnrichment>();
    for (const [iso, row] of acc) {
      const government =
        row.govs.size > 0
          ? [...row.govs].sort((a, b) => a.localeCompare(b)).map(cap).join("; ")
          : undefined;
      const headOfGovernmentTitle = row.office ? shortenHeadOfGovernmentOffice(row.office) : undefined;
      if (government || headOfGovernmentTitle) out.set(iso, { government, headOfGovernmentTitle });
    }

    setCache(key, out, 1000 * 60 * 60 * 6);
    for (const [iso, en] of out) {
      setCache(`wikidata:gov:${iso}`, en, 1000 * 60 * 60 * 24);
    }
    return out;
  } catch {
    setCache(key, new Map(), 1000 * 60 * 15);
    return new Map();
  }
}
