import {
  users, type User, type InsertUser,
  providerKeys, type ProviderKey, type InsertProviderKey,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage,
  memoryFacts, type MemoryFact, type InsertMemoryFact,
  memorySummaries, type MemorySummary, type InsertMemorySummary,
  memoryEmbeddings, type MemoryEmbedding, type InsertMemoryEmbedding,
  storageSettings, type StorageSettings, type InsertStorageSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLogin(id: string): Promise<User | undefined>;

  // Provider Keys
  getProviderKeys(userId: string): Promise<ProviderKey[]>;
  getProviderKey(userId: string, provider: string): Promise<ProviderKey | undefined>;
  saveProviderKey(key: InsertProviderKey): Promise<ProviderKey>;
  deleteProviderKey(userId: string, provider: string): Promise<void>;

  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<void>;
  clearConversations(userId: string): Promise<void>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  getRecentMessages(userId: string, limit: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Memory Facts
  getMemoryFacts(userId: string): Promise<MemoryFact[]>;
  getMemoryFactsByCategory(userId: string, category: string): Promise<MemoryFact[]>;
  createMemoryFact(fact: InsertMemoryFact): Promise<MemoryFact>;
  updateMemoryFact(id: string, updates: Partial<MemoryFact>): Promise<MemoryFact | undefined>;
  deleteMemoryFact(id: string): Promise<void>;
  clearMemoryFacts(userId: string): Promise<void>;

  // Memory Summaries
  getMemorySummaries(userId: string): Promise<MemorySummary[]>;
  createMemorySummary(summary: InsertMemorySummary): Promise<MemorySummary>;
  clearMemorySummaries(userId: string): Promise<void>;

  // Memory Embeddings
  getMemoryEmbeddings(userId: string): Promise<MemoryEmbedding[]>;
  getEmbeddingCount(userId: string): Promise<number>;
  createMemoryEmbedding(embedding: InsertMemoryEmbedding): Promise<MemoryEmbedding>;
  clearMemoryEmbeddings(userId: string): Promise<void>;

  // Storage Settings
  getStorageSettings(userId: string): Promise<StorageSettings | undefined>;
  saveStorageSettings(settings: InsertStorageSettings): Promise<StorageSettings>;
  updateStorageSettings(userId: string, updates: Partial<StorageSettings>): Promise<StorageSettings | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUserLogin(id: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  // Provider Keys
  async getProviderKeys(userId: string): Promise<ProviderKey[]> {
    return db.select().from(providerKeys).where(eq(providerKeys.userId, userId));
  }

  async getProviderKey(userId: string, provider: string): Promise<ProviderKey | undefined> {
    const [key] = await db
      .select()
      .from(providerKeys)
      .where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, provider)));
    return key || undefined;
  }

  async saveProviderKey(key: InsertProviderKey): Promise<ProviderKey> {
    const existing = await this.getProviderKey(key.userId, key.provider);
    if (existing) {
      const [updated] = await db
        .update(providerKeys)
        .set({ encryptedKey: key.encryptedKey, isActive: key.isActive, updatedAt: new Date() })
        .where(eq(providerKeys.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(providerKeys).values(key).returning();
    return created;
  }

  async deleteProviderKey(userId: string, provider: string): Promise<void> {
    await db
      .delete(providerKeys)
      .where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, provider)));
  }

  // Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv || undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async clearConversations(userId: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.userId, userId));
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async getRecentMessages(userId: string, limit: number): Promise<Message[]> {
    const userConversations = await this.getConversations(userId);
    const conversationIds = userConversations.map(c => c.id);
    if (conversationIds.length === 0) return [];
    
    const allMessages: Message[] = [];
    for (const convId of conversationIds.slice(0, 5)) {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convId))
        .orderBy(desc(messages.createdAt))
        .limit(Math.ceil(limit / 5));
      allMessages.push(...msgs);
    }
    return allMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, limit);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  // Memory Facts
  async getMemoryFacts(userId: string): Promise<MemoryFact[]> {
    return db
      .select()
      .from(memoryFacts)
      .where(eq(memoryFacts.userId, userId))
      .orderBy(desc(memoryFacts.updatedAt));
  }

  async getMemoryFactsByCategory(userId: string, category: string): Promise<MemoryFact[]> {
    return db
      .select()
      .from(memoryFacts)
      .where(and(eq(memoryFacts.userId, userId), eq(memoryFacts.category, category)))
      .orderBy(desc(memoryFacts.updatedAt));
  }

  async createMemoryFact(fact: InsertMemoryFact): Promise<MemoryFact> {
    const [created] = await db.insert(memoryFacts).values(fact).returning();
    return created;
  }

  async updateMemoryFact(id: string, updates: Partial<MemoryFact>): Promise<MemoryFact | undefined> {
    const [updated] = await db
      .update(memoryFacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(memoryFacts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMemoryFact(id: string): Promise<void> {
    await db.delete(memoryFacts).where(eq(memoryFacts.id, id));
  }

  async clearMemoryFacts(userId: string): Promise<void> {
    await db.delete(memoryFacts).where(eq(memoryFacts.userId, userId));
  }

  // Memory Summaries
  async getMemorySummaries(userId: string): Promise<MemorySummary[]> {
    return db
      .select()
      .from(memorySummaries)
      .where(eq(memorySummaries.userId, userId))
      .orderBy(desc(memorySummaries.periodEnd));
  }

  async createMemorySummary(summary: InsertMemorySummary): Promise<MemorySummary> {
    const [created] = await db.insert(memorySummaries).values(summary).returning();
    return created;
  }

  async clearMemorySummaries(userId: string): Promise<void> {
    await db.delete(memorySummaries).where(eq(memorySummaries.userId, userId));
  }

  // Memory Embeddings
  async getMemoryEmbeddings(userId: string): Promise<MemoryEmbedding[]> {
    return db
      .select()
      .from(memoryEmbeddings)
      .where(eq(memoryEmbeddings.userId, userId));
  }

  async getEmbeddingCount(userId: string): Promise<number> {
    const embeddings = await db
      .select()
      .from(memoryEmbeddings)
      .where(eq(memoryEmbeddings.userId, userId));
    return embeddings.length;
  }

  async createMemoryEmbedding(embedding: InsertMemoryEmbedding): Promise<MemoryEmbedding> {
    const [created] = await db.insert(memoryEmbeddings).values(embedding).returning();
    return created;
  }

  async clearMemoryEmbeddings(userId: string): Promise<void> {
    await db.delete(memoryEmbeddings).where(eq(memoryEmbeddings.userId, userId));
  }

  // Storage Settings
  async getStorageSettings(userId: string): Promise<StorageSettings | undefined> {
    const [settings] = await db
      .select()
      .from(storageSettings)
      .where(eq(storageSettings.userId, userId));
    return settings || undefined;
  }

  async saveStorageSettings(settings: InsertStorageSettings): Promise<StorageSettings> {
    const existing = await this.getStorageSettings(settings.userId);
    if (existing) {
      const [updated] = await db
        .update(storageSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(storageSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(storageSettings).values(settings).returning();
    return created;
  }

  async updateStorageSettings(userId: string, updates: Partial<StorageSettings>): Promise<StorageSettings | undefined> {
    const existing = await this.getStorageSettings(userId);
    if (!existing) return undefined;
    const [updated] = await db
      .update(storageSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(storageSettings.id, existing.id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
