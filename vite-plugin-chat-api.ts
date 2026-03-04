/**
 * Vite plugin that adds a /api/chat endpoint for LLM chat.
 * Uses OpenAI when API key is set; falls back to rule-based responses otherwise.
 */
import type { Plugin } from 'vite';
import { getFallbackResponse, type DashboardSnapshotForFallback } from './src/utils/chatFallback';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function readJsonBody(req: import('http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function chatApiPlugin(): Plugin {
  return {
    name: 'chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = (await readJsonBody(req)) as {
            messages?: Array<{ role: string; content: string }>;
            systemPrompt?: string;
            model?: string;
            apiKey?: string;
            dashboardSnapshot?: { countryName: string; year: number; metrics: unknown } | null;
            globalData?: Array<{
              name: string;
              iso2Code: string;
              gdpNominal?: number | null;
              gdpPPP?: number | null;
              gdpNominalPerCapita?: number | null;
              gdpPPPPerCapita?: number | null;
              populationTotal?: number | null;
              lifeExpectancy?: number | null;
              inflationCPI?: number | null;
              govDebtPercentGDP?: number | null;
              govDebtUSD?: number | null;
              interestRate?: number | null;
              landAreaKm2?: number | null;
              totalAreaKm2?: number | null;
              eezKm2?: number | null;
              pop0_14Pct?: number | null;
              pop15_64Pct?: number | null;
              pop65PlusPct?: number | null;
              region?: string;
              headOfGovernmentType?: string | null;
              governmentType?: string | null;
            }> | null;
            globalDataByYear?: Record<
              string,
              Array<{
                name: string;
                iso2Code: string;
                gdpNominal?: number | null;
                gdpPPP?: number | null;
                gdpNominalPerCapita?: number | null;
                gdpPPPPerCapita?: number | null;
                populationTotal?: number | null;
                lifeExpectancy?: number | null;
                inflationCPI?: number | null;
                govDebtPercentGDP?: number | null;
                govDebtUSD?: number | null;
                interestRate?: number | null;
                landAreaKm2?: number | null;
                totalAreaKm2?: number | null;
                eezKm2?: number | null;
                pop0_14Pct?: number | null;
                pop15_64Pct?: number | null;
                pop65PlusPct?: number | null;
                region?: string;
                headOfGovernmentType?: string | null;
                governmentType?: string | null;
              }>
            > | null;
          };

          const messages = body?.messages ?? [];
          const systemPrompt = body?.systemPrompt ?? '';
          const model = body?.model ?? 'gpt-4o-mini';
          const clientApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : undefined;
          const dashboardSnapshot = body?.dashboardSnapshot ?? null;
          const globalData = body?.globalData ?? null;
          const globalDataByYearRaw = body?.globalDataByYear ?? null;
          const globalDataByYear =
            globalDataByYearRaw &&
            Object.fromEntries(
              Object.entries(globalDataByYearRaw).map(([k, v]) => [
                parseInt(k, 10),
                v,
              ]),
            );

          const apiKey = clientApiKey || process.env.OPENAI_API_KEY;

          if (!apiKey) {
            const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
            const content = getFallbackResponse(
              lastUserMessage?.content ?? '',
              dashboardSnapshot as DashboardSnapshotForFallback | null,
              globalData,
              globalDataByYear ?? undefined,
            );
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ content }));
            return;
          }

          const openaiMessages = [
            ...(systemPrompt
              ? [{ role: 'system' as const, content: systemPrompt }]
              : []),
            ...messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
          ];

          const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: openaiMessages,
              stream: false,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: `OpenAI API error: ${response.status}`,
                details: errText.slice(0, 500),
              }),
            );
            return;
          }

          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content =
            data.choices?.[0]?.message?.content ?? 'No response generated.';

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content }));
        } catch (err) {
          console.error('[chat-api]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Internal server error',
            }),
          );
        }
      });
    },
  };
}
