import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, RotateCcw, GripVertical } from "lucide-react";
import type { QuizData } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";
import { ScreenReaderAnnouncer, useScreenReaderAnnounce } from "@/components/ScreenReaderAnnouncer";

type QuizPlayerProps = {
  data: QuizData;
  contentId: string;
};

export function QuizPlayer({ data, contentId }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | number | string[] | Record<string, string> | null)[]>(new Array(data.questions.length).fill(null));
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOrderIndex, setDraggedOrderIndex] = useState<number | null>(null);
  const [fillBlankInputValue, setFillBlankInputValue] = useState<string>("");
  const { announcement, announce } = useScreenReaderAnnounce();
  const restartButtonRef = useRef<HTMLButtonElement>(null);

  const { progress: savedProgress, isProgressFetched, updateProgress, saveQuizAttempt, logInteraction, isAuthenticated } = useProgressTracker(contentId);
  const [lastSentProgress, setLastSentProgress] = useState<number>(-1);
  const [isProgressInitialized, setIsProgressInitialized] = useState(false);
  const pendingMilestoneRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousAuthRef = useRef<boolean>(isAuthenticated);
  const initializedOrderingQuestionsRef = useRef<Set<number>>(new Set());

  const currentQuestion = data.questions[currentIndex];
  const progressPercentage = ((currentIndex + 1) / data.questions.length) * 100;

  // Shuffle array function (Fisher-Yates algorithm)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialize ordering questions with shuffled items if not already answered
  useEffect(() => {
    // Reset initialized questions when moving to a new question
    if (!initializedOrderingQuestionsRef.current.has(currentIndex)) {
      if (currentQuestion.type === "ordering" && currentQuestion.items) {
        const originalOrder = currentQuestion.items;
        const correctOrder = (currentQuestion.correctAnswer as string[]) || originalOrder;
        
        // Shuffle until we get an order different from the correct order
        let shuffledOrder = shuffleArray(originalOrder);
        let attempts = 0;
        while (JSON.stringify(shuffledOrder) === JSON.stringify(correctOrder) && attempts < 10) {
          shuffledOrder = shuffleArray(originalOrder);
          attempts++;
        }
        
        // Set the shuffled order as the initial answer
        setAnswers(prev => {
          const newAnswers = [...prev];
          newAnswers[currentIndex] = shuffledOrder;
          return newAnswers;
        });
        
        // Mark this question as initialized
        initializedOrderingQuestionsRef.current.add(currentIndex);
      }
      
      // Reset fill-blank input value when moving to a new question
      if (currentQuestion.type === "fill-blank") {
        setFillBlankInputValue(answers[currentIndex] as string || "");
      } else {
        setFillBlankInputValue("");
      }
    }
  }, [currentIndex, currentQuestion.type, currentQuestion.items, currentQuestion.correctAnswer, answers]);

  // Reset initialization when auth changes from false → true
  useEffect(() => {
    if (!previousAuthRef.current && isAuthenticated) {
      // User just logged in - reset to wait for progress fetch
      setIsProgressInitialized(false);
      setLastSentProgress(-1);
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
          setLastSentProgress(savedProgress.completionPercentage);
        }
        setIsProgressInitialized(true);
      }
    } else if (savedProgress) {
      // After initialization, reconcile: server can only raise, never lower
      // Only update if savedProgress is truthy (skip null refetches)
      setLastSentProgress(prev => Math.max(prev, savedProgress.completionPercentage));
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

  // Update progress as user advances through questions (monotonic, only after initialization)
  useEffect(() => {
    if (!isProgressInitialized || !isAuthenticated) return;
    
    if (answers[currentIndex] !== null) {
      const completionPercentage = Math.round(
        (answers.filter((a) => a !== null).length / data.questions.length) * 100
      );
      // Only send if higher than local high water mark, not yet complete, and not already pending
      if (completionPercentage > lastSentProgress && completionPercentage < 100 && completionPercentage !== pendingMilestoneRef.current) {
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
  }, [currentIndex, answers, lastSentProgress, isProgressInitialized, isAuthenticated]);

  const isQuestionComplete = (question: any, answer: string | number | string[] | Record<string, string> | null): boolean => {
    if (answer === null) return false;
    
    if (question.type === "ordering") {
      const answerArray = answer as string[];
      if (!answerArray || answerArray.length !== question.items?.length) return false;
      // Check that all items are present and non-empty
      if (!answerArray.every(item => item.trim())) return false;
      // For ordering questions, any answer array with all items means it's complete
      // (The items are already shuffled on initialization, so we don't need to check against original)
      return true;
    }
    
    if (question.type === "drag-drop") {
      const placements = answer as Record<string, string>;
      return question.dragItems && question.dragItems.every((item: any) => placements[item.id]);
    }
    
    // For other question types, any answer means it's complete
    return true;
  };

  const handleAnswer = (answer: string | number | string[] | Record<string, string>) => {
    // Don't allow changing answers after explanation is shown
    if (showExplanation) return;
    
    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);
    
    // Log interaction
    logInteraction("answered");
    
    // Check if question is complete
    const isComplete = isQuestionComplete(currentQuestion, answer);
    
    // For ordering and drag-drop questions, don't show explanation during interaction
    // Only show it when user clicks Next button
    const shouldShowFeedbackNow = currentQuestion.type !== "ordering" && currentQuestion.type !== "drag-drop";
    
    // Only show explanation if:
    // 1. Immediate feedback is enabled
    // 2. Question has an explanation
    // 3. Question is complete (for ordering/drag-drop, this means all items are placed)
    // 4. It's not an ordering/drag-drop question (those show feedback on Next click)
    if (data.settings.showCorrectAnswers && currentQuestion.explanation && isComplete && shouldShowFeedbackNow) {
      setShowExplanation(true);
    
    // Screen reader announcement
      const isCorrect = checkAnswerCorrectness(currentQuestion, answer);
    announce(
      isCorrect 
        ? "Correct! " + (currentQuestion.explanation || "")
        : "Incorrect. " + (currentQuestion.explanation || ""),
      "assertive"
    );
    } else if (!isComplete) {
      // For incomplete ordering/drag-drop questions, provide progress feedback
      if (currentQuestion.type === "ordering") {
        const answerArray = answer as string[];
        const originalOrder = currentQuestion.items || [];
        const hasChanged = JSON.stringify(answerArray) !== JSON.stringify(originalOrder);
        if (hasChanged) {
          // User has reordered items, show progress
          const total = currentQuestion.items?.length || 0;
          announce(`Items reordered. Continue arranging all ${total} items.`, "polite");
        }
      } else if (currentQuestion.type === "drag-drop") {
        const placements = answer as Record<string, string>;
        const placed = Object.keys(placements).length;
        const total = currentQuestion.dragItems?.length || 0;
        announce(`Placed ${placed} of ${total} items`, "polite");
      }
    }
  };

  const checkAnswerCorrectness = (question: any, answer: string | number | string[] | Record<string, string> | null): boolean => {
    if (answer === null) return false;
    
    if (question.type === "multiple-choice" || question.type === "true-false" || question.type === "fill-blank") {
      if (question.type === "fill-blank") {
        const userAnswer = (answer as string).trim();
        const correctAnswer = (question.correctAnswer as string).trim();
        const acceptableAnswers = question.acceptableAnswers || [correctAnswer];
        const caseSensitive = question.caseSensitive || false;
        
        return acceptableAnswers.some((acc: string) => {
          const normalizedAcc = acc.trim();
          return caseSensitive 
            ? userAnswer === normalizedAcc
            : userAnswer.toLowerCase() === normalizedAcc.toLowerCase();
        });
      }
      return question.correctAnswer === answer;
    }
    
    if (question.type === "ordering") {
      const userOrder = answer as string[];
      const correctOrder = question.correctAnswer as string[];
      if (!userOrder || !correctOrder || userOrder.length !== correctOrder.length) return false;
      return JSON.stringify(userOrder) === JSON.stringify(correctOrder);
    }
    
    if (question.type === "drag-drop") {
      const userPlacements = answer as Record<string, string>;
      if (!userPlacements || !question.dragItems) return false;
      
      return question.dragItems.every((item: any) => {
        return userPlacements[item.id] === item.correctZone;
      });
    }
    
    return false;
  };

  const handleNext = () => {
    // For fill-blank questions, save the current input value if it hasn't been saved yet
    if (currentQuestion.type === "fill-blank" && fillBlankInputValue.trim() && answers[currentIndex] === null) {
      handleAnswer(fillBlankInputValue);
    }
    
    // Don't allow advancing without an answer
    if (answers[currentIndex] === null) {
      announce("Please provide an answer before continuing", "assertive");
      return;
    }
    
    // For ordering and drag-drop, check if answer is complete
    const currentQ = data.questions[currentIndex];
    if (!isQuestionComplete(currentQ, answers[currentIndex])) {
      if (currentQ.type === "ordering") {
        announce("Please arrange all items in order before continuing", "assertive");
      } else if (currentQ.type === "drag-drop") {
        announce("Please place all items in their correct zones before continuing", "assertive");
      }
      return;
    }
    
    // Show explanation when clicking Next if not already shown and feedback is enabled
    if (data.settings.showCorrectAnswers && currentQ.explanation && !showExplanation) {
      setShowExplanation(true);
      const isCorrect = checkAnswerCorrectness(currentQ, answers[currentIndex]);
      announce(
        isCorrect 
          ? "Correct! " + (currentQ.explanation || "")
          : "Incorrect. " + (currentQ.explanation || ""),
        "assertive"
      );
      // Don't proceed immediately - let user see the feedback
      return;
    }
    
    setShowExplanation(false);
    setFillBlankInputValue(""); // Reset fill-blank input when moving to next question
    if (currentIndex < data.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Announce question change for screen readers
      announce(`Question ${currentIndex + 2} of ${data.questions.length}`, "polite");
    } else {
      // Quiz completed - save attempt and show results
      const score = calculateScore();
      const answersData = data.questions.map((q, i) => {
        const answer = answers[i];
        // Convert complex answer types to serializable format
        let serializedAnswer: string | number | boolean;
        if (Array.isArray(answer)) {
          serializedAnswer = JSON.stringify(answer);
        } else if (typeof answer === 'object' && answer !== null) {
          serializedAnswer = JSON.stringify(answer);
        } else {
          serializedAnswer = answer as string | number | boolean;
        }
        
        return {
        questionId: q.id,
          answer: serializedAnswer,
          isCorrect: checkAnswerCorrectness(q, answer),
        };
      });
      
      // Save quiz attempt (which also updates progress to 100%)
      // Don't update local state here - let reconciliation handle it on success
      saveQuizAttempt(score, data.questions.length, answersData);
      setShowResults(true);
      announce(`Quiz complete! You scored ${Math.round((score / data.questions.length) * 100)}%`, "assertive");
      // Focus the restart button when results are shown
      setTimeout(() => {
        restartButtonRef.current?.focus();
      }, 100);
    }
  };

  const handlePrevious = () => {
    setShowExplanation(false);
    setCurrentIndex(currentIndex - 1);
    // Reset fill-blank input value when moving to previous question
    setFillBlankInputValue("");
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers(new Array(data.questions.length).fill(null));
    setShowResults(false);
    setShowExplanation(false);
    setFillBlankInputValue("");
    initializedOrderingQuestionsRef.current.clear(); // Reset initialized questions
    logInteraction("quiz_restarted");
  };

  const calculateScore = () => {
    return data.questions.reduce((score, question, index) => {
      const answer = answers[index];
      if (checkAnswerCorrectness(question, answer)) {
        return score + 1;
      }
      return score;
    }, 0);
  };

  const isCorrect = (questionIndex: number) => {
    return checkAnswerCorrectness(data.questions[questionIndex], answers[questionIndex]);
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / data.questions.length) * 100);

    return (
      <Card className="max-w-2xl mx-auto" role="region" aria-label="Quiz results">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-6xl font-bold text-primary mb-2" aria-label={`Your score is ${percentage} percent`}>{percentage}%</div>
            <p className="text-lg text-muted-foreground">
              You got {score} out of {data.questions.length} questions correct
            </p>
          </div>

          {data.settings.showCorrectAnswers && (
            <div className="space-y-3">
              <h3 className="font-semibold">Results:</h3>
              {data.questions.map((question, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  {isCorrect(index) ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{question.question}</p>
                    {question.imageUrl && (
                      <img
                        src={question.imageUrl}
                        alt={question.imageAlt || "Question image"}
                        className="mt-2 max-h-24 object-contain rounded border bg-background"
                      />
                    )}
                    {!isCorrect(index) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Correct answer: {typeof question.correctAnswer === "number" && question.options
                          ? question.options[question.correctAnswer]
                          : String(question.correctAnswer)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          {data.settings.allowRetry && (
            <Button 
              ref={restartButtonRef}
              onClick={handleRestart} 
              data-testid="button-restart" 
              aria-label="Restart the quiz"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Quiz
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Screen Reader Announcer */}
      <ScreenReaderAnnouncer announcement={announcement} />
      
      {/* Progress */}
      <div className="space-y-2" role="region" aria-label="Quiz progress">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {currentIndex + 1} of {data.questions.length}</span>
          <span className="font-medium">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" aria-label={`Quiz progress: ${Math.round(progressPercentage)}%`} />
      </div>

      {/* Question Card */}
      <Card role="region" aria-label={`Question ${currentIndex + 1} of ${data.questions.length}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle id={`question-${currentIndex}`} className="text-xl">{currentQuestion.question}</CardTitle>
            <Badge variant="outline">{currentQuestion.type.replace("-", " ")}</Badge>
          </div>
          {/* Question Image */}
          {currentQuestion.imageUrl && (
            <div className="mt-4">
              <img
                src={currentQuestion.imageUrl}
                alt={currentQuestion.imageAlt || "Question image"}
                className="w-full max-h-64 object-contain rounded-lg border bg-muted/50"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.type === "multiple-choice" && currentQuestion.options && (
            <RadioGroup 
              value={answers[currentIndex]?.toString() || ""}
              onValueChange={(value) => handleAnswer(parseInt(value))}
              disabled={showExplanation}
              aria-labelledby={`question-${currentIndex}`}
              aria-required="true"
              className="space-y-2"
            >
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentIndex] === index;
                const isCorrectOption = currentQuestion.correctAnswer === index;
                const showCorrect = showExplanation && data.settings.showCorrectAnswers;

                return (
                  <div 
                    key={index} 
                    className={`flex items-center space-x-3 border rounded-lg p-4 ${
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    } ${
                      showCorrect && isCorrectOption ? "border-green-600 bg-green-50 dark:bg-green-950" : ""
                    } ${
                      showCorrect && isSelected && !isCorrectOption ? "border-destructive bg-destructive/10" : ""
                    }`}
                  >
                    <RadioGroupItem 
                      value={index.toString()} 
                      id={`option-${currentIndex}-${index}`}
                      disabled={showExplanation}
                      data-testid={`option-${index}`}
                    />
                    <Label 
                      htmlFor={`option-${currentIndex}-${index}`}
                      className="flex-1 cursor-pointer text-base"
                    >
                      {option}
                    </Label>
                    {showCorrect && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {showCorrect && isSelected && !isCorrectOption && <XCircle className="h-5 w-5 text-destructive" />}
                  </div>
                );
              })}
            </RadioGroup>
          )}

          {currentQuestion.type === "true-false" && (
            <div className="flex gap-3">
              <Button
                variant={answers[currentIndex] === "true" ? "default" : "outline"}
                className="flex-1 h-16"
                onClick={() => !showExplanation && handleAnswer("true")}
                disabled={showExplanation}
                data-testid="button-true"
              >
                True
              </Button>
              <Button
                variant={answers[currentIndex] === "false" ? "default" : "outline"}
                className="flex-1 h-16"
                onClick={() => !showExplanation && handleAnswer("false")}
                disabled={showExplanation}
                data-testid="button-false"
              >
                False
              </Button>
            </div>
          )}

          {currentQuestion.type === "fill-blank" && (
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border bg-background"
              placeholder="Type your answer..."
              value={showExplanation ? (answers[currentIndex] as string || "") : fillBlankInputValue}
              onChange={(e) => {
                if (!showExplanation) {
                  setFillBlankInputValue(e.target.value);
                }
              }}
              onBlur={(e) => {
                // Only check answer when user finishes typing (on blur)
                if (!showExplanation && e.target.value.trim()) {
                  handleAnswer(e.target.value);
                }
              }}
              disabled={showExplanation}
              data-testid="input-fill-blank"
              aria-label="Answer input"
            />
          )}

          {currentQuestion.type === "ordering" && currentQuestion.items && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Drag items to arrange them in the correct order
              </p>
              <div className="space-y-2">
                {(() => {
                  const currentOrder = (answers[currentIndex] as string[]) || [...currentQuestion.items];
                  return currentOrder.map((itemText, orderIndex) => (
                    <div
                      key={`${orderIndex}-${itemText}`}
                      draggable={!showExplanation}
                      onDragStart={() => setDraggedOrderIndex(orderIndex)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("border-primary");
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove("border-primary");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-primary");
                        if (draggedOrderIndex === null) return;
                        
                        const newOrder = [...currentOrder];
                        const [removed] = newOrder.splice(draggedOrderIndex, 1);
                        newOrder.splice(orderIndex, 0, removed);
                        handleAnswer(newOrder);
                        setDraggedOrderIndex(null);
                      }}
                      className={`flex items-center gap-3 p-3 border rounded-lg bg-card ${
                        showExplanation ? "cursor-default" : "cursor-move hover:bg-muted"
                      }`}
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <span className="flex-1">{itemText}</span>
                      <span className="text-sm text-muted-foreground">#{orderIndex + 1}</span>
                    </div>
                  ));
                })()}
              </div>
              {showExplanation && data.settings.showCorrectAnswers && (
                <div className="mt-3 p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-1">Correct Order:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {(currentQuestion.correctAnswer as string[] || currentQuestion.items || []).map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {currentQuestion.type === "drag-drop" && currentQuestion.zones && currentQuestion.dragItems && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Drag items to their correct zones. You can move items back to the "Items to Drag" area if needed.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Drag Items */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Items to Drag</h4>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!showExplanation) {
                        e.currentTarget.classList.add("border-primary", "bg-primary/5");
                      }
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                      if (!draggedItem || showExplanation) return;
                      
                      const placements = (answers[currentIndex] as Record<string, string>) || {};
                      const newPlacements = { ...placements };
                      // Remove the item from placements (move it back to drag area)
                      delete newPlacements[draggedItem];
                      handleAnswer(newPlacements);
                      setDraggedItem(null);
                    }}
                    className="space-y-2 min-h-[200px] p-3 border-2 border-dashed rounded-lg bg-muted/50"
                  >
                    {currentQuestion.dragItems
                      .filter((item: any) => {
                        const placements = (answers[currentIndex] as Record<string, string>) || {};
                        return !placements[item.id];
                      })
                      .map((item: any) => (
                        <div
                          key={item.id}
                          draggable={!showExplanation}
                          onDragStart={() => setDraggedItem(item.id)}
                          className={`p-3 border rounded-lg cursor-move bg-card hover:bg-muted ${
                            showExplanation ? "cursor-default opacity-50" : ""
                          }`}
                        >
                          {item.content}
                        </div>
                      ))}
                    {currentQuestion.dragItems.filter((item: any) => {
                      const placements = (answers[currentIndex] as Record<string, string>) || {};
                      return !placements[item.id];
                    }).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        All items have been placed. Drag items from zones to move them back.
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Drop Zones */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Drop Zones</h4>
                  <div className="space-y-2">
                    {currentQuestion.zones.map((zone: any) => {
                      const placements = (answers[currentIndex] as Record<string, string>) || {};
                      const zoneItems = currentQuestion.dragItems?.filter((item: any) => placements[item.id] === zone.id) || [];
                      
                      return (
                        <div
                          key={zone.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!showExplanation) {
                              e.currentTarget.classList.add("border-primary", "bg-primary/5");
                            }
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                            if (!draggedItem || showExplanation) return;
                            
                            const newPlacements = { ...placements, [draggedItem]: zone.id };
                            handleAnswer(newPlacements);
                            setDraggedItem(null);
                          }}
                          className={`min-h-[80px] p-3 border-2 border-dashed rounded-lg ${
                            showExplanation && data.settings.showCorrectAnswers
                              ? (() => {
                                  const correctAnswer = currentQuestion.correctAnswer as Record<string, string>;
                                  const allCorrect = zoneItems.length > 0 && zoneItems.every((item: any) => correctAnswer?.[item.id] === zone.id);
                                  const hasIncorrect = zoneItems.some((item: any) => correctAnswer?.[item.id] !== zone.id);
                                  if (allCorrect && !hasIncorrect) return "border-green-600 bg-green-50 dark:bg-green-950";
                                  if (hasIncorrect) return "border-destructive bg-destructive/10";
                                  return "";
                                })()
                              : ""
                          }`}
                        >
                          <div className="font-medium mb-2">{zone.label}</div>
                          <div className="space-y-1">
                            {zoneItems.map((item: any) => {
                              const correctAnswer = currentQuestion.correctAnswer as Record<string, string>;
                              const isCorrect = showExplanation && data.settings.showCorrectAnswers 
                                ? correctAnswer?.[item.id] === zone.id
                                : null;
                              return (
                                <div
                                  key={item.id}
                                  draggable={!showExplanation}
                                  onDragStart={() => setDraggedItem(item.id)}
                                  className={`p-2 bg-background border rounded text-sm cursor-move hover:bg-muted ${
                                    showExplanation ? "cursor-default" : ""
                                  } ${
                                    isCorrect === true ? "border-green-600 bg-green-50 dark:bg-green-950" :
                                    isCorrect === false ? "border-destructive bg-destructive/10" : ""
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{item.content}</span>
                                    <div className="flex items-center gap-2">
                                      {isCorrect === true && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                      {isCorrect === false && <XCircle className="h-4 w-4 text-destructive" />}
                                      {!showExplanation && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showExplanation && currentQuestion.explanation && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-1">Explanation:</p>
              <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            data-testid="button-previous"
            aria-label="Go to previous question"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={(() => {
              if (answers[currentIndex] === null) return true;
              return !isQuestionComplete(currentQuestion, answers[currentIndex]);
            })()}
            data-testid="button-next"
            aria-label={currentIndex === data.questions.length - 1 ? "Finish quiz" : "Go to next question"}
          >
            {showExplanation ? "Continue" : currentIndex === data.questions.length - 1 ? "Finish" : "Next"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
