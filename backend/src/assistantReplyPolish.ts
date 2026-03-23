/**
 * Light post-processing so assistant replies read more naturally in the UI.
 * Applied only to the LLM narrative (not to prepended ranking markdown tables).
 */
export function polishAssistantLlmReply(text: string): string {
  let t = text.trim();
  if (!t) return t;

  t = t.replace(
    /^(Certainly!|Of course!|Absolutely!|Great question[!,.]?|I'd be (happy|glad) to help[!,.]?\s*)\s*/i,
    ""
  );
  t = t.replace(/\bAs an AI (language )?model,?\s*/gi, "");
  t = t.replace(/\bI'm (an AI|a language model|just an AI)\b[^.]*\.?\s*/gi, "");
  t = t.replace(/\bBased on (the |my )?(information|data) (I have|available)[^.]*:\s*/gi, "");
  t = t.replace(/\n{4,}/g, "\n\n\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(
    /^(here(?:'s| is)|below is) (?:the )?(?:ranking|leaderboard|table|summary table)[^.:\n]*[.:]?\s*/i,
    ""
  );
  // Remove placeholder-style citation tokens that are not real mapped ids.
  t = t.replace(/\[(?:D|W)#\]/g, "");
  t = t.replace(/\s{2,}/g, " ");
  return t.trim();
}
