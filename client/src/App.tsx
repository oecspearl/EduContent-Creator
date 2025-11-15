import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import QuizCreator from "@/pages/QuizCreator";
import FlashcardCreator from "@/pages/FlashcardCreator";
import InteractiveVideoCreator from "@/pages/InteractiveVideoCreator";
import ImageHotspotCreator from "@/pages/ImageHotspotCreator";
import DragDropCreator from "@/pages/DragDropCreator";
import FillBlanksCreator from "@/pages/FillBlanksCreator";
import MemoryGameCreator from "@/pages/MemoryGameCreator";
import InteractiveBookCreator from "@/pages/InteractiveBookCreator";
import PreviewPage from "@/pages/PreviewPage";
import SharePage from "@/pages/SharePage";
import PublicPreviewPage from "@/pages/PublicPreviewPage";
import HelpPage from "@/pages/HelpPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/public/:id" component={PublicPreviewPage} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/create/quiz">
        <ProtectedRoute component={QuizCreator} />
      </Route>
      <Route path="/create/quiz/:id">
        <ProtectedRoute component={QuizCreator} />
      </Route>
      <Route path="/create/flashcard">
        <ProtectedRoute component={FlashcardCreator} />
      </Route>
      <Route path="/create/flashcard/:id">
        <ProtectedRoute component={FlashcardCreator} />
      </Route>
      <Route path="/create/interactive-video">
        <ProtectedRoute component={InteractiveVideoCreator} />
      </Route>
      <Route path="/create/interactive-video/:id">
        <ProtectedRoute component={InteractiveVideoCreator} />
      </Route>
      <Route path="/create/image-hotspot">
        <ProtectedRoute component={ImageHotspotCreator} />
      </Route>
      <Route path="/create/image-hotspot/:id">
        <ProtectedRoute component={ImageHotspotCreator} />
      </Route>
      <Route path="/create/drag-drop">
        <ProtectedRoute component={DragDropCreator} />
      </Route>
      <Route path="/create/drag-drop/:id">
        <ProtectedRoute component={DragDropCreator} />
      </Route>
      <Route path="/create/fill-blanks">
        <ProtectedRoute component={FillBlanksCreator} />
      </Route>
      <Route path="/create/fill-blanks/:id">
        <ProtectedRoute component={FillBlanksCreator} />
      </Route>
      <Route path="/create/memory-game">
        <ProtectedRoute component={MemoryGameCreator} />
      </Route>
      <Route path="/create/memory-game/:id">
        <ProtectedRoute component={MemoryGameCreator} />
      </Route>
      <Route path="/create/interactive-book">
        <ProtectedRoute component={InteractiveBookCreator} />
      </Route>
      <Route path="/create/interactive-book/:id">
        <ProtectedRoute component={InteractiveBookCreator} />
      </Route>
      <Route path="/preview/:id">
        <ProtectedRoute component={PreviewPage} />
      </Route>
      <Route path="/share/:id">
        <ProtectedRoute component={SharePage} />
      </Route>
      <Route path="/help">
        <ProtectedRoute component={HelpPage} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={AnalyticsPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
