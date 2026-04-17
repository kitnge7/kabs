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
    name: "nvidia",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey: process.env.NVIDIA_API_KEY || "",
    model: "meta/llama-3.3-70b-instruct",
    maxTokens: 8192,
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
    signal: AbortSignal.timeout(60_000),
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
 * Chat with provider fallback.
 * Returns the assistant message string or a graceful offline message.
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
    }
  }

  throw new Error(
    `LLM provider unavailable: ${lastError?.message ?? "unknown error"}`
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
