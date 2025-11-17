import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ImageGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageGenerated: (imageUrl: string) => void;
};

export function ImageGeneratorDialog({ 
  open, 
  onOpenChange, 
  onImageGenerated 
}: ImageGeneratorDialogProps) {
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
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate image");
      }

      setGeneratedImage(data.imageUrl);
      
      toast({
        title: "Image generated!",
        description: "Your AI-generated image is ready.",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate image. Please try again.",
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

  const handleClose = () => {
    setPrompt("");
    setGeneratedImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Image Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="image-prompt">Describe the image you want</Label>
            <Input
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A peaceful Caribbean beach at sunset with palm trees"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGenerating) {
                  generateImage();
                }
              }}
              disabled={isGenerating}
              data-testid="input-image-prompt"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Be specific and descriptive for best results
            </p>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Generating your image... This may take a moment.
                </p>
              </div>
            </div>
          )}

          {generatedImage && !isGenerating && (
            <div className="space-y-2">
              <Label>Generated Image</Label>
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                <img 
                  src={generatedImage} 
                  alt={prompt}
                  className="w-full h-auto"
                  data-testid="img-generated"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Powered by OpenAI DALL-E 3 • High-quality AI Image Generation
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          {!generatedImage ? (
            <Button
              onClick={generateImage}
              disabled={isGenerating || !prompt.trim()}
              data-testid="button-generate"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={insertImage}
              data-testid="button-insert-generated"
            >
              Insert Image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
