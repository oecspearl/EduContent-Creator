import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, Check, X } from "lucide-react";
import { youtubeLoader } from "@/lib/youtube-loader";
import type { InteractiveVideoData, VideoHotspot, QuizQuestion } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";

type VideoPlayerProps = {
  data: InteractiveVideoData;
  contentId: string;
};

export function VideoPlayer({ data, contentId }: VideoPlayerProps) {
  const [currentHotspot, setCurrentHotspot] = useState<VideoHotspot | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | number>>({});
  const [fillBlankInputValues, setFillBlankInputValues] = useState<Record<string, string>>({});
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizShowFeedback, setQuizShowFeedback] = useState(false);
  const [completedHotspots, setCompletedHotspots] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const { progress: savedProgress, isProgressFetched, updateProgress, logInteraction, isAuthenticated } = useProgressTracker(contentId);
  const [highestProgress, setHighestProgress] = useState<number>(0);
  const [isProgressInitialized, setIsProgressInitialized] = useState(false);
  const pendingMilestoneRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousAuthRef = useRef<boolean>(isAuthenticated);

  // Reset initialization when auth changes from false → true
  useEffect(() => {
    if (!previousAuthRef.current && isAuthenticated) {
      // User just logged in - reset to wait for progress fetch
      setIsProgressInitialized(false);
      setHighestProgress(0);
      pendingMilestoneRef.current = null;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    }
    previousAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Initialize from persisted progress and reconcile when savedProgress updates
  useEffect(() => {
    if (!isProgressInitialized) {
      if (!isAuthenticated) {
        setIsProgressInitialized(true);
      } else if (isProgressFetched) {
        if (savedProgress) {
          setHighestProgress(savedProgress.completionPercentage);
        }
        setIsProgressInitialized(true);
      }
    } else if (savedProgress) {
      // After initialization, reconcile: server can only raise, never lower
      // Only update if savedProgress is truthy (skip null refetches)
      setHighestProgress(prev => Math.max(prev, savedProgress.completionPercentage));
      // Clear pending milestone if it's been saved
      if (pendingMilestoneRef.current !== null && savedProgress.completionPercentage >= pendingMilestoneRef.current) {
        pendingMilestoneRef.current = null;
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
      }
    }
  }, [savedProgress, isProgressFetched, isAuthenticated, isProgressInitialized]);

  // Track video progress (monotonic - only increase, never decrease, wait for init)
  useEffect(() => {
    if (!isProgressInitialized || !isAuthenticated) return;
    
    if (duration > 0 && currentTime > 0) {
      const watchPercentage = Math.round((currentTime / duration) * 100);
      const milestone = Math.floor(watchPercentage / 10) * 10;
      
      // Only update if this milestone is higher than local high water mark and not already pending
      if (milestone > highestProgress && milestone > 0 && milestone !== pendingMilestoneRef.current) {
        pendingMilestoneRef.current = milestone;
        updateProgress(milestone);
        // Clear pending after 5 seconds to allow retry on failure
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
        }
        pendingTimeoutRef.current = setTimeout(() => {
          pendingMilestoneRef.current = null;
          pendingTimeoutRef.current = null;
        }, 5000);
      }
    }
  }, [currentTime, duration, highestProgress, isProgressInitialized, isAuthenticated]);

  // Track hotspot completion (monotonic - only send if higher, wait for init)
  useEffect(() => {
    if (!isProgressInitialized || !isAuthenticated) return;
    
    if (data.hotspots.length > 0) {
      const completionPercentage = Math.round((completedHotspots.size / data.hotspots.length) * 100);
      
      // Only update if hotspot completion exceeds local high water mark and not already pending
      if (completionPercentage > highestProgress && completionPercentage > 0 && completionPercentage !== pendingMilestoneRef.current) {
        pendingMilestoneRef.current = completionPercentage;
        updateProgress(completionPercentage);
        // Clear pending after 5 seconds to allow retry on failure
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
        }
        pendingTimeoutRef.current = setTimeout(() => {
          pendingMilestoneRef.current = null;
          pendingTimeoutRef.current = null;
        }, 5000);
      }
    }
  }, [completedHotspots.size, highestProgress, isProgressInitialized, isAuthenticated]);

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(data.videoUrl);

  useEffect(() => {
    if (!videoId) return;

    const initializePlayer = () => {
      if (!playerContainerRef.current) return;

      // Destroy existing player if any
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            setDuration(event.target.getDuration());
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startTimeTracking();
            } else {
              setIsPlaying(false);
              stopTimeTracking();
            }
          },
        },
      });
    };

    // Use shared YouTube loader
    youtubeLoader.load(initializePlayer);

    return () => {
      stopTimeTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const startTimeTracking = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        checkForHotspots(time);
      }
    }, 100);
  };

  const stopTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkForHotspots = (time: number) => {
    // Don't check if there's already a hotspot showing
    if (currentHotspot) return;
    
    // Find a hotspot that matches the current time and hasn't been completed
    const hotspot = data.hotspots.find(
      (h) => Math.abs(h.timestamp - time) < 0.5 && !completedHotspots.has(h.id)
    );

    if (hotspot) {
      setCurrentHotspot(hotspot);
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  };

  const handleSeek = (percentage: number) => {
    if (!playerRef.current || !duration) return;
    const time = (percentage / 100) * duration;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
  };

  const handleFullscreen = () => {
    if (!playerRef.current) return;
    const iframe = playerRef.current.getIframe();
    if (iframe && iframe.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const jumpToHotspot = (hotspot: VideoHotspot) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(hotspot.timestamp, true);
    setCurrentTime(hotspot.timestamp);
    playerRef.current.playVideo();
  };

  const handleAnswerSubmit = () => {
    if (!currentHotspot) return;
    if (currentHotspot.type === "question") {
      setShowFeedback(true);
    } else if (currentHotspot.type === "quiz") {
      setQuizShowFeedback(true);
    }
  };

  const handleQuizAnswer = (questionId: string, answer: string | number) => {
    if (quizShowFeedback) return; // Don't allow changing answers after feedback
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleQuizNext = () => {
    if (!currentHotspot || currentHotspot.type !== "quiz" || !currentHotspot.questions) return;
    
    if (currentQuizIndex < currentHotspot.questions.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      // Don't reset feedback - keep it shown if quiz was already submitted
    } else {
      // Quiz complete, show results for all questions
      setQuizShowFeedback(true);
    }
  };

  const handleQuizPrevious = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(currentQuizIndex - 1);
      // Don't reset feedback - keep it shown if quiz was already submitted
    }
  };

  const handleContinue = () => {
    if (!currentHotspot) return;
    
    // Capture hotspot data before clearing state
    const hotspotId = currentHotspot.id;
    const hotspotTimestamp = currentHotspot.timestamp;
    const hotspotType = currentHotspot.type;
    
    // Log hotspot interaction
    if (hotspotType === "question") {
      logInteraction("hotspot_completed", {
        hotspotId: hotspotId,
        hotspotType: hotspotType,
        timestamp: hotspotTimestamp,
        selectedAnswer,
        isCorrect: currentHotspot.correctAnswer === selectedAnswer,
      });
    } else if (hotspotType === "quiz" && currentHotspot.questions) {
      // Calculate quiz score
      const totalQuestions = currentHotspot.questions.length;
      const correctAnswers = currentHotspot.questions.filter((q, idx) => {
        const userAnswer = quizAnswers[q.id];
        if (q.type === "multiple-choice") {
          return userAnswer === q.correctAnswer;
        } else if (q.type === "true-false") {
          return userAnswer === q.correctAnswer;
        } else if (q.type === "fill-blank") {
          return String(userAnswer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
        }
        return false;
      }).length;
      
      logInteraction("hotspot_completed", {
        hotspotId: hotspotId,
        hotspotType: hotspotType,
        timestamp: hotspotTimestamp,
        quizScore: correctAnswers,
        quizTotal: totalQuestions,
        answers: quizAnswers,
      });
    } else {
      logInteraction("hotspot_completed", {
        hotspotId: hotspotId,
        hotspotType: hotspotType,
        timestamp: hotspotTimestamp,
      });
    }
    
    // Mark hotspot as completed BEFORE clearing currentHotspot
    setCompletedHotspots(prev => {
      const newSet = new Set(prev);
      newSet.add(hotspotId);
      return newSet;
    });
    
    // Clear current hotspot and reset state
    setCurrentHotspot(null);
    setSelectedAnswer(null);
    setQuizAnswers({});
    setCurrentQuizIndex(0);
    setQuizShowFeedback(false);
    setShowFeedback(false);
    
    // Small delay before resuming to ensure state updates are processed
    // This prevents the hotspot from being re-triggered immediately
    setTimeout(() => {
      if (playerRef.current) {
        // Seek slightly past the hotspot timestamp to avoid re-triggering
        const seekTime = hotspotTimestamp + 1;
        playerRef.current.seekTo(seekTime, true);
        playerRef.current.playVideo();
      }
    }, 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Video Container with Overlay */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <div ref={playerContainerRef} className="w-full h-full" data-testid="video-iframe" />

        {/* Hotspot Overlay */}
        {currentHotspot && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-10">
            <Card className="w-full max-w-2xl">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentHotspot.type === "question" || currentHotspot.type === "quiz" ? "default" : "outline"}>
                      {currentHotspot.type === "quiz" ? "Quiz" : currentHotspot.type}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatTime(currentHotspot.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold">{currentHotspot.title}</h3>
                  {currentHotspot.content && <p className="text-muted-foreground">{currentHotspot.content}</p>}

                  {currentHotspot.type === "quiz" && currentHotspot.questions && currentHotspot.questions.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Question {currentQuizIndex + 1} of {currentHotspot.questions.length}</span>
                        {quizShowFeedback && (
                          <span className="font-medium">
                            Score: {currentHotspot.questions.filter((q) => {
                              const userAnswer = quizAnswers[q.id];
                              if (q.type === "multiple-choice") {
                                return userAnswer === q.correctAnswer;
                              } else if (q.type === "true-false") {
                                return userAnswer === q.correctAnswer;
                              } else if (q.type === "fill-blank") {
                                return String(userAnswer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
                              }
                              return false;
                            }).length} / {currentHotspot.questions.length}
                          </span>
                        )}
                      </div>
                      {quizShowFeedback && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            ✓ Quiz submitted! You can navigate between questions to review feedback on all answers.
                          </p>
                        </div>
                      )}
                      
                      {(() => {
                        const question = currentHotspot.questions[currentQuizIndex];
                        const userAnswer = quizAnswers[question.id];
                        const isCorrect = question.type === "multiple-choice" 
                          ? userAnswer === question.correctAnswer
                          : question.type === "true-false"
                          ? userAnswer === question.correctAnswer
                          : String(userAnswer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
                        
                        return (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">{question.question}</h4>
                            </div>

                            {question.type === "multiple-choice" && question.options && (
                              <div className="space-y-2">
                                {question.options.map((option, optIndex) => {
                                  const isSelected = userAnswer === optIndex;
                                  return (
                                    <button
                                      key={optIndex}
                                      onClick={() => handleQuizAnswer(question.id, optIndex)}
                                      disabled={quizShowFeedback}
                                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                        quizShowFeedback
                                          ? optIndex === question.correctAnswer
                                            ? "border-green-600 bg-green-50 dark:bg-green-950"
                                            : isSelected
                                            ? "border-red-600 bg-red-50 dark:bg-red-950"
                                            : "border-border"
                                          : isSelected
                                          ? "border-primary bg-primary/10"
                                          : "border-border hover:border-primary/50"
                                      }`}
                                      data-testid={`quiz-option-${optIndex}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>{option}</span>
                                        {quizShowFeedback && optIndex === question.correctAnswer && (
                                          <Check className="h-4 w-4 text-green-600" />
                                        )}
                                        {quizShowFeedback && isSelected && !isCorrect && (
                                          <X className="h-4 w-4 text-red-600" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {question.type === "true-false" && (
                              <div className="space-y-2">
                                {["true", "false"].map((value) => {
                                  const isSelected = userAnswer === value;
                                  return (
                                    <button
                                      key={value}
                                      onClick={() => handleQuizAnswer(question.id, value)}
                                      disabled={quizShowFeedback}
                                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                        quizShowFeedback
                                          ? value === String(question.correctAnswer)
                                            ? "border-green-600 bg-green-50 dark:bg-green-950"
                                            : isSelected
                                            ? "border-red-600 bg-red-50 dark:bg-red-950"
                                            : "border-border"
                                          : isSelected
                                          ? "border-primary bg-primary/10"
                                          : "border-border hover:border-primary/50"
                                      }`}
                                      data-testid={`quiz-tf-${value}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="capitalize">{value}</span>
                                        {quizShowFeedback && value === String(question.correctAnswer) && (
                                          <Check className="h-4 w-4 text-green-600" />
                                        )}
                                        {quizShowFeedback && isSelected && !isCorrect && (
                                          <X className="h-4 w-4 text-red-600" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {question.type === "fill-blank" && (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Enter your answer..."
                                  value={quizShowFeedback ? String(userAnswer || "") : (fillBlankInputValues[question.id] || String(userAnswer || ""))}
                                  onChange={(e) => {
                                    // Store the value locally but don't check answer until blur
                                    if (!quizShowFeedback) {
                                      setFillBlankInputValues(prev => ({
                                        ...prev,
                                        [question.id]: e.target.value
                                      }));
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Only save the answer when user finishes typing
                                    if (!quizShowFeedback && e.target.value.trim()) {
                                      handleQuizAnswer(question.id, e.target.value);
                                    }
                                  }}
                                  disabled={quizShowFeedback}
                                  className={quizShowFeedback 
                                    ? isCorrect 
                                      ? "border-green-600 bg-green-50 dark:bg-green-950" 
                                      : "border-red-600 bg-red-50 dark:bg-red-950"
                                    : ""
                                  }
                                  data-testid="quiz-fill-blank"
                                />
                                {quizShowFeedback && (
                                  <p className="text-sm text-muted-foreground">
                                    Correct answer: {String(question.correctAnswer)}
                                  </p>
                                )}
                              </div>
                            )}

                            {quizShowFeedback && question.explanation && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm">{question.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {currentHotspot.type === "question" && currentHotspot.options && currentHotspot.options.length > 0 && (
                    <div className="space-y-3">
                      {currentHotspot.options.map((option, index) => {
                        const isCorrect = currentHotspot.correctAnswer === index;
                        const isSelected = selectedAnswer === index;
                        const showResult = showFeedback;

                        return (
                          <button
                            key={index}
                            onClick={() => !showFeedback && setSelectedAnswer(index)}
                            disabled={showFeedback}
                            aria-label={`Answer option ${index + 1}: ${option}`}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all hover-elevate ${
                              showResult
                                ? isCorrect
                                  ? "border-green-600 bg-green-50 dark:bg-green-950"
                                  : isSelected
                                  ? "border-red-600 bg-red-50 dark:bg-red-950"
                                  : "border-border"
                                : isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border"
                            }`}
                            data-testid={`hotspot-option-${index}`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{option}</span>
                              {showResult && isCorrect && <Check className="h-5 w-5 text-green-600" />}
                              {showResult && isSelected && !isCorrect && <X className="h-5 w-5 text-red-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-2">
                    {currentHotspot.type === "quiz" && currentHotspot.questions && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleQuizPrevious}
                          disabled={currentQuizIndex === 0}
                          data-testid="button-quiz-previous"
                        >
                          Previous
                        </Button>
                        {currentQuizIndex < currentHotspot.questions.length - 1 ? (
                          <Button
                            onClick={handleQuizNext}
                            disabled={!quizAnswers[currentHotspot.questions[currentQuizIndex].id] && !quizShowFeedback}
                            data-testid="button-quiz-next"
                          >
                            Next
                          </Button>
                        ) : null}
                        {quizShowFeedback && currentQuizIndex === currentHotspot.questions.length - 1 && (
                          <Button
                            variant="outline"
                            onClick={() => setCurrentQuizIndex(0)}
                            data-testid="button-review-all"
                          >
                            Review All Questions
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 ml-auto">
                      {currentHotspot.type === "question" && currentHotspot.options && currentHotspot.options.length > 0 && !showFeedback && (
                        <Button
                          onClick={handleAnswerSubmit}
                          disabled={selectedAnswer === null}
                          data-testid="button-submit-answer"
                        >
                          Submit Answer
                        </Button>
                      )}
                      {currentHotspot.type === "quiz" && currentHotspot.questions && (
                        <>
                          {!quizShowFeedback && currentQuizIndex === currentHotspot.questions.length - 1 && (
                            <Button
                              onClick={handleAnswerSubmit}
                              disabled={!quizAnswers[currentHotspot.questions[currentQuizIndex].id]}
                              data-testid="button-submit-quiz"
                            >
                              Submit Quiz
                            </Button>
                          )}
                        </>
                      )}
                      {(currentHotspot.type !== "question" && currentHotspot.type !== "quiz") || 
                       (currentHotspot.type === "question" && showFeedback) ||
                       (currentHotspot.type === "quiz" && quizShowFeedback) ? (
                        <Button onClick={handleContinue} data-testid="button-continue">
                          Continue
                          <SkipForward className="h-4 w-4 ml-2" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          <div className="space-y-2">
            {/* Progress Bar with Hotspot Markers */}
            <div className="relative">
              <div
                role="slider"
                aria-label="Video progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.floor(progressPercentage)}
                tabIndex={0}
                className="h-2 bg-white/20 rounded-full cursor-pointer hover-elevate"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = (x / rect.width) * 100;
                  handleSeek(percentage);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    handleSeek(Math.max(0, progressPercentage - 5));
                  } else if (e.key === "ArrowRight") {
                    handleSeek(Math.min(100, progressPercentage + 5));
                  }
                }}
                data-testid="video-progress-bar"
              >
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
                {/* Hotspot Markers */}
                {data.hotspots.map((hotspot) => {
                  const position = duration > 0 ? (hotspot.timestamp / duration) * 100 : 0;
                  const isCompleted = completedHotspots.has(hotspot.id);
                  return (
                    <button
                      key={hotspot.id}
                      className={`absolute top-0 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-all ${
                        isCompleted ? "bg-green-500" : "bg-yellow-500"
                      } hover:scale-125`}
                      style={{ left: `${position}%`, top: "50%" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToHotspot(hotspot);
                      }}
                      aria-label={`Jump to ${hotspot.title} at ${formatTime(hotspot.timestamp)}`}
                      title={`${hotspot.title} at ${formatTime(hotspot.timestamp)}`}
                      data-testid={`marker-${hotspot.id}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePlayPause}
                  className="text-white hover:bg-white/20"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMute}
                  className="text-white hover:bg-white/20"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                  data-testid="button-mute"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <span className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
                aria-label="Enter fullscreen"
                data-testid="button-fullscreen"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hotspot Progress */}
      {data.hotspots.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Interactive Moments</h3>
              <Badge variant="outline">
                {completedHotspots.size}/{data.hotspots.length} Completed
              </Badge>
            </div>
            <Progress value={(completedHotspots.size / data.hotspots.length) * 100} className="mb-4" />
            <div className="space-y-2">
              {data.hotspots
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((hotspot) => {
                  const isCompleted = completedHotspots.has(hotspot.id);
                  return (
                    <button
                      key={hotspot.id}
                      className={`w-full p-3 rounded-lg border cursor-pointer transition-all hover-elevate text-left ${
                        isCompleted ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-border"
                      }`}
                      onClick={() => jumpToHotspot(hotspot)}
                      aria-label={`Jump to ${hotspot.type} at ${formatTime(hotspot.timestamp)}: ${hotspot.title}`}
                      data-testid={`hotspot-item-${hotspot.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCompleted && <Check className="h-4 w-4 text-green-600" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {formatTime(hotspot.timestamp)}
                              </Badge>
                              <span className="text-sm font-medium">{hotspot.title}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={hotspot.type === "question" ? "default" : "outline"}>
                          {hotspot.type}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.hotspots.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No interactive hotspots added yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
