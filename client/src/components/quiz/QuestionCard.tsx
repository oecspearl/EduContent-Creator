import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  ImageIcon,
  ChevronDown,
  Upload,
  Link,
  X,
} from "lucide-react";
import type { QuizQuestion } from "@shared/schema";

type QuestionCardProps = {
  question: QuizQuestion;
  index: number;
  onUpdate: (updates: Partial<QuizQuestion>) => void;
  onRemove: () => void;
  // Image handling
  imageUrlInput: string;
  onImageUrlInputChange: (value: string) => void;
  onImageUrlSubmit: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onOpenImageGenerator: () => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
};

export function QuestionCard({
  question,
  index,
  onUpdate,
  onRemove,
  imageUrlInput,
  onImageUrlInputChange,
  onImageUrlSubmit,
  onFileUpload,
  onRemoveImage,
  onOpenImageGenerator,
  fileInputRef,
}: QuestionCardProps) {
  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const [optionImageInputs, setOptionImageInputs] = useState<Record<number, string>>({});

  const applyOptionImage = (optIndex: number) => {
    const url = optionImageInputs[optIndex]?.trim();
    if (!url) return;
    const newImages = [...(question.optionImages || (question.options || []).map(() => undefined))];
    newImages[optIndex] = url;
    onUpdate({ optionImages: newImages });
    setOptionImageInputs((prev) => ({ ...prev, [optIndex]: "" }));
  };

  const removeOptionImage = (optIndex: number) => {
    const newImages = [...(question.optionImages || (question.options || []).map(() => undefined))];
    newImages[optIndex] = undefined;
    onUpdate({ optionImages: newImages });
  };

  return (
    <Card data-testid={`question-${index}`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label>Question {index + 1}</Label>
                <Textarea
                  placeholder="Enter your question..."
                  value={question.question}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                  className="mt-2 resize-none"
                  data-testid={`input-question-${index}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Select
                  value={question.type}
                  onValueChange={(value: any) => {
                    const updates: Partial<QuizQuestion> = { type: value };
                    if (value === "true-false") {
                      updates.options = undefined;
                      updates.correctAnswer = "true";
                      updates.items = undefined;
                      updates.zones = undefined;
                      updates.dragItems = undefined;
                    } else if (value === "multiple-choice" && !question.options) {
                      updates.options = ["", "", "", ""];
                      updates.correctAnswer = 0;
                      updates.items = undefined;
                      updates.zones = undefined;
                      updates.dragItems = undefined;
                    } else if (value === "fill-blank") {
                      updates.options = undefined;
                      updates.correctAnswer = "";
                      updates.items = undefined;
                      updates.zones = undefined;
                      updates.dragItems = undefined;
                      updates.caseSensitive = false;
                      updates.acceptableAnswers = [];
                    } else if (value === "ordering") {
                      updates.options = undefined;
                      const defaultItems = ["", "", ""];
                      updates.items = question.items || defaultItems;
                      updates.correctAnswer = question.items || defaultItems;
                      updates.zones = undefined;
                      updates.dragItems = undefined;
                    } else if (value === "drag-drop") {
                      updates.options = undefined;
                      updates.items = undefined;
                      const defaultZones = [{ id: "zone1", label: "Category 1" }, { id: "zone2", label: "Category 2" }];
                      const defaultItems = [{ id: "item1", content: "", correctZone: "zone1" }, { id: "item2", content: "", correctZone: "zone2" }];
                      updates.zones = question.zones || defaultZones;
                      updates.dragItems = question.dragItems || defaultItems;
                      // Store correct answer as a mapping of itemId -> zoneId
                      const correctMapping: Record<string, string> = {};
                      (updates.dragItems || defaultItems).forEach((item: any) => {
                        correctMapping[item.id] = item.correctZone;
                      });
                      updates.correctAnswer = correctMapping;
                    }
                    onUpdate(updates);
                  }}
                >
                  <SelectTrigger className="w-40" data-testid={`select-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="true-false">True/False</SelectItem>
                    <SelectItem value="fill-blank">Fill in Blank</SelectItem>
                    <SelectItem value="ordering">Ordering</SelectItem>
                    <SelectItem value="drag-drop">Drag and Drop</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={onRemove}
                  data-testid={`button-delete-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Answer Options */}
            {question.type === "multiple-choice" && question.options && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Answer Options</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = [...question.options!, ""];
                      onUpdate({ options: newOptions });
                    }}
                    data-testid={`button-add-option-${index}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${optIndex + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...question.options!];
                          newOptions[optIndex] = e.target.value;
                          onUpdate({ options: newOptions });
                        }}
                        data-testid={`input-option-${index}-${optIndex}`}
                      />
                      <Button
                        variant={question.correctAnswer === optIndex ? "default" : "outline"}
                        size="sm"
                        onClick={() => onUpdate({ correctAnswer: optIndex })}
                        data-testid={`button-correct-${index}-${optIndex}`}
                      >
                        {question.correctAnswer === optIndex ? "Correct" : "Mark Correct"}
                      </Button>
                      {question.options!.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            const newOptions = question.options!.filter((_, i) => i !== optIndex);
                            const newImages = question.optionImages?.filter((_, i) => i !== optIndex);
                            let newCorrectAnswer = question.correctAnswer as number;
                            if (optIndex === newCorrectAnswer) {
                              newCorrectAnswer = 0;
                            } else if (optIndex < newCorrectAnswer) {
                              newCorrectAnswer--;
                            }
                            onUpdate({ options: newOptions, correctAnswer: newCorrectAnswer, optionImages: newImages });
                          }}
                          data-testid={`button-delete-option-${index}-${optIndex}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {/* Per-option image */}
                    {question.optionImages?.[optIndex] ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={question.optionImages[optIndex]}
                          alt={option || `Option ${optIndex + 1}`}
                          className="h-12 w-16 object-contain rounded border bg-muted/50"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeOptionImage(optIndex)}
                          title="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <Input
                          value={optionImageInputs[optIndex] || ""}
                          onChange={(e) => setOptionImageInputs((prev) => ({ ...prev, [optIndex]: e.target.value }))}
                          placeholder="Image URL (optional)"
                          className="h-7 text-xs"
                          onKeyDown={(e) => { if (e.key === "Enter") applyOptionImage(optIndex); }}
                          onBlur={() => applyOptionImage(optIndex)}
                          data-testid={`input-option-image-${index}-${optIndex}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {question.type === "true-false" && (
              <div className="flex gap-2">
                <Button
                  variant={question.correctAnswer === "true" ? "default" : "outline"}
                  onClick={() => onUpdate({ correctAnswer: "true" })}
                  data-testid={`button-true-${index}`}
                >
                  True
                </Button>
                <Button
                  variant={question.correctAnswer === "false" ? "default" : "outline"}
                  onClick={() => onUpdate({ correctAnswer: "false" })}
                  data-testid={`button-false-${index}`}
                >
                  False
                </Button>
              </div>
            )}

            {question.type === "fill-blank" && (
              <div className="space-y-3">
              <div>
                  <Label>Correct Answer(s)</Label>
                <Input
                  placeholder="Enter the correct answer..."
                    value={Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length > 0
                      ? question.acceptableAnswers[0]
                      : (question.correctAnswer as string) || ""}
                    onChange={(e) => {
                      const answer = e.target.value;
                      onUpdate({
                        correctAnswer: answer,
                        acceptableAnswers: [answer]
                      });
                    }}
                  data-testid={`input-answer-${index}`}
                />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can add multiple acceptable answers below
                  </p>
                </div>
                <div>
                  <Label>Additional Acceptable Answers (Optional)</Label>
                  <Textarea
                    placeholder="Enter additional acceptable answers, one per line..."
                    value={question.acceptableAnswers?.slice(1).join("\n") || ""}
                    onChange={(e) => {
                      const firstAnswer = Array.isArray(question.acceptableAnswers) && question.acceptableAnswers.length > 0
                        ? question.acceptableAnswers[0]
                        : (question.correctAnswer as string) || "";
                      const additional = e.target.value.split("\n").filter(a => a.trim());
                      onUpdate({
                        acceptableAnswers: [firstAnswer, ...additional]
                      });
                    }}
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`case-sensitive-${index}`}
                    checked={question.caseSensitive || false}
                    onChange={(e) => onUpdate({ caseSensitive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor={`case-sensitive-${index}`} className="text-sm font-normal">
                    Case sensitive
                  </Label>
                </div>
              </div>
            )}

            {question.type === "ordering" && (
              <div className="space-y-3">
                <Label>Items to Order (drag to reorder)</Label>
                <p className="text-xs text-muted-foreground">
                  Arrange items in the correct order. The order you set here is the correct answer.
                </p>
                <div className="space-y-2">
                  {question.items?.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      <Input
                        placeholder={`Item ${itemIndex + 1}`}
                        value={item}
                        onChange={(e) => {
                          const newItems = [...(question.items || [])];
                          newItems[itemIndex] = e.target.value;
                          onUpdate({
                            items: newItems,
                            correctAnswer: newItems
                          });
                        }}
                        data-testid={`input-item-${index}-${itemIndex}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newItems = question.items?.filter((_, i) => i !== itemIndex) || [];
                          onUpdate({
                            items: newItems,
                            correctAnswer: newItems
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newItems = [...(question.items || []), ""];
                      onUpdate({
                        items: newItems,
                        correctAnswer: newItems
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>
            )}

            {question.type === "drag-drop" && (
              <div className="space-y-4">
                <div>
                  <Label>Drop Zones (Categories)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Define the categories or zones where items can be dropped
                  </p>
                  <div className="space-y-2">
                    {question.zones?.map((zone, zoneIndex) => (
                      <div key={zone.id} className="flex items-center gap-2">
                        <Input
                          placeholder={`Zone ${zoneIndex + 1} label`}
                          value={zone.label}
                          onChange={(e) => {
                            const newZones = [...(question.zones || [])];
                            newZones[zoneIndex] = { ...zone, label: e.target.value };
                            onUpdate({ zones: newZones });
                          }}
                          data-testid={`input-zone-${index}-${zoneIndex}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newZones = question.zones?.filter((_, i) => i !== zoneIndex) || [];
                            // Also remove drag items that reference this zone
                            const newDragItems = question.dragItems?.filter(item => item.correctZone !== zone.id) || [];
                            onUpdate({ zones: newZones, dragItems: newDragItems });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newZone = { id: `zone${Date.now()}`, label: "" };
                        const newZones = [...(question.zones || []), newZone];
                        onUpdate({ zones: newZones });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Zone
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Drag Items</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Define items that students will drag to the correct zones
                  </p>
                  <div className="space-y-2">
                    {question.dragItems?.map((item, itemIndex) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Input
                          placeholder={`Item ${itemIndex + 1}`}
                          value={item.content}
                          onChange={(e) => {
                            const newDragItems = [...(question.dragItems || [])];
                            newDragItems[itemIndex] = { ...item, content: e.target.value };
                            onUpdate({ dragItems: newDragItems });
                          }}
                          data-testid={`input-drag-item-${index}-${itemIndex}`}
                        />
                        <Select
                          value={item.correctZone}
                          onValueChange={(zoneId) => {
                            const newDragItems = [...(question.dragItems || [])];
                            newDragItems[itemIndex] = { ...item, correctZone: zoneId };
                            onUpdate({ dragItems: newDragItems });
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Correct zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {question.zones?.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.label || `Zone ${zone.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newDragItems = question.dragItems?.filter((_, i) => i !== itemIndex) || [];
                            onUpdate({ dragItems: newDragItems });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const firstZone = question.zones?.[0]?.id || "zone1";
                        const newItem = { id: `item${Date.now()}`, content: "", correctZone: firstZone };
                        const newDragItems = [...(question.dragItems || []), newItem];
                        onUpdate({ dragItems: newDragItems });
                      }}
                      disabled={!question.zones || question.zones.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div>
              <Label>Explanation (Optional)</Label>
              <Textarea
                placeholder="Explain the answer..."
                value={question.explanation || ""}
                onChange={(e) => onUpdate({ explanation: e.target.value })}
                className="mt-2 h-16 resize-none"
                data-testid={`textarea-explanation-${index}`}
              />
            </div>

            {/* Question Image Section */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="flex items-center gap-2 text-sm">
                    <ImageIcon className="h-4 w-4" />
                    {question.imageUrl ? "Question Image (Added)" : "Add Image (Optional)"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {question.imageUrl ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={question.imageUrl}
                        alt={question.imageAlt || "Question image"}
                        className="w-full max-h-40 object-contain rounded border bg-muted/50"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={onRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs">Image Alt Text</Label>
                      <Input
                        value={question.imageAlt || ""}
                        onChange={(e) => onUpdate({ imageAlt: e.target.value })}
                        placeholder="Describe the image..."
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={imageUrlInput}
                        onChange={(e) => onImageUrlInputChange(e.target.value)}
                        placeholder="Enter image URL..."
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onImageUrlSubmit();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onImageUrlSubmit}
                        className="h-8"
                      >
                        <Link className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => {
                          localFileInputRef.current = el;
                          fileInputRef(el);
                        }}
                        onChange={onFileUpload}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => localFileInputRef.current?.click()}
                        className="flex-1 h-8 text-xs"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onOpenImageGenerator}
                        className="flex-1 h-8 text-xs"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Generate
                      </Button>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
