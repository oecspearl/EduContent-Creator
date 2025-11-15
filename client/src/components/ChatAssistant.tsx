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
  const activeRequestIdRef = useRef<number>(0);
  const { toast} = useToast();
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

    // Generate unique request ID to prevent overlapping streams
    const requestId = ++activeRequestIdRef.current;

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

      // Verify the assistant message is persisted in history before clearing
      // This prevents clearing streamingMessage before the message appears in history
      const verifyMessagePersisted = async (): Promise<boolean> => {
        const maxAttempts = 10; // Try 10 times max
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            // Use fetchQuery to get fresh data from server (not cached)
            const currentHistory = await queryClient.fetchQuery<ChatMessage[]>({
              queryKey: ["/api/chat/history"],
            });
            
            if (currentHistory && currentHistory.length > 0) {
              const lastMessage = currentHistory[currentHistory.length - 1];
              // Check if the last message matches our streamed response (trim for resilience)
              if (lastMessage.role === "assistant" && lastMessage.content.trim() === fullResponse.trim()) {
                return true; // Message confirmed in history
              }
            }
          } catch (error) {
            console.error("Error fetching chat history during verification:", error);
          }
          
          // If not the active request anymore, stop checking
          if (requestId !== activeRequestIdRef.current) {
            return false;
          }
          
          // Wait before next refetch (except on last attempt)
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        return false; // Timeout
      };
      
      const verified = await verifyMessagePersisted();
      
      // Only clear if message is verified AND still the active request
      if (verified && requestId === activeRequestIdRef.current) {
        setStreamingMessage("");
      } else if (!verified && requestId === activeRequestIdRef.current) {
        // IMPORTANT: Don't clear if verification failed - leave message visible
        // This prevents the disappearing message bug
        console.warn("Chat message not verified in history - keeping streamingMessage visible");
        toast({
          title: "Message delivery delayed",
          description: "Your message was sent but may take a moment to appear",
          variant: "default",
        });
      }
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
        variant="default"
        className="!fixed !bottom-6 !right-6 !h-16 !w-16 !rounded-full !shadow-2xl !z-50 hover-elevate active-elevate-2 !animate-pulse hover:!animate-none"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-chat"
        aria-label="Open AI assistant chat"
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem' }}
      >
        <MessageCircle className="h-7 w-7" />
      </Button>
    );
  }

  return (
    <Card 
      className="!fixed !bottom-6 !right-6 w-[calc(100%-3rem)] sm:w-96 h-[calc(100vh-3rem)] sm:h-[600px] flex flex-col shadow-2xl !z-50 border-2"
      role="dialog"
      aria-label="AI Assistant Chat"
      aria-modal="false"
      data-testid="card-chat-assistant"
      style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem' }}
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
