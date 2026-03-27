import { createContext, useContext, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface ChatContextValue {
  page: string;
  contentType?: string;
  contentId?: string;
  userRole?: string;
  institution?: string;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatContextProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const contextValue = useMemo(() => {
    let page = "Dashboard";
    let contentType: string | undefined;
    let contentId: string | undefined;

    if (location.startsWith("/create/")) {
      const parts = location.split("/");
      contentType = parts[2]?.split("?")[0];
      contentId = parts[3];
      page = `${contentType} Creator`;
    } else if (location.startsWith("/preview/")) {
      page = "Preview";
      contentId = location.split("/")[2];
    } else if (location.startsWith("/analytics")) {
      page = "Analytics Dashboard";
    } else if (location.startsWith("/help")) {
      page = "Help Center";
    } else if (location.startsWith("/share/")) {
      page = "Share";
      contentId = location.split("/")[2];
    } else if (location === "/" || location.startsWith("/dashboard")) {
      page = "Dashboard";
    }

    return {
      page,
      contentType,
      contentId,
      userRole: user?.role,
      institution: user?.institution || undefined,
    };
  }, [location, user]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatContextProvider");
  }
  return context;
}
