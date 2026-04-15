export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMProvider {
  name: string;
  url: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

const PROVIDERS: LLMProvider[] = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: process.env.GROQ_API_KEY || "",
    model: "llama-3.1-8b-instant",
    maxTokens: 1024,
  },
  {
    name: "cerebras",
    url: "https://api.cerebras.ai/v1/chat/completions",
    apiKey: process.env.CEREBRAS_API_KEY || "",
    model: "llama3.1-8b",
    maxTokens: 1024,
  },
];

async function callProvider(
  provider: LLMProvider,
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  const body = {
    model: provider.model,
    messages,
    max_completion_tokens: provider.maxTokens,
    temperature,
    stream: false,
  };

  const res = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`${provider.name} returned ${res.status}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${provider.name} returned empty content`);
  return content as string;
}

/**
 * Chat with automatic provider fallback.
 * Tries Groq first; on any error silently falls back to Cerebras.
 * Returns the assistant message string.
 */
export async function chat(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  let lastError: Error | null = null;

  for (const provider of PROVIDERS) {
    if (!provider.apiKey) continue;
    try {
      return await callProvider(provider, messages, temperature);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // silently try next provider
    }
  }

  // Both providers failed – return a graceful offline message
  console.error("All LLM providers failed:", lastError?.message);
  return (
    "The AI guide is temporarily unavailable. " +
    "Please review the lab documentation and try again shortly."
  );
}

/**
 * Build a chat request with a system prompt prepended.
 */
export function buildMessages(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];
  return messages;
}
