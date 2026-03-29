import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutGrid, Presentation, ExternalLink } from "lucide-react";
import type { PresentationData, SlideContent } from "@shared/schema";
import ShareToClassroomDialog from "@/components/ShareToClassroomDialog";
import { useProgressTracker } from "@/hooks/use-progress-tracker";

interface PresentationPlayerProps {
  data: PresentationData;
  contentId?: string;
}

const colorSchemes = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950", accent: "bg-blue-600", text: "text-blue-900 dark:text-blue-100", border: "border-blue-200 dark:border-blue-800", muted: "text-blue-600/70 dark:text-blue-400/70" },
  green: { bg: "bg-green-50 dark:bg-green-950", accent: "bg-green-600", text: "text-green-900 dark:text-green-100", border: "border-green-200 dark:border-green-800", muted: "text-green-600/70 dark:text-green-400/70" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950", accent: "bg-purple-600", text: "text-purple-900 dark:text-purple-100", border: "border-purple-200 dark:border-purple-800", muted: "text-purple-600/70 dark:text-purple-400/70" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950", accent: "bg-orange-600", text: "text-orange-900 dark:text-orange-100", border: "border-orange-200 dark:border-orange-800", muted: "text-orange-600/70 dark:text-orange-400/70" },
  teal: { bg: "bg-teal-50 dark:bg-teal-950", accent: "bg-teal-600", text: "text-teal-900 dark:text-teal-100", border: "border-teal-200 dark:border-teal-800", muted: "text-teal-600/70 dark:text-teal-400/70" },
  red: { bg: "bg-red-50 dark:bg-red-950", accent: "bg-red-600", text: "text-red-900 dark:text-red-100", border: "border-red-200 dark:border-red-800", muted: "text-red-600/70 dark:text-red-400/70" },
};

