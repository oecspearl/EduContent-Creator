import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AIGenerationModal } from "@/components/AIGenerationModal";
import { Plus, Trash2, Sparkles } from "lucide-react";
import type { QuizPageData, QuizQuestion } from "@shared/schema";

type QuizPageEditorProps = {
  quizData?: QuizPageData;
  onSave: (data: QuizPageData) => void;
};

export function QuizPageEditor({ quizData, onSave }: QuizPageEditorProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    quizData?.questions || []
  );
  const [settings, setSettings] = useState({
    shuffleQuestions: quizData?.settings?.shuffleQuestions ?? false,
    showCorrectAnswers: quizData?.settings?.showCorrectAnswers ?? true,
    allowRetry: quizData?.settings?.allowRetry ?? true,
    timeLimit: quizData?.settings?.timeLimit,
  });
  const [showAIModal, setShowAIModal] = useState(false);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleAIGenerated = (data: any) => {
    if (data.questions && Array.isArray(data.questions)) {
      setQuestions((prev) => [...prev, ...data.questions]);
      toast({
        title: "Questions generated!",
        description: `${data.questions.length} questions have been added.`,
      });
    } else {
      toast({
        title: "Invalid response",
        description: "AI did not generate valid questions. Please try again.",
        variant: "destructive",
      });
    }
    setShowAIModal(false);
  };

  const handleSave = () => {
    if (questions.length === 0) {
      toast({
        title: "No questions",
        description: "Please add at least one question before saving",
        variant: "destructive",
      });
      return;
    }

    // Validate questions
    const invalidQuestions = questions.filter(
      (q) => !q.question.trim() || (q.type === "multiple-choice" && (!q.options || q.options.length < 2))
    );

    if (invalidQuestions.length > 0) {
      toast({
        title: "Invalid questions",
        description: "Please make sure all questions are complete",
        variant: "destructive",
      });
      return;
    }

    const quizPageData: QuizPageData = {
      questions,
      settings,
    };

    onSave(quizPageData);
    toast({
      title: "Quiz page saved!",
      description: "The quiz has been added to this page.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Quiz Questions ({questions.length})</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIModal(true)}
            data-testid="button-ai-generate-quiz"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate
          </Button>
          <Button onClick={addQuestion} size="sm" data-testid="button-add-question">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground mb-4">
              No questions yet. Add your first question or use AI to generate questions.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowAIModal(true)} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
              <Button onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">Question {index + 1}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                    data-testid={`button-remove-question-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value: any) => {
                      const updates: Partial<QuizQuestion> = { type: value };
                      if (value === "true-false") {
                        updates.options = undefined;
                        updates.correctAnswer = "true";
                      } else if (value === "multiple-choice" && !question.options) {
                        updates.options = ["", "", "", ""];
                        updates.correctAnswer = 0;
                      } else if (value === "fill-blank") {
                        updates.options = undefined;
                        updates.correctAnswer = "";
                      }
                      updateQuestion(index, updates);
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="true-false">True/False</SelectItem>
                      <SelectItem value="fill-blank">Fill in the Blank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Question</Label>
                  <Textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(index, { question: e.target.value })}
                    placeholder="Enter your question..."
                    className="mt-2"
                    rows={2}
                  />
                </div>

                {question.type === "multiple-choice" && question.options && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...question.options!];
                            newOptions[optIndex] = e.target.value;
                            updateQuestion(index, { options: newOptions });
                          }}
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1"
                        />
                        <Button
                          variant={question.correctAnswer === optIndex ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateQuestion(index, { correctAnswer: optIndex })}
                        >
                          Correct
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {question.type === "true-false" && (
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Select
                      value={String(question.correctAnswer)}
                      onValueChange={(value) =>
                        updateQuestion(index, { correctAnswer: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {question.type === "fill-blank" && (
                  <div>
                    <Label>Correct Answer</Label>
                    <Input
                      value={String(question.correctAnswer)}
                      onChange={(e) =>
                        updateQuestion(index, { correctAnswer: e.target.value })
                      }
                      placeholder="Enter the correct answer..."
                      className="mt-2"
                    />
                  </div>
                )}

                <div>
                  <Label>Explanation (Optional)</Label>
                  <Textarea
                    value={question.explanation || ""}
                    onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                    placeholder="Explain why this is the correct answer..."
                    className="mt-2"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Shuffle Questions</Label>
            <Switch
              checked={settings.shuffleQuestions}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, shuffleQuestions: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Correct Answers</Label>
            <Switch
              checked={settings.showCorrectAnswers}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, showCorrectAnswers: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow Retry</Label>
            <Switch
              checked={settings.allowRetry}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowRetry: checked })
              }
            />
          </div>
          <div>
            <Label>Time Limit (minutes, optional)</Label>
            <Input
              type="number"
              value={settings.timeLimit || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  timeLimit: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="No time limit"
              className="mt-2"
              min="1"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" data-testid="button-save-quiz-page">
        Save Quiz Page
      </Button>

      <AIGenerationModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        contentType="quiz"
        onGenerated={handleAIGenerated}
      />
    </div>
  );
}

