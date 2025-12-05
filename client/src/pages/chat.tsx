import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Send, Sparkles, Brain, RotateCcw, Copy, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthStore, useChatStore, useProviderStore, useMemoryStore } from "@/lib/store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message, Conversation, LLMProvider } from "@shared/schema";
import { format } from "date-fns";

const providerModels: Record<LLMProvider, { name: string; models: string[] }> = {
  openai: { name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  claude: { name: "Claude", models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"] },
  gemini: { name: "Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"] },
  perplexity: { name: "Perplexity", models: ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online"] },
  openrouter: { name: "OpenRouter", models: ["openai/gpt-4o", "anthropic/claude-3-opus", "meta-llama/llama-3-70b"] },
};

function MessageBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const [copied, setCopied] = useState(false);
  const { firebaseUser } = useAuthStore();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const userInitials = firebaseUser?.displayName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div
      data-testid={`message-${message.id}`}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar className="w-8 h-8 shrink-0">
        {isUser ? (
          <>
            <AvatarImage src={firebaseUser?.photoURL || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {userInitials}
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-accent text-accent-foreground text-xs">
            AI
          </AvatarFallback>
        )}
      </Avatar>

      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative group rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-card-border"
          }`}
        >
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </div>

          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-background/10 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-copy-message-${message.id}`}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), "h:mm a")}
          </span>
          {!isUser && message.provider && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {message.provider}
            </Badge>
          )}
          {message.memoryContextUsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Brain className="w-3 h-3" />
                  <span>Memory</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Memory context was used for this response</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
          AI
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div className="rounded-2xl px-4 py-3 bg-card border border-card-border">
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {content}
            <span className="inline-block w-2 h-4 ml-1 bg-foreground/50 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
          AI
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl px-4 py-3 bg-card border border-card-border">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { user } = useAuthStore();
  const {
    currentConversation,
    messages,
    setMessages,
    addMessage,
    isStreaming,
    streamingContent,
    setStreaming,
    setStreamingContent,
    setCurrentConversation,
  } = useChatStore();
  const { activeProvider, activeModel, setActiveProvider, setActiveModel, providers } = useProviderStore();
  const { isMemoryEnabled } = useMemoryStore();

  const hasActiveKey = providers.find(p => p.provider === activeProvider)?.hasKey;

  const { data: messagesData, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentConversation?.id],
    enabled: !!currentConversation?.id,
  });

  useEffect(() => {
    if (messagesData) {
      setMessages(messagesData);
    }
  }, [messagesData, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        conversationId: currentConversation?.id,
        message,
        provider: activeProvider,
        model: activeModel,
        useMemory: isMemoryEnabled,
      });
      return response.json();
    },
    onMutate: async (message) => {
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: currentConversation?.id || "",
        role: "user",
        content: message,
        provider: null,
        model: null,
        tokenCount: null,
        memoryContextUsed: false,
        createdAt: new Date(),
      };
      addMessage(tempUserMessage);
      setStreaming(true);
      setStreamingContent("");
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: data.messageId,
        conversationId: data.conversationId,
        role: "assistant",
        content: data.content,
        provider: data.provider,
        model: data.model,
        tokenCount: data.tokensUsed,
        memoryContextUsed: data.memoryContextUsed,
        createdAt: new Date(),
      };
      
      setMessages([...messages.filter(m => !m.id.startsWith("temp-")), messages[messages.length - 1], assistantMessage]);
      
      if (!currentConversation) {
        setCurrentConversation({ id: data.conversationId } as Conversation);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.conversationId] });
    },
    onError: (error: any) => {
      setMessages(messages.filter(m => !m.id.startsWith("temp-")));
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setStreaming(false);
      setStreamingContent("");
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    
    if (!hasActiveKey) {
      toast({
        title: "No API key configured",
        description: `Please add your ${providerModels[activeProvider].name} API key in Provider settings.`,
        variant: "destructive",
      });
      return;
    }
    
    setInput("");
    sendMessage.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {currentConversation?.title || "New Chat"}
          </h1>
          {isMemoryEnabled && (
            <Badge variant="secondary" className="gap-1">
              <Brain className="w-3 h-3" />
              Memory Active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={activeProvider} onValueChange={(v) => setActiveProvider(v as LLMProvider)}>
            <SelectTrigger data-testid="select-provider" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(providerModels).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeModel} onValueChange={setActiveModel}>
            <SelectTrigger data-testid="select-model" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providerModels[activeProvider].models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            data-testid="button-new-chat"
            variant="outline"
            size="icon"
            onClick={handleNewChat}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !messagesLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-muted-foreground max-w-md">
                Your AI assistant with persistent memory. Every conversation builds on your history.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isUser={message.role === "user"}
            />
          ))}

          {isStreaming && streamingContent && (
            <StreamingMessage content={streamingContent} />
          )}

          {isStreaming && !streamingContent && <TypingIndicator />}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              data-testid="input-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[56px] max-h-[200px] pr-14 resize-none text-base"
              disabled={isStreaming}
            />
            <Button
              data-testid="button-send"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="absolute right-2 bottom-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