export default function PresentationPlayer({ data, contentId }: PresentationPlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"presentation" | "grid">("presentation");
  const viewedSlidesRef = useRef<Set<number>>(new Set([0]));
  const { updateProgress, isAuthenticated } = useProgressTracker(contentId || "");

  // Track slide views for progress
  useEffect(() => {
    if (!contentId || !isAuthenticated || !data.slides?.length) return;
    viewedSlidesRef.current.add(currentSlideIndex);
    const pct = Math.round((viewedSlidesRef.current.size / data.slides.length) * 100);
    updateProgress(pct);
  }, [currentSlideIndex, contentId, isAuthenticated]);

  if (!data || !data.slides || !Array.isArray(data.slides) || data.slides.length === 0) {
    return (
      <Card className="min-h-[400px]">
        <CardContent className="p-8 lg:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <Presentation className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Slides Available</h2>
            <p className="text-muted-foreground">This presentation doesn't have any slides yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSlide = data.slides[currentSlideIndex];
  const theme = colorSchemes[data.colorScheme as keyof typeof colorSchemes] || colorSchemes.blue;

  if (currentSlideIndex >= data.slides.length) {
    setCurrentSlideIndex(0);
  }

  const goToNextSlide = () => {
    if (currentSlideIndex < data.slides.length - 1) setCurrentSlideIndex(currentSlideIndex + 1);
  };

  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
  };

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
    setViewMode("presentation");
  };

  const renderImage = (slide: SlideContent) => {
    const isUrl = slide.imageUrl && (slide.imageUrl.startsWith('http') || slide.imageUrl.startsWith('data:'));
    if (!slide.imageUrl) return null;

    if (isUrl) {
      return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden">
          <img src={slide.imageUrl} alt={slide.imageAlt || slide.title || "Slide image"} className="w-full h-full object-cover" />
        </div>
      );
    }

    return (
      <div className={`${theme.bg} ${theme.border} border-2 rounded-lg p-6 text-center`}>
        <div className="text-sm text-muted-foreground mb-2">Image suggestion:</div>
        <p className="font-medium">{slide.imageUrl}</p>
        {slide.imageAlt && <p className="text-sm text-muted-foreground mt-2 italic">{slide.imageAlt}</p>}
      </div>
    );
  };

  const renderSlideContent = (slide: SlideContent | undefined) => {
    if (!slide) {
      return <div className="text-center text-muted-foreground"><p>Slide content is not available.</p></div>;
    }

    switch (slide.type) {
      case 'title':
        return (
          <div className="text-center space-y-6 py-8">
            {renderImage(slide)}
            {slide.title && <h2 className={`text-4xl lg:text-5xl font-bold ${theme.text}`}>{slide.title}</h2>}
            {(slide.subtitle || slide.content) && (
              <p className="text-xl text-muted-foreground">{slide.subtitle || slide.content}</p>
            )}
            {/* Metadata line */}
            {(slide.teacherName || slide.institution || slide.gradeLevel || slide.date) && (
              <p className="text-sm text-muted-foreground mt-4">
                {[slide.teacherName, slide.institution, slide.subject, slide.gradeLevel, slide.date].filter(Boolean).join('  •  ')}
              </p>
            )}
          </div>
        );

      case 'closing':
        return (
          <div className="text-center space-y-6 py-12">
            {slide.title && <h2 className={`text-4xl lg:text-5xl font-bold ${theme.text}`}>{slide.title}</h2>}
            <div className={`w-24 h-1 ${theme.accent} mx-auto rounded`} />
            {(slide.subtitle || slide.content) && (
              <p className="text-xl text-muted-foreground">{slide.subtitle || slide.content}</p>
            )}
          </div>
        );

      case 'learning-outcomes':
        return (
          <div className="space-y-6">
            {slide.title && <h2 className={`text-3xl font-bold ${theme.text}`}>{slide.title}</h2>}
            <div className={`h-1 w-24 ${theme.accent} rounded`} />
            {slide.bulletPoints && slide.bulletPoints.length > 0 && (
              <ol className="space-y-4 text-lg">
                {slide.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`${theme.accent} text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold`}>{i + 1}</span>
                    <span className="flex-1">{point}</span>
                  </li>
                ))}
              </ol>
            )}
            {renderImage(slide)}
          </div>
        );

      case 'vocabulary':
        return (
          <div className="space-y-6">
            {slide.title && <h2 className={`text-3xl font-bold ${theme.text}`}>{slide.title}</h2>}
            {slide.terms && slide.terms.length > 0 ? (
              <div className="space-y-4">
                {slide.terms.map((t: any, i: number) => (
                  <div key={i} className={`${theme.bg} ${theme.border} border-2 rounded-lg p-4`}>
                    <span className={`font-bold ${theme.text}`}>{t.term}</span>
                    <span className="text-muted-foreground"> — {t.definition}</span>
                  </div>
                ))}
              </div>
            ) : slide.bulletPoints && slide.bulletPoints.length > 0 ? (
              <ul className="space-y-3 text-lg">
                {slide.bulletPoints.map((point, i) => (
                  <li key={i} className={`${theme.bg} ${theme.border} border rounded-lg p-4`}>{point}</li>
                ))}
              </ul>
            ) : slide.content ? (
              <p className="text-lg leading-relaxed">{slide.content}</p>
            ) : null}
          </div>
        );

      case 'comparison':
        return (
          <div className="space-y-6">
            {slide.title && <h2 className={`text-3xl font-bold ${theme.text}`}>{slide.title}</h2>}
            <div className={`h-0.5 w-full ${theme.bg} rounded`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {slide.leftHeading && <h3 className={`text-xl font-bold ${theme.text} mb-3`}>{slide.leftHeading}</h3>}
                {slide.leftPoints && (
                  <ul className="space-y-2">
                    {slide.leftPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2"><span className={theme.muted}>•</span><span>{p}</span></li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="md:border-l md:pl-6 border-border">
                {slide.rightHeading && <h3 className={`text-xl font-bold ${theme.text} mb-3`}>{slide.rightHeading}</h3>}
                {slide.rightPoints && (
                  <ul className="space-y-2">
                    {slide.rightPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2"><span className={theme.muted}>•</span><span>{p}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className={`${theme.bg} rounded-xl p-6 space-y-4`}>
            {slide.title && <h2 className={`text-3xl font-bold ${theme.text}`}>{slide.title}</h2>}
            {slide.content && <p className="text-lg leading-relaxed">{slide.content}</p>}
            {slide.bulletPoints && slide.bulletPoints.length > 0 && (
              <ul className="space-y-3 text-lg">
                {slide.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-xl">▸</span>
                    <span className="flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-6">
            {slide.title && <h2 className={`text-3xl font-bold ${theme.text}`}>{slide.title}</h2>}
            <div className={`h-1 w-16 ${theme.accent} rounded`} />
            {slide.bulletPoints && slide.bulletPoints.length > 0 && (
              <ul className="space-y-3 text-lg">
                {slide.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`${theme.accent} text-white rounded w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1 text-xs`}>✓</span>
                    <span className="flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            )}
            {slide.content && <p className="text-lg leading-relaxed">{slide.content}</p>}
          </div>
        );

      case 'guiding-questions':
      case 'reflection':
        return (
          <div className="space-y-6">
            {slide.title && <h2 className={`text-3xl font-bold ${theme.text}`}>{slide.title}</h2>}
            {slide.questions && slide.questions.length > 0 && (
              <div className="space-y-4">
                {slide.questions.map((question, i) => (
                  <div key={i} className={`${theme.bg} ${theme.border} border-2 rounded-lg p-5`}>
                    <p className="text-lg"><span className={`font-semibold ${theme.text}`}>{i + 1}.</span> {question}</p>
                  </div>
                ))}
              </div>
            )}
            {slide.bulletPoints && !slide.questions && slide.bulletPoints.length > 0 && (
              <ul className="space-y-3 text-lg">
                {slide.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`font-semibold ${theme.text}`}>{i + 1}.</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
            {renderImage(slide)}
          </div>
        );

      // Default: content / image / any unknown type
      default:
        return (
          <div className="space-y-6">
            {renderImage(slide)}
            {slide.title && <h2 className={`text-3xl font-bold ${theme.text}`}>{slide.title}</h2>}
            {slide.subtitle && <p className="text-xl text-muted-foreground">{slide.subtitle}</p>}
            {slide.content && <p className="text-xl leading-relaxed">{slide.content}</p>}
            {slide.bulletPoints && slide.bulletPoints.length > 0 && (
              <ul className="space-y-3 text-lg">
                {slide.bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`${theme.accent} text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 mt-1 text-sm font-bold`}>{i + 1}</span>
                    <span className="flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            )}
            {slide.questions && slide.questions.length > 0 && (
              <div className="space-y-4">
                {slide.questions.map((question, i) => (
                  <div key={i} className={`${theme.bg} ${theme.border} border-2 rounded-lg p-5`}>
                    <p className="text-lg"><span className={`font-semibold ${theme.text}`}>{i + 1}.</span> {question}</p>
                  </div>
                ))}
              </div>
            )}
            {slide.terms && (slide.terms as any[]).length > 0 && (
              <div className="space-y-3">
                {(slide.terms as any[]).map((t: any, i: number) => (
                  <div key={i} className={`${theme.bg} rounded-lg p-4`}>
                    <span className={`font-bold ${theme.text}`}>{t.term}</span> — {t.definition}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  // Grid thumbnails
  const renderThumbnail = (slide: SlideContent) => {
    const label = slide.type?.replace(/-/g, ' ') || 'slide';
    return (
      <>
        <div className="text-xs text-muted-foreground mb-2 capitalize">
          {slide.emoji && `${slide.emoji} `}{label}
        </div>
        {slide.title && <h4 className="font-medium text-sm line-clamp-2 mb-1">{slide.title}</h4>}
        {slide.content && <p className="text-xs text-muted-foreground line-clamp-2">{slide.content}</p>}
        {slide.bulletPoints && slide.bulletPoints.length > 0 && (
          <p className="text-xs text-muted-foreground">{slide.bulletPoints.length} points</p>
        )}
        {slide.questions && slide.questions.length > 0 && (
          <p className="text-xs text-muted-foreground">{slide.questions.length} questions</p>
        )}
        {slide.terms && (slide.terms as any[]).length > 0 && (
          <p className="text-xs text-muted-foreground">{(slide.terms as any[]).length} terms</p>
        )}
      </>
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
                <ShareToClassroomDialog contentTitle={data.topic} contentDescription={`Presentation about ${data.topic}`} materialLink={data.presentationUrl} />
                <Button onClick={() => window.open(data.presentationUrl, '_blank')} variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />Open in Google Slides
                </Button>
              </>
            )}
            <Button onClick={() => setViewMode("presentation")} variant="outline" size="sm">
              <Presentation className="h-4 w-4 mr-2" />Presentation Mode
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.slides.map((slide, index) => (
            <Card key={slide.id || index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => goToSlide(index)}>
              <CardContent className="p-4">{renderThumbnail(slide)}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Slide {currentSlideIndex + 1} of {data.slides.length}</div>
        <div className="flex gap-2">
          {data.presentationUrl && (
            <>
              <ShareToClassroomDialog contentTitle={data.topic} contentDescription={`Presentation about ${data.topic}`} materialLink={data.presentationUrl} />
              <Button onClick={() => window.open(data.presentationUrl, '_blank')} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />Open in Google Slides
              </Button>
            </>
          )}
          <Button onClick={() => setViewMode("grid")} variant="outline" size="sm">
            <LayoutGrid className="h-4 w-4 mr-2" />View All
          </Button>
        </div>
      </div>

      <Card className="min-h-[400px]">
        <CardContent className="p-8 lg:p-12">
          <div className="max-w-3xl mx-auto">{renderSlideContent(currentSlide)}</div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button onClick={goToPreviousSlide} disabled={currentSlideIndex === 0} variant="outline">
          <ChevronLeft className="h-4 w-4 mr-2" />Previous
        </Button>
        <div className="flex gap-1">
          {data.slides.map((_, index) => (
            <button key={index} onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${index === currentSlideIndex ? 'w-8 bg-primary' : 'w-2 bg-muted hover:bg-muted-foreground/30'}`}
            />
          ))}
        </div>
        <Button onClick={goToNextSlide} disabled={currentSlideIndex === data.slides.length - 1} variant="outline">
          Next<ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {currentSlide?.notes && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-2">Speaker Notes:</div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{currentSlide.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Use arrow keys to navigate • Click "View All" to see all slides
      </div>
    </div>
  );
}
