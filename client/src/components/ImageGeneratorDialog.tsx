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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    puter?: {
      ai: {
        txt2img: (prompt: string, options?: { model?: string }) => Promise<HTMLImageElement>;
      };
    };
  }
}

type ImageProvider = "puterjs" | "openai";

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
  const [provider, setProvider] = useState<ImageProvider>("puterjs");
  const [openaiAvailable, setOpenaiAvailable] = useState<boolean>(true);

  const generateWithPuterJS = async () => {
    if (!window.puter) {
      throw new Error("Puter.js is not loaded. Please refresh the page or try OpenAI provider.");
    }

    try {
      const imageElement = await window.puter.ai.txt2img(prompt, {
        model: "gpt-image-1"
      });
      
      return imageElement.src;
    } catch (error: any) {
      console.error("Puter.js generation error:", error);
      throw new Error("Failed to generate image with Puter.js. Try refreshing the page or using OpenAI provider.");
    }
  };

  const generateWithOpenAI = async () => {
    const response = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400 && data.message?.includes("not configured")) {
        setOpenaiAvailable(false);
        setProvider("puterjs");
        throw new Error("OpenAI API key not configured. Switching to free Puter.js provider.");
      }
      throw new Error(data.message || "Failed to generate image");
    }

    return data.imageUrl;
  };

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
      let imageUrl: string;
      
      if (provider === "puterjs") {
        try {
          imageUrl = await generateWithPuterJS();
        } catch (puterError: any) {
          if (!window.puter && openaiAvailable) {
            toast({
              title: "Puter.js unavailable",
              description: "Switching to OpenAI provider...",
            });
            setProvider("openai");
            imageUrl = await generateWithOpenAI();
          } else {
            throw puterError;
          }
        }
      } else {
        imageUrl = await generateWithOpenAI();
      }

      setGeneratedImage(imageUrl);
      
      toast({
        title: "Image generated!",
        description: `Your AI-generated image is ready.`,
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
            Generate custom images using AI from text descriptions. Choose between free Puter.js or premium OpenAI DALL-E 3.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div>
            <Label htmlFor="provider-select">AI Provider</Label>
            <Select
              value={provider}
              onValueChange={(value: ImageProvider) => setProvider(value)}
              disabled={isGenerating}
            >
              <SelectTrigger id="provider-select" data-testid="select-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="puterjs">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span>Puter.js - Free (Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="openai" disabled={!openaiAvailable}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span>OpenAI DALL-E 3 - Premium{!openaiAvailable ? " (Unavailable)" : ""}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {provider === "puterjs" 
                ? "Free, unlimited image generation with no API key required"
                : openaiAvailable
                  ? "High-quality images (requires OPENAI_API_KEY)"
                  : "OpenAI unavailable - API key not configured"}
            </p>
          </div>

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
                {provider === "puterjs" 
                  ? "Powered by Puter.js • Free AI Image Generation"
                  : "Powered by OpenAI DALL-E 3 • Premium AI Image Generation"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
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
