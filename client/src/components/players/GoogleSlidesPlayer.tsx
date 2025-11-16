import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutGrid, Presentation, ExternalLink } from "lucide-react";
import type { GoogleSlidesData, SlideContent } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";

interface GoogleSlidesPlayerProps {
  data: GoogleSlidesData;
}

// Color scheme definitions
const colorSchemes = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950",
    accent: "bg-blue-600",
    text: "text-blue-900 dark:text-blue-100",
    border: "border-blue-200 dark:border-blue-800"
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950",
    accent: "bg-green-600",
    text: "text-green-900 dark:text-green-100",
    border: "border-green-200 dark:border-green-800"
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950",
    accent: "bg-purple-600",
    text: "text-purple-900 dark:text-purple-100",
    border: "border-purple-200 dark:border-purple-800"
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950",
    accent: "bg-orange-600",
    text: "text-orange-900 dark:text-orange-100",
    border: "border-orange-200 dark:border-orange-800"
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950",
    accent: "bg-teal-600",
    text: "text-teal-900 dark:text-teal-100",
    border: "border-teal-200 dark:border-teal-800"
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950",
    accent: "bg-red-600",
    text: "text-red-900 dark:text-red-100",
    border: "border-red-200 dark:border-red-800"
  },
};

export default function GoogleSlidesPlayer({ data }: GoogleSlidesPlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"presentation" | "grid">("presentation");
  
  const currentSlide = data.slides[currentSlideIndex];
  const theme = colorSchemes[data.colorScheme as keyof typeof colorSchemes] || colorSchemes.blue;
  
  const goToNextSlide = () => {
    if (currentSlideIndex < data.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };
  
  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };
  
  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
    setViewMode("presentation");
  };

  const renderSlideContent = (slide: SlideContent) => {
    const isImageUrl = slide.imageUrl && slide.imageUrl.startsWith('http');
    
    return (
      <div className="space-y-6">
        {slide.imageUrl && isImageUrl && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
            <img
              src={slide.imageUrl}
              alt={slide.imageAlt || slide.title || "Slide image"}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {slide.title && (
          <h2 className={`text-4xl font-bold ${theme.text}`}>{slide.title}</h2>
        )}
        
        {slide.content && (
          <p className="text-xl leading-relaxed">{slide.content}</p>
        )}
        
        {slide.bulletPoints && slide.bulletPoints.length > 0 && (
          <ul className="space-y-3 text-lg">
            {slide.bulletPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`${theme.accent} text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 mt-1 text-sm font-bold`}>
                  {i + 1}
                </span>
                <span className="flex-1">{point}</span>
              </li>
            ))}
          </ul>
        )}
        
        {slide.questions && slide.questions.length > 0 && (
          <div className="space-y-4">
            {slide.questions.map((question, i) => (
              <div key={i} className={`${theme.bg} ${theme.border} border-2 rounded-lg p-5`}>
                <p className="text-lg">
                  <span className={`font-semibold ${theme.text}`}>{i + 1}.</span> {question}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {slide.imageUrl && !isImageUrl && (
          <div className={`${theme.bg} ${theme.border} border-2 rounded-lg p-6 text-center`}>
            <div className="text-sm text-muted-foreground mb-2">Image suggestion:</div>
            <p className="font-medium">{slide.imageUrl}</p>
            {slide.imageAlt && (
              <p className="text-sm text-muted-foreground mt-2 italic">{slide.imageAlt}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (viewMode === "grid") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">All Slides ({data.slides.length})</h3>
          <div className="flex gap-2">
            {data.presentationUrl && (
              <>
                <ShareToClassroomDialog
                  contentTitle={data.topic}
                  contentDescription={`Interactive presentation about ${data.topic}`}
                  materialLink={data.presentationUrl}
                />
                <Button
                  onClick={() => window.open(data.presentationUrl, '_blank')}
                  variant="outline"
                  size="sm"
                  data-testid="button-open-slides"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Slides
                </Button>
              </>
            )}
            <Button
              onClick={() => setViewMode("presentation")}
              variant="outline"
              size="sm"
              data-testid="button-presentation-mode"
            >
              <Presentation className="h-4 w-4 mr-2" />
              Presentation Mode
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.slides.map((slide, index) => (
            <Card
              key={slide.id}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => goToSlide(index)}
              data-testid={`slide-thumbnail-${index}`}
            >
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-2">
                  Slide {index + 1} • {slide.type}
                </div>
                {slide.title && (
                  <h4 className="font-medium text-sm line-clamp-2 mb-2">{slide.title}</h4>
                )}
                {slide.content && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{slide.content}</p>
                )}
                {slide.bulletPoints && slide.bulletPoints.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {slide.bulletPoints.length} bullet points
                  </div>
                )}
                {slide.questions && slide.questions.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {slide.questions.length} questions
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Slide {currentSlideIndex + 1} of {data.slides.length}
        </div>
        <div className="flex gap-2">
          {data.presentationUrl && (
            <>
              <ShareToClassroomDialog
                contentTitle={data.topic}
                contentDescription={`Interactive presentation about ${data.topic}`}
                materialLink={data.presentationUrl}
              />
              <Button
                onClick={() => window.open(data.presentationUrl, '_blank')}
                variant="outline"
                size="sm"
                data-testid="button-open-slides"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Slides
              </Button>
            </>
          )}
          <Button
            onClick={() => setViewMode("grid")}
            variant="outline"
            size="sm"
            data-testid="button-grid-mode"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </div>

      <Card className="min-h-[400px]">
        <CardContent className="p-8 lg:p-12">
          <div className="max-w-3xl mx-auto" data-testid={`slide-content-${currentSlideIndex}`}>
            {renderSlideContent(currentSlide)}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          onClick={goToPreviousSlide}
          disabled={currentSlideIndex === 0}
          variant="outline"
          data-testid="button-previous"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-1">
          {data.slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlideIndex 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-muted hover:bg-muted-foreground/30'
              }`}
              data-testid={`slide-indicator-${index}`}
            />
          ))}
        </div>
        
        <Button
          onClick={goToNextSlide}
          disabled={currentSlideIndex === data.slides.length - 1}
          variant="outline"
          data-testid="button-next"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {currentSlide.notes && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-2">Speaker Notes:</div>
            <p className="text-sm text-muted-foreground">{currentSlide.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Use arrow keys to navigate • Click "View All" to see all slides
      </div>
    </div>
  );
}
