import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, Trash2, Sparkles, Globe, ExternalLink, AlertCircle, Palette } from "lucide-react";
import type { GoogleSlidesData, SlideContent, H5pContent } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";

export default function GoogleSlidesCreator() {
  const { id: contentId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isEditing = !!contentId;
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([""]);
  const [numberOfSlides, setNumberOfSlides] = useState(10);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [generatedDate, setGeneratedDate] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [presentationId, setPresentationId] = useState<string>("");
  const [presentationUrl, setPresentationUrl] = useState<string>("");
  const [colorScheme, setColorScheme] = useState<string>("blue");

  const { data: content, isLoading: isLoadingContent } = useQuery<H5pContent>({
    queryKey: [`/api/content/${contentId}`],
    enabled: isEditing,
  });

  const { data: authProviders, isLoading: isLoadingProviders } = useQuery<{ google: boolean; microsoft: boolean }>({
    queryKey: ["/api/auth/providers"],
  });

  useEffect(() => {
    if (content && content.type === "google-slides") {
      setTitle(content.title);
      setDescription(content.description || "");
      const data = content.data as GoogleSlidesData;
      setTopic(data.topic);
      setGradeLevel(data.gradeLevel);
      setAgeRange(data.ageRange);
      setLearningOutcomes(data.learningOutcomes);
      setSlides(data.slides || []);
      setGeneratedDate(data.generatedDate);
      setIsPublished(content.isPublished);
      setIsPublic(content.isPublic || false);
      setPresentationId(data.presentationId || "");
      setPresentationUrl(data.presentationUrl || "");
      setColorScheme(data.colorScheme || "blue");
    }
  }, [content]);

  // Handle return from Google authentication
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('googleAuthSuccess') === 'true' && user?.googleAccessToken) {
      // User just authenticated with Google, show success message
      toast({
        title: "Google Account Connected!",
        description: "You can now create Google Slides presentations.",
      });
      
      // Clean up URL
      urlParams.delete('googleAuthSuccess');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [user, toast]);

  const saveMutation = useMutation({
    mutationFn: async (params: { publish: boolean }) => {
      const data: GoogleSlidesData = {
        topic,
        gradeLevel,
        ageRange,
        learningOutcomes: learningOutcomes.filter(o => o.trim()),
        slides,
        generatedDate: generatedDate || new Date().toISOString(),
        colorScheme,
        ...(presentationId && { presentationId }),
        ...(presentationUrl && { presentationUrl }),
      };

      if (isEditing) {
        const response = await apiRequest("PUT", `/api/content/${contentId}`, {
          title,
          description,
          data,
          isPublished: params.publish,
          isPublic,
        });
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/content", {
          title,
          description,
          type: "google-slides",
          data,
          isPublished: params.publish,
          isPublic,
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      if (!isEditing) {
        navigate(`/create/google-slides/${data.id}`);
      }
      toast({ title: "Saved!", description: "Google Slides content saved successfully." });
      setIsSaving(false);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-slides/generate", {
        topic,
        gradeLevel,
        ageRange,
        learningOutcomes: learningOutcomes.filter(o => o.trim()),
        numberOfSlides,
      });
      return await response.json();
    },
    onSuccess: async (data) => {
      let slidesData = data.slides || [];
      
      // Fetch images from Unsplash for slides with search queries
      try {
        const slidesWithImages = await Promise.all(
          slidesData.map(async (slide: SlideContent) => {
            if (slide.imageUrl && !slide.imageUrl.startsWith('http')) {
              // This is a search query, fetch actual image
              try {
                const imageResponse = await apiRequest("POST", "/api/unsplash/search", {
                  query: slide.imageUrl,
                  count: 1,
                });
                const imageData = await imageResponse.json();
                
                if (imageData.photos && imageData.photos.length > 0) {
                  const photo = imageData.photos[0];
                  return {
                    ...slide,
                    imageUrl: photo.urls.regular,
                    imageAlt: slide.imageAlt || photo.alt_description || photo.description,
                  };
                }
              } catch (err) {
                console.error("Failed to fetch image for slide:", err);
              }
            }
            return slide;
          })
        );
        
        setSlides(slidesWithImages);
        toast({ 
          title: "Generated with Images!", 
          description: "Slides content and images generated successfully." 
        });
      } catch (err) {
        // Fallback to slides without images if image fetching fails
        setSlides(slidesData);
        toast({ 
          title: "Generated!", 
          description: "Slides content generated. Some images may not have loaded." 
        });
      }
      
      setGeneratedDate(data.generatedDate);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate slides. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createPresentationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-slides/create-presentation", {
        title,
        slides,
      });
      return await response.json();
    },
    onSuccess: async (data) => {
      setPresentationId(data.presentationId);
      setPresentationUrl(data.url);
      toast({ 
        title: "Created in Google Slides!", 
        description: "Your presentation is ready. Click 'Open in Google Slides' to view it." 
      });
      
      // Save the presentation URL to content
      if (isEditing && contentId) {
        try {
          const updatedData: GoogleSlidesData = {
            topic,
            gradeLevel,
            ageRange,
            learningOutcomes: learningOutcomes.filter(o => o.trim()),
            slides,
            generatedDate: generatedDate || new Date().toISOString(),
            colorScheme,
            presentationId: data.presentationId,
            presentationUrl: data.url,
          };
          
          await apiRequest("PUT", `/api/content/${contentId}`, {
            title,
            description,
            data: updatedData,
            isPublished,
          });
          queryClient.invalidateQueries({ queryKey: [`/api/content/${contentId}`] });
        } catch (error: any) {
          toast({
            title: "Warning",
            description: "Presentation created but failed to save URL. Please save manually.",
            variant: "destructive",
          });
        }
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || "An error occurred";
      
      if (errorMessage.includes("Google") || errorMessage.includes("OAuth") || errorMessage.includes("connect your account")) {
        // Auto-redirect to Google authentication
        toast({
          title: "Google Authentication Required",
          description: "Redirecting to Google sign-in...",
        });
        
        // Build return URL with current location
        const returnUrl = window.location.pathname;
        
        // Redirect to Google OAuth with return URL
        setTimeout(() => {
          window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnUrl)}`;
        }, 1500);
      } else {
        toast({
          title: "Failed to create presentation",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handleSave = () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please provide a title before saving",
        variant: "destructive",
      });
      return;
    }
    if (slides.length === 0) {
      toast({
        title: "No slides",
        description: "Please generate slides before saving",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    saveMutation.mutate({ publish: isPublished });
  };

  const handlePublish = () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please provide a title before publishing",
        variant: "destructive",
      });
      return;
    }
    if (slides.length === 0) {
      toast({
        title: "No slides",
        description: "Please generate slides before publishing",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    setIsPublished(true);
    saveMutation.mutate({ publish: true });
  };

  const handleGenerate = () => {
    if (!topic || !gradeLevel || !ageRange) {
      toast({
        title: "Missing information",
        description: "Please fill in topic, grade level, and age range",
        variant: "destructive",
      });
      return;
    }
    const validOutcomes = learningOutcomes.filter(o => o.trim());
    if (validOutcomes.length === 0) {
      toast({
        title: "Missing learning outcomes",
        description: "Please add at least one learning outcome",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const addLearningOutcome = () => {
    setLearningOutcomes([...learningOutcomes, ""]);
  };

  const removeLearningOutcome = (index: number) => {
    setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index));
  };

  const updateLearningOutcome = (index: number, value: string) => {
    const updated = [...learningOutcomes];
    updated[index] = value;
    setLearningOutcomes(updated);
  };

  if (isLoadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-content" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Edit Google Slides" : "Create Google Slides"}
          </h1>
        </div>
        <div className="flex gap-2">
          {contentId && presentationUrl && (
            <ShareToClassroomDialog
              contentTitle={title}
              contentDescription={description}
              materialLink={presentationUrl}
            />
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || !title || slides.length === 0}
            data-testid="button-save"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSaving || !title || slides.length === 0}
            variant="default"
            data-testid="button-publish"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            <Globe className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Photosynthesis"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this presentation"
                  rows={3}
                  data-testid="input-description"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">Share as Public Resource</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other teachers to discover and use this Google Slides presentation on the Shared Resources page. Content will be automatically published when shared.
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => {
                    setIsPublic(checked);
                    if (checked) {
                      setIsPublished(true);
                    }
                  }}
                  data-testid="switch-public"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Presentation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis"
                  data-testid="input-topic"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gradeLevel">Grade Level *</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger id="gradeLevel" data-testid="select-grade">
                      <SelectValue placeholder="Select grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pre-K">Pre-K</SelectItem>
                      <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                      <SelectItem value="K-2">K-2 (Grades K-2)</SelectItem>
                      <SelectItem value="3-5">3-5 (Grades 3-5)</SelectItem>
                      <SelectItem value="6-8">6-8 (Grades 6-8)</SelectItem>
                      <SelectItem value="9-12">9-12 (Grades 9-12)</SelectItem>
                      <SelectItem value="Higher Education">Higher Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ageRange">Age Range *</Label>
                  <Input
                    id="ageRange"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder="e.g., 10-11"
                    data-testid="input-age"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="numberOfSlides">Number of Slides</Label>
                <Input
                  id="numberOfSlides"
                  type="number"
                  min="5"
                  max="30"
                  value={numberOfSlides}
                  onChange={(e) => setNumberOfSlides(parseInt(e.target.value) || 10)}
                  data-testid="input-slide-count"
                />
                <p className="text-xs text-muted-foreground mt-1">Between 5 and 30 slides</p>
              </div>
              <div>
                <Label htmlFor="colorScheme">Color Theme</Label>
                <Select value={colorScheme} onValueChange={setColorScheme}>
                  <SelectTrigger id="colorScheme" data-testid="select-color-scheme">
                    <SelectValue placeholder="Select color theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Professional Blue</SelectItem>
                    <SelectItem value="green">Fresh Green</SelectItem>
                    <SelectItem value="purple">Creative Purple</SelectItem>
                    <SelectItem value="orange">Energetic Orange</SelectItem>
                    <SelectItem value="teal">Modern Teal</SelectItem>
                    <SelectItem value="red">Bold Red</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Visual theme for your presentation</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Learning Outcomes *
                <Button
                  onClick={addLearningOutcome}
                  size="sm"
                  variant="outline"
                  data-testid="button-add-outcome"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {learningOutcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={outcome}
                    onChange={(e) => updateLearningOutcome(index, e.target.value)}
                    placeholder={`Learning outcome ${index + 1}`}
                    data-testid={`input-outcome-${index}`}
                  />
                  {learningOutcomes.length > 1 && (
                    <Button
                      onClick={() => removeLearningOutcome(index)}
                      size="icon"
                      variant="ghost"
                      data-testid={`button-remove-outcome-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={handleGenerate}
                className="w-full"
                disabled={
                  generateMutation.isPending ||
                  !topic ||
                  !gradeLevel ||
                  !ageRange ||
                  learningOutcomes.filter(o => o.trim()).length === 0
                }
                data-testid="button-generate"
                aria-label={`Generate slides button. Status: ${
                  generateMutation.isPending ? 'Loading' :
                  !topic ? 'Topic required' :
                  !gradeLevel ? 'Grade level required' :
                  !ageRange ? 'Age range required' :
                  learningOutcomes.filter(o => o.trim()).length === 0 ? 'Learning outcomes required' :
                  'Ready'
                }`}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Slides with AI
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Generated Slides
                  {slides.length > 0 && ` (${slides.length} slides)`}
                </CardTitle>
                {slides.length > 0 && !isLoadingProviders && (
                  <div className="flex gap-2">
                    {presentationUrl ? (
                      <Button
                        onClick={() => window.open(presentationUrl, '_blank')}
                        size="sm"
                        variant="outline"
                        data-testid="button-open-slides"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open in Google Slides
                      </Button>
                    ) : user?.googleAccessToken ? (
                      <Button
                        onClick={() => createPresentationMutation.mutate()}
                        size="sm"
                        disabled={createPresentationMutation.isPending}
                        data-testid="button-create-slides"
                      >
                        {createPresentationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-1" />
                        )}
                        Create in Google Slides
                      </Button>
                    ) : authProviders?.google === true ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        data-testid="button-connect-google"
                      >
                        <a href="/api/auth/google">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Connect Google Account
                        </a>
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isLoadingProviders && authProviders?.google === false && (
                <Alert className="mb-4" variant="destructive" data-testid="alert-google-not-configured">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Google Slides integration is not configured. To use this feature, the administrator needs to set up Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).
                  </AlertDescription>
                </Alert>
              )}
              {!isLoadingProviders && slides.length > 0 && !presentationUrl && !user?.googleAccessToken && authProviders?.google === true && (
                <Alert className="mb-4" data-testid="alert-google-required">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    To create actual Google Slides presentations, you need to connect your Google account. 
                    This allows the app to create presentations in your Google Drive with real images.
                    Click "Connect Google Account" above to get started.
                  </AlertDescription>
                </Alert>
              )}
              {slides.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No slides yet. Fill in the details and click "Generate Slides with AI"</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {slides.map((slide, index) => (
                    <Card key={slide.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-1">
                              Slide {index + 1} • {slide.type}
                            </div>
                            {slide.title && (
                              <h4 className="font-medium text-sm">{slide.title}</h4>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2 text-sm">
                        {slide.content && (
                          <p className="text-muted-foreground">{slide.content}</p>
                        )}
                        {slide.bulletPoints && slide.bulletPoints.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {slide.bulletPoints.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        )}
                        {slide.questions && slide.questions.length > 0 && (
                          <div className="space-y-1">
                            {slide.questions.map((question, i) => (
                              <p key={i} className="text-muted-foreground">
                                {i + 1}. {question}
                              </p>
                            ))}
                          </div>
                        )}
                        {slide.imageUrl && (
                          <div className="bg-muted rounded p-2 text-xs">
                            <div className="font-medium mb-1">Suggested Image:</div>
                            <div className="text-muted-foreground">{slide.imageUrl}</div>
                            {slide.imageAlt && (
                              <div className="mt-1">
                                <span className="font-medium">Alt text:</span> {slide.imageAlt}
                              </div>
                            )}
                          </div>
                        )}
                        {slide.notes && (
                          <div className="bg-muted rounded p-2 text-xs">
                            <div className="font-medium mb-1">Speaker Notes:</div>
                            <div className="text-muted-foreground">{slide.notes}</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
