import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Conversation, Message, MemoryFact, MemorySummary, LLMProvider } from "@shared/schema";

interface ProviderConfig {
  provider: LLMProvider;
  hasKey: boolean;
  isActive: boolean;
  model?: string;
}

interface AuthState {
  user: User | null;
  firebaseUser: any | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setFirebaseUser: (user: any | null) => void;
  setLoading: (loading: boolean) => void;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
}

interface ProviderState {
  providers: ProviderConfig[];
  activeProvider: LLMProvider;
  activeModel: string;
  setProviders: (providers: ProviderConfig[]) => void;
  setActiveProvider: (provider: LLMProvider) => void;
  setActiveModel: (model: string) => void;
}

interface MemoryState {
  facts: MemoryFact[];
  summaries: MemorySummary[];
  embeddingCount: number;
  isMemoryEnabled: boolean;
  setFacts: (facts: MemoryFact[]) => void;
  setSummaries: (summaries: MemorySummary[]) => void;
  setEmbeddingCount: (count: number) => void;
  setMemoryEnabled: (enabled: boolean) => void;
}

interface StorageState {
  storageMode: "googledrive" | "local" | "firestore";
  driveConnected: boolean;
  lastSyncAt: Date | null;
  setStorageMode: (mode: "googledrive" | "local" | "firestore") => void;
  setDriveConnected: (connected: boolean) => void;
  setLastSyncAt: (date: Date | null) => void;
}

interface UIState {
  sidebarOpen: boolean;
  activeView: "chat" | "memory" | "providers" | "storage" | "history" | "settings";
  theme: "light" | "dark";
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: "chat" | "memory" | "providers" | "storage" | "history" | "settings") => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setLoading: (isLoading) => set({ isLoading }),
}));

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (currentConversation) => set({ currentConversation }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingContent: (chunk) => set((state) => ({ streamingContent: state.streamingContent + chunk })),
}));

export const useProviderStore = create<ProviderState>()(
  persist(
    (set) => ({
      providers: [
        { provider: "openai", hasKey: false, isActive: false },
        { provider: "claude", hasKey: false, isActive: false },
        { provider: "gemini", hasKey: false, isActive: false },
        { provider: "perplexity", hasKey: false, isActive: false },
        { provider: "openrouter", hasKey: false, isActive: false },
      ],
      activeProvider: "openai",
      activeModel: "gpt-4o",
      setProviders: (providers) => set({ providers }),
      setActiveProvider: (activeProvider) => set({ activeProvider }),
      setActiveModel: (activeModel) => set({ activeModel }),
    }),
    { name: "chronomind-providers" }
  )
);

export const useMemoryStore = create<MemoryState>((set) => ({
  facts: [],
  summaries: [],
  embeddingCount: 0,
  isMemoryEnabled: true,
  setFacts: (facts) => set({ facts }),
  setSummaries: (summaries) => set({ summaries }),
  setEmbeddingCount: (embeddingCount) => set({ embeddingCount }),
  setMemoryEnabled: (isMemoryEnabled) => set({ isMemoryEnabled }),
}));

export const useStorageStore = create<StorageState>()(
  persist(
    (set) => ({
      storageMode: "googledrive",
      driveConnected: false,
      lastSyncAt: null,
      setStorageMode: (storageMode) => set({ storageMode }),
      setDriveConnected: (driveConnected) => set({ driveConnected }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
    }),
    { name: "chronomind-storage" }
  )
);

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeView: "chat",
      theme: "dark",
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setActiveView: (activeView) => set({ activeView }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "chronomind-ui" }
  )
);
