import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { 
  BookOpen, 
  LogOut, 
  FileQuestion, 
  Layers, 
  Video, 
  Image as ImageIcon, 
  Move,
  PenTool,
  Brain,
  BookOpenCheck,
  Search,
  Sparkles,
  Share2,
  Eye,
  ArrowLeft,
  Presentation,
  GraduationCap
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

export default function HelpPage() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const breadcrumbs = useBreadcrumbs();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content */}
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
              data-testid="button-back-dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src="/favicon.png" 
                alt="OECS Content Creator Logo" 
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">OECS Content Creator</h1>
              </div>
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
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout" aria-label="Log out">
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Help & User Manual</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about creating engaging educational content with OECS Content Creator
          </p>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
            <CardDescription>Get started with OECS Content Creator in minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Choose a Content Type</h4>
                <p className="text-sm text-muted-foreground">
                  Select from ten interactive content types on your dashboard: Quiz, Flashcard, Interactive Video, Image Hotspot, Drag & Drop, Fill in the Blanks, Memory Game, Interactive Book, Video Finder, or Google Slides.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Create or Generate with AI</h4>
                <p className="text-sm text-muted-foreground">
                  Build your content manually or use the AI generation feature to automatically create questions, flashcards, and more based on your topic and difficulty level.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Preview and Publish</h4>
                <p className="text-sm text-muted-foreground">
                  Test your content using the preview feature, then publish it to make it accessible to students. Share the link with your class.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Types */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Content Types</h2>
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg flex items-center justify-center">
                    <FileQuestion className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Quiz</CardTitle>
                    <CardDescription>Multiple choice questions with instant feedback</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Create engaging quizzes with multiple-choice questions. Each question can have up to four answer options with one correct answer. Students receive immediate feedback on their responses.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Keep questions clear and concise</li>
                  <li>Use plausible distractors (incorrect answers)</li>
                  <li>Provide helpful feedback for both correct and incorrect answers</li>
                  <li>Mix difficulty levels to challenge all learners</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-lg flex items-center justify-center">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Flashcard</CardTitle>
                    <CardDescription>Flip cards for memorization and review</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Digital flashcards with front and back sides. Perfect for vocabulary, definitions, formulas, and any content requiring memorization. Students can flip cards to reveal answers.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Keep front side questions brief and focused</li>
                  <li>Provide comprehensive but concise answers on the back</li>
                  <li>Group related concepts together</li>
                  <li>Use images where appropriate to enhance memory retention</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-lg flex items-center justify-center">
                    <Video className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Interactive Video</CardTitle>
                    <CardDescription>Videos with clickable hotspots at specific times</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Embed YouTube videos with interactive hotspots that appear at specific timestamps. Add questions, additional information, or links at key moments in the video.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Place hotspots at important moments in the video</li>
                  <li>Don't overload with too many hotspots</li>
                  <li>Use hotspots to clarify complex concepts</li>
                  <li>Test timing to ensure hotspots appear at the right moment</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Image Hotspot</CardTitle>
                    <CardDescription>Interactive clickable areas on images</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload images and add clickable hotspots to different areas. Perfect for anatomy diagrams, maps, infographics, and visual learning materials.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Use high-quality, clear images</li>
                  <li>Position hotspots precisely on relevant areas</li>
                  <li>Provide informative descriptions for each hotspot</li>
                  <li>Ensure hotspots are visually distinct and easy to click</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 rounded-lg flex items-center justify-center">
                    <Move className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Drag & Drop</CardTitle>
                    <CardDescription>Match items by dragging to correct drop zones</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Create interactive matching activities where students drag items to their correct categories or positions. Great for classification, sequencing, and matching exercises.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Create clear, unambiguous categories</li>
                  <li>Use 3-5 drop zones for optimal difficulty</li>
                  <li>Include 2-4 items per drop zone</li>
                  <li>Provide immediate feedback on correct/incorrect placements</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300 rounded-lg flex items-center justify-center">
                    <PenTool className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Fill in the Blanks</CardTitle>
                    <CardDescription>Complete sentences with missing words</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Create sentences with missing words that students must fill in. Excellent for vocabulary, grammar, and concept reinforcement.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Ensure context provides enough clues</li>
                  <li>Use 1-3 blanks per sentence for clarity</li>
                  <li>Accept multiple correct answers where appropriate</li>
                  <li>Provide hints for challenging terms</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded-lg flex items-center justify-center">
                    <Brain className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Memory Game</CardTitle>
                    <CardDescription>Match pairs of cards in a memory challenge</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Classic memory card game where students flip cards to find matching pairs. Great for vocabulary, definitions, and concept associations.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Use 6-12 pairs for appropriate difficulty</li>
                  <li>Create clear, memorable associations</li>
                  <li>Keep card content concise and readable</li>
                  <li>Use images to enhance visual memory</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-lg flex items-center justify-center">
                    <BookOpenCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Interactive Book</CardTitle>
                    <CardDescription>Multi-page books with rich text and embedded content</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Create comprehensive learning experiences with multiple pages. Each page can include rich formatted text, images, and embedded interactive content from other content types.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Organize content into logical chapters/sections</li>
                  <li>Use headings and formatting for readability</li>
                  <li>Embed quizzes or activities to reinforce learning</li>
                  <li>Keep pages focused on one topic or concept</li>
                  <li>Include navigation aids and progress tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-lg flex items-center justify-center">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Video Finder</CardTitle>
                    <CardDescription>Discover educational YouTube videos by topic</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Search and curate collections of educational YouTube videos based on specific learning criteria. Specify subject, topic, learning outcomes, grade level, and age range to find relevant video resources.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Be specific with your search criteria for better results</li>
                  <li>Include clear learning outcomes to focus the search</li>
                  <li>Specify appropriate grade level and age range</li>
                  <li>Review videos for content quality and relevance</li>
                  <li>Share curated video collections with students for independent learning</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-lg flex items-center justify-center">
                    <Presentation className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Google Slides</CardTitle>
                    <CardDescription>AI-generated educational presentations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Create professional educational presentations powered by AI. Specify your topic, grade level, and learning outcomes, and the AI generates a complete slide deck with real educational images from Unsplash. Export directly to Google Slides for editing and presenting.
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Features:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>AI-generated pedagogically sound content following Universal Design for Learning (UDL)</li>
                  <li>Real educational images automatically sourced from Unsplash</li>
                  <li>Speaker notes with teaching tips and pedagogical guidance</li>
                  <li>Guiding questions (recall to analysis to application levels)</li>
                  <li>Reflection questions for deeper thinking</li>
                  <li>One-click export to create actual Google Slides presentations</li>
                  <li>Full editing capability in Google Slides</li>
                </ul>
                <p className="text-sm font-semibold text-foreground mt-3 mb-2">Best Practices:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Provide clear learning outcomes for better AI results</li>
                  <li>Specify accurate grade level and age range</li>
                  <li>Review and customize AI-generated content before sharing</li>
                  <li>Use speaker notes as a teaching guide</li>
                  <li>Edit in Google Slides for advanced customization</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Guide */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Features & Functions</h2>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="ai-generation">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>AI Content Generation</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Save time by using AI to automatically generate educational content. The AI can create quizzes, flashcards, video hotspots, and more based on your specifications.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">How to Use AI Generation:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Click the AI generation button when creating content</li>
                      <li>Enter your topic (e.g., "Photosynthesis", "World War II")</li>
                      <li>Select difficulty level (Beginner, Intermediate, Advanced)</li>
                      <li>Specify grade level and number of items</li>
                      <li>Add any additional context or requirements</li>
                      <li>Click Generate and review the AI-created content</li>
                      <li>Edit and customize as needed before saving</li>
                    </ol>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Tips for Better AI Results:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Be specific with your topic</li>
                      <li>Include learning objectives in additional context</li>
                      <li>Specify the appropriate grade level</li>
                      <li>Review and fact-check AI-generated content</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="publishing">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <span>Publishing & Sharing</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Make your content accessible to students by publishing and sharing it. Published content gets a unique link that anyone can access.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Publishing Process:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Complete and save your content</li>
                      <li>Toggle the "Published" switch to make it live</li>
                      <li>Click the Share button to get the public link</li>
                      <li>Copy and share the link with your students</li>
                      <li>Track student progress and completion</li>
                    </ol>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Privacy & Access:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Only published content can be accessed via share links</li>
                      <li>Unpublished content remains private to you</li>
                      <li>You can unpublish content at any time</li>
                      <li>Progress tracking works for both logged-in and anonymous users</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="preview">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <span>Preview & Testing</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Always preview your content before publishing to ensure it works correctly and looks professional.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Preview Features:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Test all interactive elements</li>
                      <li>Check question difficulty and clarity</li>
                      <li>Verify images and media load correctly</li>
                      <li>Test on both desktop and mobile devices</li>
                      <li>Review feedback messages and explanations</li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click the "Preview" button from the dashboard or during editing to see how students will experience your content.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="classroom">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span>Google Classroom Integration</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Share any published content directly to your Google Classroom courses as assignments or announcements. This feature works with all 10 content types.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">How to Share to Google Classroom:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Sign in with your Google account (required for Classroom access)</li>
                      <li>Publish your content using the "Published" toggle</li>
                      <li>Click the "Share to Classroom" button (appears in creator toolbar and preview page)</li>
                      <li>Select whether to share as an Assignment or Announcement</li>
                      <li>Choose the course from your list of active Google Classroom courses</li>
                      <li>For assignments: optionally set a due date, time, and point value</li>
                      <li>Click "Share" to post to Google Classroom</li>
                    </ol>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Supported Content Types:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>✓ Quizzes</li>
                      <li>✓ Flashcards</li>
                      <li>✓ Interactive Videos</li>
                      <li>✓ Image Hotspots</li>
                      <li>✓ Drag & Drop Activities</li>
                      <li>✓ Fill in the Blanks</li>
                      <li>✓ Memory Games</li>
                      <li>✓ Interactive Books</li>
                      <li>✓ Video Finder Collections</li>
                      <li>✓ Google Slides Presentations</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Requirements:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Must sign in with a Google account that has access to Google Classroom</li>
                      <li>Google Classroom API must be enabled in your Google Cloud Console</li>
                      <li>Content must be published before sharing</li>
                      <li>You must be the teacher of the course you're sharing to</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Share Locations:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li><strong>Creator Pages:</strong> Button appears in the toolbar when content is published</li>
                      <li><strong>Preview Pages:</strong> Button appears in the header for all published content</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="shared-resources">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <span>Shared Resources</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Share your best educational content with other teachers across the Caribbean, and discover resources created by your colleagues. The Shared Resources feature helps build a collaborative community of educators.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">How to Share Your Content Publicly:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Create and complete your content (any of the 10 content types)</li>
                      <li>Toggle the "Published" switch to make it live</li>
                      <li>Enable the "Share as Public Resource" toggle in the content details</li>
                      <li>Your content will now appear in the Shared Resources page for all teachers</li>
                    </ol>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">How to Browse Shared Resources:</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Click the "Shared Resources" button (Users icon) in the Dashboard header</li>
                      <li>Browse through content shared by other teachers</li>
                      <li>Use search to find specific topics or titles</li>
                      <li>Filter by content type (Quiz, Flashcard, etc.)</li>
                      <li>Filter by tags to find subject-specific content</li>
                      <li>Click "Preview & Use" to view and interact with any resource</li>
                    </ol>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Privacy & Control:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Only content you explicitly mark as public will be shared</li>
                      <li>You can unpublish or remove public sharing at any time</li>
                      <li>Content must be published before it can be made public</li>
                      <li>Your name and basic info appear as the creator</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Best Practices for Sharing:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Add descriptive titles and clear descriptions</li>
                      <li>Use relevant tags (subject, grade level, topic)</li>
                      <li>Preview your content before making it public</li>
                      <li>Share your best, most polished work</li>
                      <li>Include learning outcomes in descriptions</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="progress">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span>Progress Tracking</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Track student progress automatically as they interact with your content. The system monitors completion, time spent, and performance.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Tracked Metrics:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Completion percentage for each content item</li>
                      <li>Time spent on activities</li>
                      <li>Quiz scores and attempt history</li>
                      <li>Pages viewed in interactive books</li>
                      <li>Individual interaction events (card flips, hotspot clicks)</li>
                    </ul>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">How Progress Works:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Progress is saved automatically as students interact</li>
                      <li>Students can pick up where they left off</li>
                      <li>Logged-in users get persistent progress across devices</li>
                      <li>Anonymous users maintain progress during their session</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="organization">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-primary" />
                  <span>Content Organization</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Keep your content library organized with search, filtering, and tagging features.
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Organization Tools:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li><strong>Search:</strong> Find content by title or description</li>
                      <li><strong>Type Filters:</strong> View only specific content types</li>
                      <li><strong>Tags:</strong> Add tags to categorize content (e.g., "science", "grade-9")</li>
                      <li><strong>Date Filters:</strong> Filter by creation or modification date</li>
                      <li><strong>View Modes:</strong> Switch between grid and list views</li>
                    </ul>
                  </div>
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Tagging Best Practices:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Use consistent tag names (e.g., "biology" not "bio")</li>
                      <li>Include subject, grade level, and topic tags</li>
                      <li>Don't over-tag - 3-5 tags per item is ideal</li>
                      <li>Use lowercase for consistency</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* FAQ */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger>How do I delete content I no longer need?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    From your dashboard, click the trash icon on any content card. You'll be asked to confirm the deletion. Note that this action cannot be undone, and any shared links will stop working.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger>Can I edit content after it's published?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Yes! You can edit published content at any time. Changes are saved automatically and will be reflected immediately for anyone accessing the shared link. Student progress is preserved when you make edits.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger>How accurate is the AI content generation?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    The AI uses advanced language models to generate high-quality content, but it's important to always review and fact-check the generated material. The AI works best when you provide clear, specific topics and additional context. Think of it as a helpful assistant that provides a strong starting point that you can refine.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4">
                <AccordionTrigger>Can students access content without creating an account?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Yes! Published content can be accessed by anyone with the share link, no account required. Anonymous users can complete activities and their progress is tracked during their session, though it won't be saved long-term. Students who create accounts get persistent progress tracking across devices.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-5">
                <AccordionTrigger>What image formats are supported?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    You can upload images in JPG, PNG, GIF, and WebP formats. For best results, use high-resolution images (at least 1200px wide) and keep file sizes under 5MB for faster loading.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-6">
                <AccordionTrigger>How do I embed content in an Interactive Book?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    When editing an Interactive Book page, use the "Embed Content" button to select from your existing quizzes, flashcards, or other content types. The embedded content will appear on that page and students can interact with it directly. Changes to the original content automatically update in the book.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-7">
                <AccordionTrigger>Is there a limit to how much content I can create?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    There are no limits on the number of content items you can create. However, individual content items have practical limits (e.g., 50 questions per quiz, 100 flashcards per set) to ensure optimal performance and user experience.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>We're here to support Caribbean educators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              OECS Content Creator is designed to empower educators across the Organization of Eastern Caribbean States. If you need additional assistance:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">Tip</Badge>
                <p className="text-sm text-muted-foreground">
                  Try the AI generation feature with specific, detailed prompts for best results
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">Tip</Badge>
                <p className="text-sm text-muted-foreground">
                  Always preview your content before sharing with students
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">Tip</Badge>
                <p className="text-sm text-muted-foreground">
                  Use tags to organize content by subject, grade level, and topic
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button onClick={() => navigate("/dashboard")} size="lg" data-testid="button-back-to-dashboard">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
