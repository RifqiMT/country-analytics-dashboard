export type Attribution = {
  sources: string[];
  model?: string;
  webSearchUsed?: boolean;
};

export async function tavilySearch(query: string, maxResults = 5): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return "";
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      max_results: maxResults,
    }),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };
  const parts =
    data.results?.map((r) => `- ${r.title ?? ""} (${r.url ?? ""}): ${r.content ?? ""}`) ?? [];
  return parts.join("\n");
}

export async function groqChat(
  system: string,
  user: string,
  options?: { jsonObject?: boolean }
): Promise<{ text: string; model: string }> {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  if (!key) throw new Error("GROQ_API_KEY not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: 8192,
      ...(options?.jsonObject ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text, model };
}
