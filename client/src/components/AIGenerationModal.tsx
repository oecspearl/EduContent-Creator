import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Loader2 } from "lucide-react";
import type { ContentType } from "@shared/schema";

type AIGenerationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  onGenerated: (data: any) => void;
};

export function AIGenerationModal({ open, onOpenChange, contentType, onGenerated }: AIGenerationModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    topic: "",
    difficulty: "intermediate",
    gradeLevel: "",
    numberOfItems: 5,
    language: "English",
    additionalContext: "",
  });

  const contentTypeLabels: Record<ContentType, string> = {
    quiz: "quiz questions",
    flashcard: "flashcard pairs",
    "interactive-video": "video hotspots",
    "image-hotspot": "image hotspots",
    "drag-drop": "drag and drop items",
    "fill-blanks": "fill in the blanks",
    "memory-game": "memory cards",
    "interactive-book": "book pages",
    "video-finder": "video lessons",
    "google-slides": "presentation slides",
  };

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for content generation.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate", {
        contentType,
        ...formData,
      });

      const data = await response.json();
      onGenerated(data);
      onOpenChange(false);
      toast({
        title: "Content generated!",
        description: `Successfully generated ${formData.numberOfItems} ${contentTypeLabels[contentType]} using AI.`,
      });
      
      // Reset form
      setFormData({
        topic: "",
        difficulty: "intermediate",
        gradeLevel: "",
        numberOfItems: 5,
        language: "English",
        additionalContext: "",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-ai-generation">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>AI Content Generation</DialogTitle>
              <DialogDescription>
                Generate {contentTypeLabels[contentType]} using AI
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic *</Label>
            <Input
              id="topic"
              placeholder="e.g., Photosynthesis, World War II, Python Programming"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              data-testid="input-ai-topic"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger id="difficulty" data-testid="select-ai-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfItems">Number of Items</Label>
              <Input
                id="numberOfItems"
                type="number"
                min="1"
                max="20"
                value={formData.numberOfItems}
                onChange={(e) => setFormData({ ...formData, numberOfItems: parseInt(e.target.value) || 5 })}
                data-testid="input-ai-number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level (Optional)</Label>
              <Select value={formData.gradeLevel || undefined} onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}>
                <SelectTrigger id="gradeLevel" data-testid="select-ai-grade">
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

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                data-testid="input-ai-language"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
            <Textarea
              id="additionalContext"
              placeholder="Any specific requirements, focus areas, or additional instructions..."
              value={formData.additionalContext}
              onChange={(e) => setFormData({ ...formData, additionalContext: e.target.value })}
              className="h-24 resize-none"
              data-testid="textarea-ai-context"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating} data-testid="button-ai-cancel">
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} data-testid="button-ai-generate">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
