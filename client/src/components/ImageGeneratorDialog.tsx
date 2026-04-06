import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ImageGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageGenerated: (imageUrl: string) => void;
};

export function ImageGeneratorDialog({ open, onOpenChange, onImageGenerated }: ImageGeneratorDialogProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description of the image you want to generate.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const response = await apiRequest("POST", "/api/ai/generate-image", { prompt: prompt.trim() });
      const data = await response.json();
      const imageUrl = data.imageUrl as string | undefined;
      if (!imageUrl) {
        throw new Error("No image returned");
      }
      setGeneratedImage(imageUrl);
      toast({
        title: "Image generated",
        description: "Review the image below, then insert it.",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate image. Check OPENROUTER_API_KEY on the server.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const insertImage = () => {
    if (generatedImage) {
      onImageGenerated(generatedImage);
      setPrompt("");
      setGeneratedImage(null);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPrompt("");
      setGeneratedImage(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Image Generator
          </DialogTitle>
          <DialogDescription>
            Images are generated on the server via OpenRouter (configure <code className="text-xs">OPENROUTER_API_KEY</code>
            ).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div>
            <Label htmlFor="image-prompt">Describe the image you want</Label>
            <Input
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A peaceful Caribbean beach at sunset with palm trees"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isGenerating) {
                  generateImage();
                }
              }}
              disabled={isGenerating}
              data-testid="input-image-prompt"
            />
            <p className="text-sm text-muted-foreground mt-2">Be specific for clearer educational visuals.</p>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Generating… this may take a moment.</p>
              </div>
            </div>
          )}

          {generatedImage && !isGenerating && (
            <div className="space-y-2">
              <Label>Generated image</Label>
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                <img src={generatedImage} alt={prompt} className="w-full h-auto" data-testid="img-generated" />
              </div>
              <p className="text-xs text-muted-foreground">Powered by OpenRouter</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isGenerating} data-testid="button-cancel">
            Cancel
          </Button>
          {!generatedImage ? (
            <Button onClick={generateImage} disabled={isGenerating || !prompt.trim()} data-testid="button-generate">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate image
                </>
              )}
            </Button>
          ) : (
            <Button onClick={insertImage} data-testid="button-insert-generated">
              Insert image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
