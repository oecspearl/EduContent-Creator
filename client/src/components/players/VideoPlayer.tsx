import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, Check, X, Trophy, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { youtubeLoader } from "@/lib/youtube-loader";
import { extractVideoId } from "@/lib/youtube-utils";
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

  const { progress: savedProgress, isProgressFetched, updateProgress, saveQuizAttempt, logInteraction, isAuthenticated } = useProgressTracker(contentId);
  const [highestProgress, setHighestProgress] = useState<number>(0);
  const [isProgressInitialized, setIsProgressInitialized] = useState(false);
  const pendingMilestoneRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Accumulate graded answers across hotspots to save as one quiz attempt
  const gradedAnswersRef = useRef<Map<string, { questionId: string; answer: string | number | boolean; isCorrect: boolean }>>(new Map());
  const gradedAttemptSavedRef = useRef(false);

  // End-of-video performance summary
  type SummaryItem = { questionId: string; title: string; answer: string | number | boolean; isCorrect: boolean; hotspotType: string };
  const [showSummary, setShowSummary] = useState(false);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const summaryItemsRef = useRef<SummaryItem[]>([]);

  /** Reset grading + hotspot state so the video can be rewatched for a new attempt. */
  const resetForRewatch = () => {
    gradedAnswersRef.current = new Map();
    gradedAttemptSavedRef.current = false;
    summaryItemsRef.current = [];
    setCompletedHotspots(new Set());
    setShowSummary(false);
    setSummaryItems([]);
    lastCheckedTimeRef.current = -1;
  };
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

      // Save aggregated graded quiz attempt once all graded hotspots are completed
      const gradedHotspots = data.hotspots.filter(h => h.isGraded);
      if (gradedHotspots.length > 0 && !gradedAttemptSavedRef.current) {
        const allGradedDone = gradedHotspots.every(h => completedHotspots.has(h.id));
        const answers = Array.from(gradedAnswersRef.current.values());
        if (allGradedDone && answers.length > 0) {
          const correctCount = answers.filter(a => a.isCorrect).length;
          saveQuizAttempt(correctCount, answers.length, answers, true);
          gradedAttemptSavedRef.current = true;
        }
      }
    }
  }, [completedHotspots.size, highestProgress, isProgressInitialized, isAuthenticated]);

  const videoId = extractVideoId(data.videoUrl);

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
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopTimeTracking();
              // Show performance summary if there were graded hotspots
              if (summaryItemsRef.current.length > 0) {
                setSummaryItems([...summaryItemsRef.current]);
                setShowSummary(true);
              }
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

  const lastCheckedTimeRef = useRef<number>(-1);

  const checkForHotspots = (time: number) => {
    if (currentHotspot) return;

    // Detect significant backward seek (> 2s back) — reset so hotspots re-trigger
    if (lastCheckedTimeRef.current > 0 && time < lastCheckedTimeRef.current - 2) {
      lastCheckedTimeRef.current = time;
      return; // Skip this tick; next tick will detect normally
    }

    // Find the earliest uncompleted hotspot whose timestamp falls between
    // lastCheckedTime and now (or within 0.5s tolerance for the first check).
    // Sorting ensures we trigger the earliest one first if multiple are close.
    const candidates = data.hotspots
      .filter(h => !completedHotspots.has(h.id))
      .filter(h => {
        if (lastCheckedTimeRef.current < 0) {
          return Math.abs(h.timestamp - time) < 0.5;
        }
        // Hotspot timestamp is between last check and now (forward playback)
        return h.timestamp > lastCheckedTimeRef.current - 0.2 && h.timestamp <= time + 0.3;
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    lastCheckedTimeRef.current = time;

    if (candidates.length > 0) {
      setCurrentHotspot(candidates[0]);
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
    
    // Log hotspot interaction + accumulate graded answers
    if (hotspotType === "question") {
      const isCorrect = currentHotspot.correctAnswer === selectedAnswer;
      logInteraction("hotspot_completed", {
        hotspotId, hotspotType, timestamp: hotspotTimestamp,
        selectedAnswer, isCorrect,
      });

      // Accumulate graded answer — Map keyed by questionId prevents duplicates on rewatch
      if (selectedAnswer !== null && currentHotspot.isGraded) {
        gradedAnswersRef.current.set(hotspotId, {
          questionId: hotspotId,
          answer: selectedAnswer,
          isCorrect,
        });
        // Track for summary display (replace if already exists)
        const existingIdx = summaryItemsRef.current.findIndex(s => s.questionId === hotspotId);
        const item: SummaryItem = {
          questionId: hotspotId,
          title: currentHotspot.title || `Question at ${formatTime(hotspotTimestamp)}`,
          answer: selectedAnswer,
          isCorrect,
          hotspotType: "question",
        };
        if (existingIdx >= 0) summaryItemsRef.current[existingIdx] = item;
        else summaryItemsRef.current.push(item);
      }
    } else if (hotspotType === "quiz" && currentHotspot.questions) {
      const totalQuestions = currentHotspot.questions.length;
      const answersData = currentHotspot.questions.map((q) => {
        const userAnswer = quizAnswers[q.id];
        let isCorrect = false;
        if (q.type === "fill-blank") {
          isCorrect = String(userAnswer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
        } else {
          isCorrect = userAnswer === q.correctAnswer;
        }
        return {
          questionId: q.id,
          question: q.question,
          answer: userAnswer as string | number | boolean,
          isCorrect,
        };
      });
      const correctAnswers = answersData.filter(a => a.isCorrect).length;

      logInteraction("hotspot_completed", {
        hotspotId, hotspotType, timestamp: hotspotTimestamp,
        quizScore: correctAnswers, quizTotal: totalQuestions,
        answers: quizAnswers,
      });

      // Accumulate graded answers — Map keyed by questionId prevents duplicates on rewatch
      if (currentHotspot.isGraded) {
        for (const a of answersData) {
          gradedAnswersRef.current.set(a.questionId, a);
          // Track for summary display
          const existingIdx = summaryItemsRef.current.findIndex(s => s.questionId === a.questionId);
          const item: SummaryItem = {
            questionId: a.questionId,
            title: a.question || `Quiz question`,
            answer: a.answer,
            isCorrect: a.isCorrect,
            hotspotType: "quiz",
          };
          if (existingIdx >= 0) summaryItemsRef.current[existingIdx] = item;
          else summaryItemsRef.current.push(item);
        }
      }
    } else {
      logInteraction("hotspot_completed", {
        hotspotId, hotspotType, timestamp: hotspotTimestamp,
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
    setTimeout(() => {
      if (playerRef.current) {
        // Seek slightly past the hotspot timestamp to avoid re-triggering
        // Clamp to video duration to prevent seeking past end
        const seekTime = Math.min(hotspotTimestamp + 1, duration > 0 ? duration - 0.5 : hotspotTimestamp + 1);
        lastCheckedTimeRef.current = seekTime;
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
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-10" role="dialog" aria-label={`Interactive moment: ${currentHotspot.title}`}>
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={currentHotspot.type === "question" || currentHotspot.type === "quiz" ? "default" : "outline"}>
                        {currentHotspot.type === "quiz" ? "Multi-Question Quiz"
                          : currentHotspot.type === "question" ? "Question"
                          : currentHotspot.type === "navigation" ? "Navigation"
                          : "Information"}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {formatTime(currentHotspot.timestamp)}
                      </span>
                      {currentHotspot.isGraded && (
                        <Badge variant="secondary" className="text-[10px]">Graded</Badge>
                      )}
                    </div>
                    {/* Skip button for all types */}
                    {(currentHotspot.type === "info" || currentHotspot.type === "navigation") && (
                      <Button variant="ghost" size="sm" onClick={handleContinue} className="text-muted-foreground cursor-pointer">
                        Skip <SkipForward className="h-3 w-3 ml-1" />
                      </Button>
                    )}
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
                                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                            <Check className="h-4 w-4" /> Correct
                                          </span>
                                        )}
                                        {quizShowFeedback && isSelected && !isCorrect && (
                                          <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                            <X className="h-4 w-4" /> Incorrect
                                          </span>
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
                                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                            <Check className="h-4 w-4" /> Correct
                                          </span>
                                        )}
                                        {quizShowFeedback && isSelected && !isCorrect && (
                                          <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                            <X className="h-4 w-4" /> Incorrect
                                          </span>
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
                              {showResult && isCorrect && (
                                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                  <Check className="h-5 w-5" /> Correct
                                </span>
                              )}
                              {showResult && isSelected && !isCorrect && (
                                <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                  <X className="h-5 w-5" /> Incorrect
                                </span>
                              )}
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

        {/* Performance Summary Overlay */}
        {showSummary && summaryItems.length > 0 && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-10">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardContent className="pt-6">
                <div className="space-y-5">
                  {/* Header with score */}
                  <div className="text-center space-y-3">
                    <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full mx-auto ${
                      summaryItems.filter(i => i.isCorrect).length / summaryItems.length >= 0.7
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : summaryItems.filter(i => i.isCorrect).length / summaryItems.length >= 0.4
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      <Trophy className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {summaryItems.filter(i => i.isCorrect).length}/{summaryItems.length} Correct
                      </h3>
                      <p className="text-3xl font-bold mt-1">
                        {Math.round((summaryItems.filter(i => i.isCorrect).length / summaryItems.length) * 100)}%
                      </p>
                    </div>
                    <Progress
                      value={(summaryItems.filter(i => i.isCorrect).length / summaryItems.length) * 100}
                      className="h-3 max-w-xs mx-auto"
                    />
                  </div>

                  {/* Per-question breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Question Breakdown</h4>
                    {summaryItems.map((item, i) => (
                      <div
                        key={item.questionId}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          item.isCorrect
                            ? "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10"
                            : "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10"
                        }`}
                      >
                        <div className={`mt-0.5 shrink-0 ${item.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {item.isCorrect
                            ? <CheckCircle2 className="h-5 w-5" />
                            : <XCircle className="h-5 w-5" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {item.hotspotType === "quiz" ? "Quiz" : "Question"}
                            </Badge>
                            <span className={`text-xs font-medium ${item.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {item.isCorrect ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetForRewatch();
                        if (playerRef.current) {
                          playerRef.current.seekTo(0, true);
                          playerRef.current.playVideo();
                        }
                      }}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Rewatch & Retry
                    </Button>
                    <Button onClick={() => setShowSummary(false)}>
                      Done
                    </Button>
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
                    e.preventDefault();
                    handleSeek(Math.max(0, progressPercentage - 5));
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    handleSeek(Math.min(100, progressPercentage + 5));
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    handleSeek(0);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    handleSeek(100);
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
            <ul className="space-y-2 list-none p-0 m-0" role="list" aria-label="Interactive moments">
              {data.hotspots
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((hotspot) => {
                  const isCompleted = completedHotspots.has(hotspot.id);
                  return (
                    <li key={hotspot.id}>
                      <button
                        className={`w-full p-3 rounded-lg border cursor-pointer transition-all hover-elevate text-left ${
                          isCompleted ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-border"
                        }`}
                        onClick={() => jumpToHotspot(hotspot)}
                        aria-label={`${isCompleted ? "Completed: " : ""}Jump to ${hotspot.type} at ${formatTime(hotspot.timestamp)}: ${hotspot.title}`}
                        data-testid={`hotspot-item-${hotspot.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isCompleted && <Check className="h-4 w-4 text-green-600" aria-hidden="true" />}
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {formatTime(hotspot.timestamp)}
                                </Badge>
                                <span className="text-sm font-medium">{hotspot.title}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={hotspot.type === "question" || hotspot.type === "quiz" ? "default" : "outline"}>
                            {hotspot.type === "quiz" ? "quiz" : hotspot.type}
                          </Badge>
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
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
