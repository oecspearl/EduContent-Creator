import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import {
  BookOpen,
  LogOut,
  ArrowLeft,
  Play,
  Trophy,
  BarChart3,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  MessageCircle,
  Lightbulb,
} from "lucide-react";
import { useLocation } from "wouter";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function StudentHelpPage() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const breadcrumbs = useBreadcrumbs();

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50" role="banner">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              aria-label="Back to dashboard"
              className="cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="OECS Content Creator Logo"
                className="h-10 w-10 rounded-lg"
              />
              <h1 className="text-xl font-bold text-foreground">Student Help</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Log out" className="cursor-pointer">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Main Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-6 py-12" role="main">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Student Guide</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about using OECS Content Creator as a student
          </p>
        </div>

        {/* Getting Started */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>How to use the platform as a student</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Check Your Dashboard</h4>
                <p className="text-sm text-muted-foreground">
                  When you log in, your dashboard shows all your assignments, scores, and progress at a glance. Look at the summary cards at the top to see how you're doing overall.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Complete Your Assignments</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Start" or "Continue" on any assignment to begin working on it. Your progress is saved automatically, so you can come back to it later.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Review Your Results</h4>
                <p className="text-sm text-muted-foreground">
                  After completing a quiz, you can see your score and use the "Get AI Study Insights" button for personalized tips on how to improve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Guide */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Understanding Your Dashboard</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-foreground">Assignments Tab</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shows all work assigned to you by your teacher. Pending assignments appear at the top with due dates highlighted. Overdue items have a red border so you can prioritize them.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-foreground">My Scores Tab</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  View your best scores for all quizzes and activities. Scores are color-coded: green (80%+) means great work, yellow (60-79%) means good but room to grow, and red (below 60%) means you should review the material.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-foreground">Progress Tab</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  See your overall completion percentage and track progress on each individual assignment. A green checkmark means you've completed it. The progress bar shows how far along you are on each item.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-foreground">Summary Cards</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  The four cards at the top of your dashboard show: how many classes you're in, how many assignments you've completed, your average progress across everything, and how many items are still to do.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Types Guide */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Types of Activities</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your teacher may assign you different types of interactive content. Here's what to expect with each one:
          </p>
          <div className="grid gap-3">
            {[
              { icon: "📝", title: "Quizzes", desc: "Answer questions and get instant feedback. You can see which ones you got right or wrong, and use AI insights to understand what to study." },
              { icon: "🃏", title: "Flashcards", desc: "Flip cards to study terms and definitions. Great for memorizing vocabulary, formulas, or key facts." },
              { icon: "🎬", title: "Interactive Videos", desc: "Watch videos with pop-up questions and information at key moments. Pay attention to the hotspots that appear!" },
              { icon: "🖼️", title: "Image Hotspots", desc: "Click on different parts of an image to learn about what's there. Great for maps, diagrams, and anatomy." },
              { icon: "🔀", title: "Drag & Drop", desc: "Drag items into the correct categories. Think carefully about where each item belongs." },
              { icon: "✏️", title: "Fill in the Blanks", desc: "Complete sentences by typing the missing words. Spelling counts, but the system accepts common variations." },
              { icon: "🧩", title: "Memory Game", desc: "Find matching pairs by flipping cards. Try to remember where each card is to match them faster." },
              { icon: "📖", title: "Interactive Books", desc: "Read through pages that may include videos, quizzes, and images. Work through each page to complete the activity." },
              { icon: "📊", title: "Presentations", desc: "View educational presentations created by your teacher with slides, images, and key learning points." },
            ].map((item) => (
              <Card key={item.title} className="border-border/40">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-medium text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <Card className="mb-8 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded-lg flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>AI Study Insights</CardTitle>
                <CardDescription>Your personal AI study helper</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              After completing a quiz, look for the <strong>"Get AI Study Insights"</strong> button on your results screen. This uses AI to give you:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span><strong>What you did well</strong> — recognition of the topics you've mastered</span>
              </li>
              <li className="flex items-start gap-2">
                <Target className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span><strong>Areas to focus on</strong> — specific concepts to review based on your wrong answers</span>
              </li>
              <li className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span><strong>Question explanations</strong> — clear explanations of why the correct answer is right</span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                <span><strong>Study tips</strong> — practical advice on how to improve</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="progress-saved" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                Is my progress saved automatically?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Yes! Your progress is saved automatically as you work through activities. If you close the browser or navigate away, you can come back and continue where you left off.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="retry-quiz" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                Can I retry a quiz?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                If your teacher has enabled retries, you'll see a "Retry Quiz" button after you finish. Your best score is the one that counts in your scores tab. Practice makes perfect!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="due-dates" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                What happens if I miss a due date?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Overdue assignments will show with a red border on your dashboard. You can still complete them after the due date — the system won't lock you out. However, it's best to complete assignments on time. Talk to your teacher if you need more time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="score-meaning" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                What do the score colors mean?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <strong className="text-green-600">Green (80%+)</strong> — Excellent or Great work! You have a strong understanding of the material.
                <br />
                <strong className="text-yellow-600">Yellow (60-79%)</strong> — Good effort, but there's room to improve. Review the topics you missed.
                <br />
                <strong className="text-red-600">Red (below 60%)</strong> — This topic needs more attention. Use the AI insights and study tips to help you improve.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai-insights" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                How do AI Study Insights work?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                After finishing a quiz, click the "Get AI Study Insights" button. The AI looks at which questions you got wrong and gives you personalized feedback: what you did well, what to focus on, explanations for tricky questions, and study tips. It's like having a tutor review your work!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="multiple-classes" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                I'm in multiple classes — how do I see assignments for each one?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                All your assignments from all classes appear together on your dashboard. Each assignment shows which class it's from, so you can easily tell them apart. The summary cards at the top show totals across all your classes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="chat-assistant" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                Can I use the chat assistant?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Yes! The chat assistant (the chat bubble in the bottom-right corner) is available to help you with questions about the platform, your assignments, or study tips. Feel free to ask it anything about how to use the platform.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="password" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium cursor-pointer">
                How do I change my password?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Go to <strong>Settings</strong> from the sidebar menu. You can update your password and profile information there.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Contact */}
        <Card className="border-border/40">
          <CardContent className="py-8 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Need More Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you're stuck or have a question that isn't answered here, talk to your teacher or use the chat assistant.
            </p>
            <Button className="cursor-pointer" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
