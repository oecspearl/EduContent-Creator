import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  X, 
  Send, 
  Trash2, 
  Loader2,
  Sparkles,
  User,
  Bot
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useChatContext } from "@/hooks/useChatContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@shared/schema";

interface ChatAssistantProps {
  // No props needed - uses context provider
}

export default function ChatAssistant({}: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const chatContext = useChatContext();

  const { data: history = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/history"],
    enabled: isOpen,
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => apiRequest("/api/chat/history", "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      toast({
        title: "Chat history cleared",
        description: "All messages have been removed",
      });
    },
    onError: () => {
      toast({
        title: "Failed to clear chat history",
        variant: "destructive",
      });
    },
  });

  const sendMessage = async () => {
    if (!message.trim() || isStreaming) return;

    const userMessage = message.trim();
    setMessage("");
    setIsStreaming(true);
    setStreamingMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          context: chatContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                setStreamingMessage(fullResponse);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      // Refresh history after streaming is complete
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      
      // Wait a brief moment for the query to refetch before clearing streaming message
      // This prevents the message from disappearing before it appears in history
      setTimeout(() => {
        setStreamingMessage("");
      }, 100);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setStreamingMessage("");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, streamingMessage]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <Button
        size="icon"
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50 hover-elevate active-elevate-2"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-chat"
        aria-label="Open AI assistant chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card 
      className="fixed bottom-4 right-4 w-[calc(100%-2rem)] sm:w-96 h-[calc(100vh-2rem)] sm:h-[600px] flex flex-col shadow-2xl z-50 border-2"
      role="dialog"
      aria-label="AI Assistant Chat"
      aria-modal="false"
      data-testid="card-chat-assistant"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Here to help you create</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => clearHistoryMutation.mutate()}
              disabled={clearHistoryMutation.isPending}
              data-testid="button-clear-chat"
              aria-label="Clear chat history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            data-testid="button-close-chat"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-4" role="log" aria-live="polite" aria-atomic="false">
            {history.length === 0 && !streamingMessage && (
              <div className="text-center text-sm text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary/30" />
                <p className="font-medium mb-1">Welcome to your AI Assistant!</p>
                <p className="text-xs">
                  Ask me anything about creating content, using the platform, or
                  educational best practices.
                </p>
              </div>
            )}

            {history.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
                data-testid={`chat-message-${msg.role}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-3 py-2 max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {streamingMessage && (
              <div className="flex gap-3 justify-start" data-testid="chat-streaming-message">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-3 py-2 max-w-[85%] bg-muted">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingMessage}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {isStreaming && !streamingMessage && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-3 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t p-3">
        <div className="flex gap-2 w-full">
          <Textarea
            ref={textareaRef}
            placeholder="Ask me anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            data-testid="input-chat-message"
            aria-label="Chat message input"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!message.trim() || isStreaming}
            className="flex-shrink-0"
            data-testid="button-send-message"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center w-full">
          Press Enter to send, Shift+Enter for new line
        </p>
      </CardFooter>
    </Card>
  );
}
