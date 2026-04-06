import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ChatContextProvider } from "@/hooks/useChatContext";
import ChatAssistant from "@/components/ChatAssistant";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";
import Dashboard from "@/pages/Dashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import SharedResourcesPage from "@/pages/SharedResourcesPage";
import QuizCreator from "@/pages/QuizCreator";
import FlashcardCreator from "@/pages/FlashcardCreator";
import InteractiveVideoCreator from "@/pages/InteractiveVideoCreator";
import ImageHotspotCreator from "@/pages/ImageHotspotCreator";
import DragDropCreator from "@/pages/DragDropCreator";
import FillBlanksCreator from "@/pages/FillBlanksCreator";
import MemoryGameCreator from "@/pages/MemoryGameCreator";
import InteractiveBookCreator from "@/pages/InteractiveBookCreator";
import VideoFinderCreator from "@/pages/VideoFinderCreator";
import PresentationCreator from "@/pages/PresentationCreator";
import PreviewPage from "@/pages/PreviewPage";
import SharePage from "@/pages/SharePage";
import PublicPreviewPage from "@/pages/PublicPreviewPage";
import HelpPage from "@/pages/HelpPage";
import StudentHelpPage from "@/pages/StudentHelpPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ClassesPage from "@/pages/ClassesPage";
import GradebookPage from "@/pages/GradebookPage";
import StudentGradebookPage from "@/pages/StudentGradebookPage";
import LearningPathsPage from "@/pages/LearningPathsPage";
import StudentLearningPaths from "@/pages/StudentLearningPaths";
import MessagesPage from "@/pages/MessagesPage";
import ParentViewPage from "@/pages/ParentViewPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

/** Route that requires teacher or admin role — students get redirected to dashboard */
function TeacherRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "student") {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

/** Dashboard route — renders different dashboard based on role */
function DashboardRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return user.role === "student" ? <StudentDashboard /> : <Dashboard />;
}

/** Help page — renders student or teacher version based on role */
function HelpRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return user.role === "student" ? <StudentHelpPage /> : <HelpPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/public/:id" component={PublicPreviewPage} />
      <Route path="/parent/:token" component={ParentViewPage} />

      {/* Dashboard — role-aware */}
      <Route path="/dashboard">
        <DashboardRoute />
      </Route>

      {/* Teacher-only routes */}
      <Route path="/shared-resources">
        <TeacherRoute component={SharedResourcesPage} />
      </Route>
      <Route path="/create/quiz">
        <TeacherRoute component={QuizCreator} />
      </Route>
      <Route path="/create/quiz/:id">
        <TeacherRoute component={QuizCreator} />
      </Route>
      <Route path="/create/flashcard">
        <TeacherRoute component={FlashcardCreator} />
      </Route>
      <Route path="/create/flashcard/:id">
        <TeacherRoute component={FlashcardCreator} />
      </Route>
      <Route path="/create/interactive-video">
        <TeacherRoute component={InteractiveVideoCreator} />
      </Route>
      <Route path="/create/interactive-video/:id">
        <TeacherRoute component={InteractiveVideoCreator} />
      </Route>
      <Route path="/create/image-hotspot">
        <TeacherRoute component={ImageHotspotCreator} />
      </Route>
      <Route path="/create/image-hotspot/:id">
        <TeacherRoute component={ImageHotspotCreator} />
      </Route>
      <Route path="/create/drag-drop">
        <TeacherRoute component={DragDropCreator} />
      </Route>
      <Route path="/create/drag-drop/:id">
        <TeacherRoute component={DragDropCreator} />
      </Route>
      <Route path="/create/fill-blanks">
        <TeacherRoute component={FillBlanksCreator} />
      </Route>
      <Route path="/create/fill-blanks/:id">
        <TeacherRoute component={FillBlanksCreator} />
      </Route>
      <Route path="/create/memory-game">
        <TeacherRoute component={MemoryGameCreator} />
      </Route>
      <Route path="/create/memory-game/:id">
        <TeacherRoute component={MemoryGameCreator} />
      </Route>
      <Route path="/create/interactive-book">
        <TeacherRoute component={InteractiveBookCreator} />
      </Route>
      <Route path="/create/interactive-book/:id">
        <TeacherRoute component={InteractiveBookCreator} />
      </Route>
      <Route path="/create/video-finder">
        <TeacherRoute component={VideoFinderCreator} />
      </Route>
      <Route path="/create/video-finder/:id">
        <TeacherRoute component={VideoFinderCreator} />
      </Route>
      <Route path="/create/presentation">
        <TeacherRoute component={PresentationCreator} />
      </Route>
      <Route path="/create/presentation/:id">
        <TeacherRoute component={PresentationCreator} />
      </Route>
      <Route path="/share/:id">
        <TeacherRoute component={SharePage} />
      </Route>
      <Route path="/analytics">
        <TeacherRoute component={AnalyticsPage} />
      </Route>
      <Route path="/analytics/:contentId">
        <TeacherRoute component={AnalyticsPage} />
      </Route>
      <Route path="/classes">
        <TeacherRoute component={ClassesPage} />
      </Route>
      <Route path="/gradebook">
        <TeacherRoute component={GradebookPage} />
      </Route>
      <Route path="/learning-paths">
        <TeacherRoute component={LearningPathsPage} />
      </Route>

      {/* Accessible to all authenticated users */}
      <Route path="/my-learning-paths">
        <ProtectedRoute component={StudentLearningPaths} />
      </Route>
      <Route path="/my-grades">
        <ProtectedRoute component={StudentGradebookPage} />
      </Route>
      <Route path="/messages">
        <ProtectedRoute component={MessagesPage} />
      </Route>
      <Route path="/preview/:id">
        <ProtectedRoute component={PreviewPage} />
      </Route>
      <Route path="/help">
        <HelpRoute />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <ChatContextProvider>
      <ErrorBoundary section="page">
        <Router />
      </ErrorBoundary>
      {user && (
        <ErrorBoundary section="chat assistant" compact>
          <ChatAssistant />
        </ErrorBoundary>
      )}
    </ChatContextProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
