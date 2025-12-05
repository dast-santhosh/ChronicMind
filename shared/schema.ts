import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, real, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - stores Firebase authenticated users
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at").defaultNow().notNull(),
});

// Provider API keys - encrypted storage for user's LLM provider keys
export const providerKeys = pgTable("provider_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // openai, claude, gemini, perplexity, openrouter
  encryptedKey: text("encrypted_key").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique().on(table.userId, table.provider),
  index("provider_keys_user_idx").on(table.userId),
]);

// Conversations - stores chat sessions
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  provider: text("provider").notNull(), // which LLM provider was used
  model: text("model"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("conversations_user_idx").on(table.userId),
  index("conversations_created_idx").on(table.createdAt),
]);

// Messages - individual chat messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  provider: text("provider"),
  model: text("model"),
  tokenCount: integer("token_count"),
  memoryContextUsed: boolean("memory_context_used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("messages_conversation_idx").on(table.conversationId),
  index("messages_created_idx").on(table.createdAt),
]);

// Memory Facts - structured key-value knowledge extracted from conversations
export const memoryFacts = pgTable("memory_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // preferences, goals, constraints, skills, projects, personal
  key: text("key").notNull(),
  value: text("value").notNull(),
  confidence: real("confidence").default(1.0),
  sourceMessageId: varchar("source_message_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("memory_facts_user_idx").on(table.userId),
  index("memory_facts_category_idx").on(table.category),
]);

// Memory Summaries - compressed historical context
export const memorySummaries = pgTable("memory_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("memory_summaries_user_idx").on(table.userId),
  index("memory_summaries_period_idx").on(table.periodStart, table.periodEnd),
]);

// Memory Embeddings - vector embeddings for semantic search
export const memoryEmbeddings = pgTable("memory_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: jsonb("embedding").$type<number[]>().notNull(),
  sourceType: text("source_type").notNull(), // message, fact, summary
  sourceId: varchar("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("memory_embeddings_user_idx").on(table.userId),
]);

// Storage Settings - user's storage preferences
export const storageSettings = pgTable("storage_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  storageMode: text("storage_mode").default("googledrive").notNull(), // googledrive, local, firestore
  driveConnected: boolean("drive_connected").default(false),
  driveFolderId: text("drive_folder_id"),
  encryptionEnabled: boolean("encryption_enabled").default(true),
  autoSync: boolean("auto_sync").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("storage_settings_user_idx").on(table.userId),
]);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  providerKeys: many(providerKeys),
  conversations: many(conversations),
  memoryFacts: many(memoryFacts),
  memorySummaries: many(memorySummaries),
  memoryEmbeddings: many(memoryEmbeddings),
  storageSettings: one(storageSettings),
}));

export const providerKeysRelations = relations(providerKeys, ({ one }) => ({
  user: one(users, {
    fields: [providerKeys.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const memoryFactsRelations = relations(memoryFacts, ({ one }) => ({
  user: one(users, {
    fields: [memoryFacts.userId],
    references: [users.id],
  }),
}));

export const memorySummariesRelations = relations(memorySummaries, ({ one }) => ({
  user: one(users, {
    fields: [memorySummaries.userId],
    references: [users.id],
  }),
}));

export const memoryEmbeddingsRelations = relations(memoryEmbeddings, ({ one }) => ({
  user: one(users, {
    fields: [memoryEmbeddings.userId],
    references: [users.id],
  }),
}));

export const storageSettingsRelations = relations(storageSettings, ({ one }) => ({
  user: one(users, {
    fields: [storageSettings.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, lastLoginAt: true });
export const insertProviderKeySchema = createInsertSchema(providerKeys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertMemoryFactSchema = createInsertSchema(memoryFacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMemorySummarySchema = createInsertSchema(memorySummaries).omit({ id: true, createdAt: true });
export const insertMemoryEmbeddingSchema = createInsertSchema(memoryEmbeddings).omit({ id: true, createdAt: true });
export const insertStorageSettingsSchema = createInsertSchema(storageSettings).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ProviderKey = typeof providerKeys.$inferSelect;
export type InsertProviderKey = z.infer<typeof insertProviderKeySchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MemoryFact = typeof memoryFacts.$inferSelect;
export type InsertMemoryFact = z.infer<typeof insertMemoryFactSchema>;
export type MemorySummary = typeof memorySummaries.$inferSelect;
export type InsertMemorySummary = z.infer<typeof insertMemorySummarySchema>;
export type MemoryEmbedding = typeof memoryEmbeddings.$inferSelect;
export type InsertMemoryEmbedding = z.infer<typeof insertMemoryEmbeddingSchema>;
export type StorageSettings = typeof storageSettings.$inferSelect;
export type InsertStorageSettings = z.infer<typeof insertStorageSettingsSchema>;

// Provider types
export type LLMProvider = "openai" | "claude" | "gemini" | "perplexity" | "openrouter";
export type StorageMode = "googledrive" | "local" | "firestore";
export type MemoryCategory = "preferences" | "goals" | "constraints" | "skills" | "projects" | "personal";

// Chat types for API
export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  provider: z.enum(["openai", "claude", "gemini", "perplexity", "openrouter"]),
  model: z.string().optional(),
  useMemory: z.boolean().default(true),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  content: z.string(),
  provider: z.string(),
  model: z.string().optional(),
  memoryContextUsed: z.boolean(),
  tokensUsed: z.number().optional(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;
