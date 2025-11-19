import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  GraduationCap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import heroBackground from "@assets/lboard_1763248872214.png";

export default function LandingPage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();

  const contentTypes = [
    { icon: BookOpen, name: "Quiz", description: "Interactive quizzes with instant feedback", color: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400" },
    { icon: Layers, name: "Flashcard", description: "Digital flashcards with optional images", color: "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400" },
    { icon: Video, name: "Interactive Video", description: "Videos with embedded questions", color: "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400" },
    { icon: ImageIcon, name: "Image Hotspot", description: "Clickable areas on images", color: "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400" },
    { icon: Move, name: "Drag & Drop", description: "Match items by dragging", color: "bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400" },
    { icon: Edit3, name: "Fill in Blanks", description: "Complete sentences with missing words", color: "bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400" },
    { icon: Brain, name: "Memory Game", description: "Flip cards to find matching pairs", color: "bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400" },
    { icon: BookText, name: "Interactive Book", description: "Rich multimedia books", color: "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" },
    { icon: Search, name: "Video Finder", description: "Find educational videos from YouTube", color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" },
    { icon: Presentation, name: "Presentation", description: "AI-generated presentations with real images", color: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400" },
  ];

  const features = [
    { icon: Sparkles, title: "AI-Powered Generation", description: "Create content faster with AI assistance using GPT-5" },
    { icon: GraduationCap, title: "Google Classroom Integration", description: "Share all content types directly to your courses" },
    { icon: Users, title: "Progress Tracking", description: "Monitor student engagement and completion rates" },
    { icon: Globe, title: "Public Sharing", description: "Share content with shareable links" },
    { icon: CheckCircle2, title: "Accessible Design", description: "WCAG 2.1 AA compliant for all learners" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img 
                src="/favicon.png" 
                alt="OECS Content Creator Logo" 
                className="h-9 w-9 rounded-lg"
              />
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg text-foreground">OECS Content Creator</h1>
                <p className="text-xs text-muted-foreground">Create. Engage. Educate.</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6" role="navigation">
              <a 
                href="#features" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-nav-features"
              >
                Features
              </a>
              <a 
                href="#content-types" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-nav-content-types"
              >
                Content Types
              </a>
              <a 
                href="#get-started" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-nav-get-started"
              >
                Get Started
              </a>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2">
              {user ? (
                <Button 
                  onClick={() => navigate("/dashboard")}
                  data-testid="button-dashboard"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/login")}
                    data-testid="button-login"
                  >
                    Log In
                  </Button>
                  <Button 
                    onClick={() => navigate("/login")}
                    data-testid="button-signup"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32" role="main">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(82, 64, 59, 0.85) 0%, rgba(34, 139, 34, 0.75) 50%, rgba(0, 128, 128, 0.85) 100%)'
          }}
        />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
              Create Interactive Educational
              <span className="block text-primary-foreground mt-2" style={{ color: '#a3e635' }}>Content in Minutes</span>
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-gray-100 max-w-3xl mx-auto">
              Empower educators across the Eastern Caribbean with AI-powered tools to create 
              engaging quizzes, flashcards, interactive videos, and more. All in one platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Button 
                  size="lg" 
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                  data-testid="button-hero-dashboard"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                  data-testid="button-hero-get-started"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => document.getElementById('content-types')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto border-white text-white hover:bg-white/10 backdrop-blur-sm"
                data-testid="button-hero-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2" style={{ color: '#a3e635' }}>10</div>
              <div className="text-sm text-gray-100">Content Types</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2" style={{ color: '#a3e635' }}>AI</div>
              <div className="text-sm text-gray-100">Powered Generation</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2" style={{ color: '#a3e635' }}>100%</div>
              <div className="text-sm text-gray-100">Free to Start</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for Caribbean Educators
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, share, and track interactive educational content
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Content Types Section */}
      <section id="content-types" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              10 Interactive Content Types
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from a variety of engaging formats to match your teaching style
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {contentTypes.map((type, index) => (
              <Card key={index} className="hover-elevate">
                <CardContent className="p-6">
                  <div className={`h-14 w-14 rounded-lg ${type.color} flex items-center justify-center mb-4`}>
                    <type.icon className="h-7 w-7" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">{type.name}</h4>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="get-started" className="py-20 bg-primary text-primary-foreground scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Transform Your Teaching?
          </h3>
          <p className="text-lg mb-8 opacity-90">
            Join educators across the Eastern Caribbean creating engaging content with OECS Content Creator
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto"
                data-testid="button-cta-dashboard"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto"
                data-testid="button-cta-get-started"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">OECS Content Creator</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Create. Engage. Educate.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2">
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

            {/* Support */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2">
                {user ? (
                  <li>
                    <button 
                      onClick={() => navigate("/dashboard")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="link-footer-login"
                      >
                        Log In
                      </button>
                    </li>
                    <li>
                      <button 
                        onClick={() => navigate("/login")}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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

          {/* Copyright and Legal Links */}
          <div className="pt-8 border-t">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                © {new Date().getFullYear()} OECS Content Creator. Built for educators across the Eastern Caribbean.
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
                <span className="text-muted-foreground">•</span>
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
