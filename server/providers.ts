import type { LLMProvider } from "@shared/schema";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

interface ChatResponse {
  content: string;
  tokensUsed?: number;
}

export async function callLLM(options: ChatOptions): Promise<ChatResponse> {
  const { provider, model, apiKey, messages, maxTokens = 4096 } = options;

  switch (provider) {
    case "openai":
      return callOpenAI(model, apiKey, messages, maxTokens);
    case "claude":
      return callClaude(model, apiKey, messages, maxTokens);
    case "gemini":
      return callGemini(model, apiKey, messages, maxTokens);
    case "perplexity":
      return callPerplexity(model, apiKey, messages, maxTokens);
    case "openrouter":
      return callOpenRouter(model, apiKey, messages, maxTokens);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function callOpenAI(model: string, apiKey: string, messages: ChatMessage[], maxTokens: number): Promise<ChatResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || "OpenAI API error");
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callClaude(model: string, apiKey: string, messages: ChatMessage[], maxTokens: number): Promise<ChatResponse> {
  const systemMessage = messages.find(m => m.role === "system")?.content;
  const nonSystemMessages = messages.filter(m => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemMessage,
      messages: nonSystemMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || "Claude API error");
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || "",
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function callGemini(model: string, apiKey: string, messages: ChatMessage[], maxTokens: number): Promise<ChatResponse> {
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === "system")?.content;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || "Gemini API error");
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    tokensUsed: data.usageMetadata?.totalTokenCount,
  };
}

async function callPerplexity(model: string, apiKey: string, messages: ChatMessage[], maxTokens: number): Promise<ChatResponse> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || "Perplexity API error");
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callOpenRouter(model: string, apiKey: string, messages: ChatMessage[], maxTokens: number): Promise<ChatResponse> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://chronomind.app",
      "X-Title": "ChronoMind",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || "OpenRouter API error");
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens,
  };
}

export async function testProviderKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
  try {
    const testMessages: ChatMessage[] = [
      { role: "user", content: "Say hello in one word." }
    ];
    
    let model: string;
    switch (provider) {
      case "openai":
        model = "gpt-4o-mini";
        break;
      case "claude":
        model = "claude-3-haiku-20240307";
        break;
      case "gemini":
        model = "gemini-1.5-flash";
        break;
      case "perplexity":
        model = "llama-3.1-sonar-small-128k-online";
        break;
      case "openrouter":
        model = "openai/gpt-3.5-turbo";
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    await callLLM({
      provider,
      model,
      apiKey,
      messages: testMessages,
      maxTokens: 10,
    });
    
    return true;
  } catch (error) {
    console.error(`Provider test failed for ${provider}:`, error);
    return false;
  }
}
