import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Layers,
  Video,
  Image as ImageIcon,
  Move,
  Edit3,
  Brain,
  BookText,
  Search,
  Presentation,
  Sparkles,
  Users,
  Globe,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Zap,
  Shield,
  ChevronRight,
  Play
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import heroBackground from "@assets/lboard_1763248872214.png";

export default function LandingPage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedContentType, setSelectedContentType] = useState<number | null>(null);

  const contentTypes = [
    {
      icon: BookOpen,
      name: "Quiz",
      description: "Interactive quizzes with instant feedback",
      color: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-600 dark:text-blue-400",
      accent: "bg-blue-500",
      detailedDescription: "Create engaging quizzes with multiple question types including multiple choice, true/false, fill-in-the-blank, ordering, and drag-and-drop. Students receive instant feedback on their answers, and you can track their performance through detailed analytics. Perfect for assessments, practice exercises, and knowledge checks."
    },
    {
      icon: Layers,
      name: "Flashcard",
      description: "Digital flashcards with optional images",
      color: "from-purple-500/20 to-purple-600/5",
      iconColor: "text-purple-600 dark:text-purple-400",
      accent: "bg-purple-500",
      detailedDescription: "Build digital flashcards to help students memorize key concepts, vocabulary, definitions, and more. Add images to enhance visual learning. Students can flip cards to reveal answers and study at their own pace. Ideal for language learning, terminology, and concept reinforcement."
    },
    {
      icon: Video,
      name: "Interactive Video",
      description: "Videos with embedded questions",
      color: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      accent: "bg-emerald-500",
      detailedDescription: "Transform passive video watching into an active learning experience. Embed questions, quizzes, and interactive elements at specific timestamps in your videos. Students must answer questions to continue watching, ensuring they stay engaged and understand the content. Great for flipped classrooms and video-based learning."
    },
    {
      icon: ImageIcon,
      name: "Image Hotspot",
      description: "Clickable areas on images",
      color: "from-orange-500/20 to-orange-600/5",
      iconColor: "text-orange-600 dark:text-orange-400",
      accent: "bg-orange-500",
      detailedDescription: "Create interactive images where students click on specific areas to reveal information, answer questions, or explore details. Perfect for diagrams, maps, scientific illustrations, historical images, and any visual content where location matters. Enhances spatial learning and visual comprehension."
    },
    {
      icon: Move,
      name: "Drag & Drop",
      description: "Match items by dragging",
      color: "from-pink-500/20 to-pink-600/5",
      iconColor: "text-pink-600 dark:text-pink-400",
      accent: "bg-pink-500",
      detailedDescription: "Design interactive matching activities where students drag items to their correct locations or pair related concepts. Supports categorization, sequencing, labeling, and matching exercises. Provides hands-on learning through manipulation and visual organization. Excellent for teaching relationships, processes, and classifications."
    },
    {
      icon: Edit3,
      name: "Fill in Blanks",
      description: "Complete sentences with missing words",
      color: "from-cyan-500/20 to-cyan-600/5",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      accent: "bg-cyan-500",
      detailedDescription: "Create fill-in-the-blank exercises where students complete sentences, paragraphs, or formulas by typing in missing words or phrases. Supports multiple correct answers and provides immediate feedback. Ideal for grammar practice, vocabulary building, formula memorization, and comprehension exercises."
    },
    {
      icon: Brain,
      name: "Memory Game",
      description: "Flip cards to find matching pairs",
      color: "from-amber-500/20 to-amber-600/5",
      iconColor: "text-amber-600 dark:text-amber-400",
      accent: "bg-amber-500",
      detailedDescription: "Build memory matching games where students flip cards to find pairs. Perfect for vocabulary, definitions, images and words, concepts, and more. Makes learning fun and helps improve memory retention through gamification. Great for younger learners and review activities."
    },
    {
      icon: BookText,
      name: "Interactive Book",
      description: "Rich multimedia books",
      color: "from-indigo-500/20 to-indigo-600/5",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      accent: "bg-indigo-500",
      detailedDescription: "Create rich, multimedia digital books with text, images, videos, audio, and embedded interactive activities. Students can navigate through chapters, interact with content, and complete embedded quizzes or activities. Perfect for creating comprehensive learning resources, textbooks, and interactive stories."
    },
    {
      icon: Search,
      name: "Video Finder",
      description: "Find educational videos from YouTube",
      color: "from-teal-500/20 to-teal-600/5",
      iconColor: "text-teal-600 dark:text-teal-400",
      accent: "bg-teal-500",
      detailedDescription: "Search and curate educational videos from YouTube to create focused learning playlists. Organize videos by topic, add descriptions, and share curated collections with your students. Helps students discover high-quality educational content while maintaining focus on learning objectives."
    },
    {
      icon: Presentation,
      name: "Presentation",
      description: "AI-generated presentations with real images",
      color: "from-rose-500/20 to-rose-600/5",
      iconColor: "text-rose-600 dark:text-rose-400",
      accent: "bg-rose-500",
      detailedDescription: "Generate professional presentations using AI assistance. Create slides with real images, structured content, and engaging visuals. Perfect for lectures, lessons, and educational content delivery. Students can view presentations at their own pace, making it ideal for both in-class and remote learning."
    },
  ];

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Generation",
      description: "Create complete lessons, quizzes, and flashcard sets in seconds. Our AI understands curriculum standards and adapts content to your students' level.",
      accent: "from-violet-500 to-purple-600"
    },
    {
      icon: GraduationCap,
      title: "Google Classroom Integration",
      description: "Push content directly to your Google Classroom courses. Students access assignments without leaving their learning environment.",
      accent: "from-blue-500 to-cyan-600"
    },
    {
      icon: Users,
      title: "Progress Tracking",
      description: "See who completed what, how they scored, and where they struggled. Identify gaps before they become problems.",
      accent: "from-emerald-500 to-teal-600"
    },
    {
      icon: Globe,
      title: "Public Sharing",
      description: "Generate shareable links for any content. Colleagues, parents, and students can access your materials from any device.",
      accent: "from-orange-500 to-amber-600"
    },
    {
      icon: Shield,
      title: "Accessible Design",
      description: "WCAG 2.1 AA compliant across all content types. Every learner can participate regardless of ability.",
      accent: "from-rose-500 to-pink-600"
    },
  ];

  // Bento grid layout assignments for content types
  const bentoLayout = [
    "sm:col-span-2 sm:row-span-2",  // Quiz - large featured
    "sm:col-span-1 sm:row-span-1",  // Flashcard
    "sm:col-span-1 sm:row-span-1",  // Interactive Video
    "sm:col-span-1 sm:row-span-2",  // Image Hotspot - tall
    "sm:col-span-1 sm:row-span-1",  // Drag & Drop
    "sm:col-span-1 sm:row-span-1",  // Fill in Blanks
    "sm:col-span-2 sm:row-span-1",  // Memory Game - wide
    "sm:col-span-1 sm:row-span-1",  // Interactive Book
    "sm:col-span-1 sm:row-span-1",  // Video Finder
    "sm:col-span-2 sm:row-span-1",  // Presentation - wide
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/favicon.png"
                alt="OECS Content Creator Logo"
                className="h-9 w-9 rounded-lg"
              />
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg tracking-tight text-foreground">OECS Content Creator</h1>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1" role="navigation">
              {[
                { href: "#features", label: "Features" },
                { href: "#content-types", label: "Content Types" },
                { href: "#get-started", label: "Get Started" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
                  data-testid={`link-nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="cursor-pointer"
                  data-testid="button-dashboard"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="cursor-pointer"
                    data-testid="button-login"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => navigate("/login")}
                    className="cursor-pointer"
                    data-testid="button-signup"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Asymmetric layout */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32" role="main">
        {/* Subtle gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Text content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="h-3.5 w-3.5" />
                Built for OECS Educators
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
                Turn any lesson into an{" "}
                <span className="text-primary">interactive experience</span>
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Create quizzes, flashcards, interactive videos, and 7 more content types
                with AI assistance. No design skills needed. Ready to share in minutes.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
                {user ? (
                  <Button
                    size="lg"
                    onClick={() => navigate("/dashboard")}
                    className="cursor-pointer gap-2 text-base h-12 px-6"
                    data-testid="button-hero-dashboard"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate("/login")}
                    className="cursor-pointer gap-2 text-base h-12 px-6"
                    data-testid="button-hero-get-started"
                  >
                    Start Creating for Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => document.getElementById('content-types')?.scrollIntoView({ behavior: 'smooth' })}
                  className="cursor-pointer gap-2 text-base h-12 px-6 text-muted-foreground"
                  data-testid="button-hero-learn-more"
                >
                  <Play className="h-4 w-4" />
                  See what you can build
                </Button>
              </div>

              {/* Trust strip */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Free to use</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>AI-powered</span>
                </div>
              </div>
            </div>

            {/* Right - Hero visual */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50">
                <img
                  src={heroBackground}
                  alt="OECS Content Creator platform showing interactive educational content"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              {/* Floating accent cards */}
              <div className="absolute -bottom-6 -left-6 bg-card rounded-xl p-4 shadow-lg border border-border/50 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">AI Generated</p>
                  <p className="text-xs text-muted-foreground">Content in seconds</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-card rounded-xl p-4 shadow-lg border border-border/50 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">10 Content Types</p>
                  <p className="text-xs text-muted-foreground">One platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Staggered cards */}
      <section id="features" className="py-24 scroll-mt-20 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-muted/30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <p className="text-sm font-semibold text-primary mb-3 tracking-wide uppercase">Platform Features</p>
            <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Everything you need to create engaging content
            </h3>
            <p className="text-lg text-muted-foreground">
              From AI generation to classroom integration, every feature is designed to save you time and delight your students.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-default ${
                  index === 0 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <CardContent className="p-6 sm:p-8">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center mb-5 shadow-sm`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-foreground text-lg mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
                {/* Subtle gradient accent on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Content Types Section - Bento Grid */}
      <section id="content-types" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary mb-3 tracking-wide uppercase">Content Types</p>
            <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
              10 ways to make learning stick
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Each format is purpose-built for a different kind of learning. Click any card to learn more.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)]">
            {contentTypes.map((type, index) => {
              const isLarge = index === 0;
              const isTall = index === 3;
              const isWide = index === 6 || index === 9;

              return (
                <div
                  key={index}
                  className={`
                    group relative rounded-2xl border border-border/60 bg-gradient-to-br ${type.color}
                    cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-border
                    hover:-translate-y-0.5 overflow-hidden
                    ${bentoLayout[index]}
                  `}
                  onClick={() => setSelectedContentType(index)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Learn more about ${type.name}`}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedContentType(index)}
                >
                  <div className={`h-full p-5 sm:p-6 flex flex-col ${isLarge ? 'justify-between' : 'justify-between'}`}>
                    <div>
                      <div className={`${isLarge ? 'h-14 w-14' : 'h-11 w-11'} rounded-xl bg-card/80 backdrop-blur-sm flex items-center justify-center mb-4 shadow-sm border border-border/30`}>
                        <type.icon className={`${isLarge ? 'h-7 w-7' : 'h-5 w-5'} ${type.iconColor}`} />
                      </div>
                      <h4 className={`font-bold text-foreground mb-1.5 ${isLarge ? 'text-xl' : 'text-base'}`}>
                        {type.name}
                      </h4>
                      <p className={`text-muted-foreground leading-relaxed ${isLarge ? 'text-sm max-w-xs' : 'text-xs'}`}>
                        {type.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-3">
                      Learn more <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                  {/* Accent dot */}
                  <div className={`absolute top-4 right-4 h-2 w-2 rounded-full ${type.accent} opacity-60`} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section - Gradient mesh instead of solid block */}
      <section id="get-started" className="py-24 scroll-mt-20 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            Start in under 2 minutes
          </div>

          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Your students deserve better than static worksheets
          </h3>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join educators across the Eastern Caribbean who are creating interactive,
            AI-powered content that students actually want to engage with.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="cursor-pointer gap-2 text-base h-12 px-8"
                data-testid="button-cta-dashboard"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="cursor-pointer gap-2 text-base h-12 px-8"
                data-testid="button-cta-get-started"
              >
                Create Your First Lesson
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Free forever. No credit card required.
          </p>
        </div>
      </section>

      {/* Content Type Details Dialog */}
      <Dialog open={selectedContentType !== null} onOpenChange={(open) => !open && setSelectedContentType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedContentType !== null && (() => {
            const selectedType = contentTypes[selectedContentType];
            const IconComponent = selectedType.icon;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${selectedType.color} border border-border/30 flex items-center justify-center`}>
                      <IconComponent className={`h-6 w-6 ${selectedType.iconColor}`} />
                    </div>
                    <DialogTitle className="text-2xl">{selectedType.name}</DialogTitle>
                  </div>
                  <DialogDescription className="text-base pt-2 leading-relaxed">
                    {selectedType.detailedDescription}
                  </DialogDescription>
                </DialogHeader>

                <div className="my-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Get Started</p>
                      <p className="text-sm text-muted-foreground">
                        {user
                          ? "You're logged in! Access this feature from your dashboard to start creating content."
                          : "Log in or create a free account to access this feature from your dashboard and start creating engaging educational content."}
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  {user ? (
                    <Button onClick={() => navigate("/dashboard")} className="w-full sm:w-auto cursor-pointer">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedContentType(null);
                          navigate("/login");
                        }}
                        className="w-full sm:w-auto cursor-pointer"
                      >
                        Log In
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedContentType(null);
                          navigate("/login");
                        }}
                        className="w-full sm:w-auto cursor-pointer"
                      >
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img
                  src="/favicon.png"
                  alt="OECS Content Creator Logo"
                  className="h-8 w-8 rounded-lg"
                />
                <span className="font-bold text-foreground">OECS Content Creator</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered interactive content for Caribbean educators. Create. Engage. Educate.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">Product</h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-footer-features"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#content-types"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="link-footer-content-types"
                  >
                    Content Types
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4 text-sm">Support</h4>
              <ul className="space-y-2.5">
                {user ? (
                  <li>
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      data-testid="link-footer-dashboard"
                    >
                      Dashboard
                    </button>
                  </li>
                ) : (
                  <>
                    <li>
                      <button
                        onClick={() => navigate("/login")}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        data-testid="link-footer-login"
                      >
                        Log In
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/login")}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        data-testid="link-footer-signup"
                      >
                        Sign Up
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                &copy; {new Date().getFullYear()} OECS Content Creator. Built for educators across the Eastern Caribbean.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/privacy-policy");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-privacy"
                >
                  Privacy Policy
                </a>
                <span className="text-border">|</span>
                <a
                  href="/terms-of-service"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/terms-of-service");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-terms"
                >
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
