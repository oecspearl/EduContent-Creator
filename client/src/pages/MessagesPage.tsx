import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageCircle,
  Send,
  Menu,
  ArrowLeft,
  Mail,
  MailOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Message = {
  id: string;
  fromUserId: string;
  toUserId: string;
  subject: string | null;
  body: string;
  contentId: string | null;
  isRead: boolean;
  createdAt: string;
  fromName: string | null;
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { toUserId: string; subject?: string; body: string }) => {
      await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setReplyTo(null);
      setReplyBody("");
      toast({ title: "Message sent" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/messages/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const handleReply = () => {
    if (!replyTo || !replyBody.trim()) return;
    const toId = replyTo.fromUserId === user?.id ? replyTo.toUserId : replyTo.fromUserId;
    sendMutation.mutate({
      toUserId: toId,
      subject: `Re: ${replyTo.subject || "No subject"}`,
      body: replyBody,
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
            <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden border-b border-border/40 bg-card px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="cursor-pointer">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Messages</h1>
          <div className="w-10" />
        </div>

        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Messages</h2>
              <p className="text-sm text-muted-foreground mt-1">Communicate with your {user?.role === "student" ? "teachers" : "students"}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : !messages || messages.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="py-16 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">Messages from {user?.role === "student" ? "your teachers" : "students"} will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => {
                const isMine = msg.fromUserId === user?.id;
                const isUnread = !isMine && !msg.isRead;

                return (
                  <Card
                    key={msg.id}
                    className={`border-border/40 cursor-pointer transition-colors hover:bg-muted/30 ${isUnread ? "border-l-4 border-l-primary" : ""}`}
                    onClick={() => {
                      if (isUnread) markReadMutation.mutate(msg.id);
                      setReplyTo(msg);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {isUnread ? (
                            <Mail className="h-4 w-4 text-primary mt-1 shrink-0" />
                          ) : (
                            <MailOpen className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {isMine ? "You" : msg.fromName || "Unknown"}
                              </span>
                              {msg.subject && <span className="text-sm text-muted-foreground">— {msg.subject}</span>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{msg.body}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Reply box */}
          {replyTo && (
            <Card className="mt-6 border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Reply to {replyTo.fromUserId === user?.id ? "your message" : replyTo.fromName}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)} className="cursor-pointer">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={e => e.key === "Enter" && handleReply()}
                  />
                  <Button
                    onClick={handleReply}
                    disabled={!replyBody.trim() || sendMutation.isPending}
                    className="cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
