import { storage } from "./storage";
import type { MemoryFact, MemorySummary, MemoryEmbedding, Message, InsertMemoryFact } from "@shared/schema";

interface ExtractedMemory {
  facts: {
    category: string;
    key: string;
    value: string;
    confidence: number;
  }[];
}

const MEMORY_EXTRACTION_PROMPT = `Analyze this conversation and extract structured facts about the user. Focus on:
- Preferences (likes, dislikes, habits)
- Goals (short-term and long-term objectives)
- Constraints (limitations, restrictions, requirements)
- Skills (abilities, expertise, experience)
- Projects (current work, tasks, initiatives)
- Personal (name, location, relationships, important details)

Return a JSON object with this structure:
{
  "facts": [
    {
      "category": "preferences|goals|constraints|skills|projects|personal",
      "key": "brief label",
      "value": "detailed information",
      "confidence": 0.0-1.0
    }
  ]
}

Only extract facts that are clearly stated or strongly implied. Be concise but informative.`;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function simpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  const vector = new Array(256).fill(0);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const idx = (word.charCodeAt(j) + i + j) % 256;
      vector[idx] += 1 / (i + 1);
    }
  }
  
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }
  
  return vector;
}

export async function extractMemoryFromConversation(
  messages: Message[],
  userId: string,
  callLLM: (prompt: string) => Promise<string>
): Promise<ExtractedMemory> {
  if (messages.length === 0) {
    return { facts: [] };
  }

  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join("\n\n");

  const prompt = `${MEMORY_EXTRACTION_PROMPT}\n\nConversation:\n${conversationText}`;

  try {
    const response = await callLLM(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { facts: [] };
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedMemory;
    return parsed;
  } catch (error) {
    console.error("Failed to extract memory:", error);
    return { facts: [] };
  }
}

export async function storeExtractedMemory(
  userId: string,
  extracted: ExtractedMemory,
  sourceMessageId?: string
): Promise<MemoryFact[]> {
  const storedFacts: MemoryFact[] = [];
  
  for (const fact of extracted.facts) {
    try {
      const factData: InsertMemoryFact = {
        userId,
        category: fact.category,
        key: fact.key,
        value: fact.value,
        confidence: fact.confidence,
        sourceMessageId,
      };
      
      const stored = await storage.createMemoryFact(factData);
      storedFacts.push(stored);
    } catch (error) {
      console.error("Failed to store fact:", error);
    }
  }
  
  return storedFacts;
}

export async function createEmbeddingForMessage(
  userId: string,
  content: string,
  sourceType: "message" | "fact" | "summary",
  sourceId?: string
): Promise<MemoryEmbedding> {
  const embedding = simpleEmbedding(content);
  
  return storage.createMemoryEmbedding({
    userId,
    content,
    embedding,
    sourceType,
    sourceId,
  });
}

export async function findRelevantMemories(
  userId: string,
  query: string,
  limit: number = 5
): Promise<{ facts: MemoryFact[]; summaries: MemorySummary[]; embeddings: MemoryEmbedding[] }> {
  const queryEmbedding = simpleEmbedding(query);
  
  const [facts, summaries, embeddings] = await Promise.all([
    storage.getMemoryFacts(userId),
    storage.getMemorySummaries(userId),
    storage.getMemoryEmbeddings(userId),
  ]);
  
  const scoredEmbeddings = embeddings
    .map(emb => ({
      embedding: emb,
      score: cosineSimilarity(queryEmbedding, emb.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  const scoredFacts = facts
    .map(fact => ({
      fact,
      score: cosineSimilarity(queryEmbedding, simpleEmbedding(`${fact.key}: ${fact.value}`)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  const scoredSummaries = summaries
    .map(summary => ({
      summary,
      score: cosineSimilarity(queryEmbedding, simpleEmbedding(summary.content)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.ceil(limit / 2));
  
  return {
    facts: scoredFacts.map(s => s.fact),
    summaries: scoredSummaries.map(s => s.summary),
    embeddings: scoredEmbeddings.map(s => s.embedding),
  };
}

export function buildContextFromMemory(
  facts: MemoryFact[],
  summaries: MemorySummary[],
  recentMessages: Message[]
): string {
  const sections: string[] = [];
  
  if (facts.length > 0) {
    const factsByCategory = facts.reduce((acc, fact) => {
      if (!acc[fact.category]) acc[fact.category] = [];
      acc[fact.category].push(fact);
      return acc;
    }, {} as Record<string, MemoryFact[]>);
    
    const factsSection = Object.entries(factsByCategory)
      .map(([category, categoryFacts]) => {
        const items = categoryFacts.map(f => `- ${f.key}: ${f.value}`).join("\n");
        return `[${category.toUpperCase()}]\n${items}`;
      })
      .join("\n\n");
    
    sections.push(`## User Information\n${factsSection}`);
  }
  
  if (summaries.length > 0) {
    const summarySection = summaries
      .slice(0, 3)
      .map(s => `- ${s.content}`)
      .join("\n");
    
    sections.push(`## Recent Context\n${summarySection}`);
  }
  
  if (recentMessages.length > 0) {
    const recentSection = recentMessages
      .slice(-6)
      .map(m => `${m.role}: ${m.content.slice(0, 200)}${m.content.length > 200 ? "..." : ""}`)
      .join("\n");
    
    sections.push(`## Recent Conversation\n${recentSection}`);
  }
  
  if (sections.length === 0) {
    return "";
  }
  
  return `# Memory Context\nThe following information has been remembered about this user:\n\n${sections.join("\n\n")}`;
}
