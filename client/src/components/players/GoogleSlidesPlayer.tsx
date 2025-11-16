import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutGrid, Presentation, ExternalLink } from "lucide-react";
import type { GoogleSlidesData, SlideContent } from "@shared/schema";

interface GoogleSlidesPlayerProps {
  data: GoogleSlidesData;
}

export default function GoogleSlidesPlayer({ data }: GoogleSlidesPlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"presentation" | "grid">("presentation");
  
  const currentSlide = data.slides[currentSlideIndex];
  
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
    return (
      <div className="space-y-4">
        {slide.title && (
          <h2 className="text-3xl font-bold">{slide.title}</h2>
        )}
        
        {slide.content && (
          <p className="text-lg leading-relaxed">{slide.content}</p>
        )}
        
        {slide.bulletPoints && slide.bulletPoints.length > 0 && (
          <ul className="space-y-2 text-lg">
            {slide.bulletPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
        
        {slide.questions && slide.questions.length > 0 && (
          <div className="space-y-3">
            {slide.questions.map((question, i) => (
              <div key={i} className="bg-muted rounded-lg p-4">
                <p className="text-lg">
                  <span className="font-semibold text-primary">{i + 1}.</span> {question}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {slide.imageUrl && (
          <div className="bg-muted rounded-lg p-6 text-center">
            <div className="text-sm text-muted-foreground mb-2">Suggested Image:</div>
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
              <Button
                onClick={() => window.open(data.presentationUrl, '_blank')}
                variant="outline"
                size="sm"
                data-testid="button-open-slides"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Slides
              </Button>
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
            <Button
              onClick={() => window.open(data.presentationUrl, '_blank')}
              variant="outline"
              size="sm"
              data-testid="button-open-slides"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Slides
            </Button>
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
