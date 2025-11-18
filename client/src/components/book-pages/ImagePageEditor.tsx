import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Link, Sparkles, Loader2 } from "lucide-react";
import type { ImagePageData } from "@shared/schema";
import { ImageGeneratorDialog } from "@/components/ImageGeneratorDialog";

type ImagePageEditorProps = {
  imageData?: ImagePageData;
  onSave: (data: ImagePageData) => void;
};

export function ImagePageEditor({ imageData, onSave }: ImagePageEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(imageData?.imageUrl || "");
  const [imageAlt, setImageAlt] = useState(imageData?.imageAlt || "");
  const [instructions, setInstructions] = useState(imageData?.instructions || "");
  const [urlInput, setUrlInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [imageSource, setImageSource] = useState<"upload" | "url" | "puterjs" | "dalle">(
    imageData?.source || "url"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUrl(result);
      setImageSource("upload");
      if (!imageAlt) {
        setImageAlt(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast({
        title: "URL required",
        description: "Please enter an image URL",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
      setImageUrl(urlInput);
      setImageSource("url");
      setUrlInput("");
      toast({
        title: "Image URL set",
        description: "The image URL has been added",
      });
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
    }
  };

  const handleImageGenerated = (generatedUrl: string) => {
    setImageUrl(generatedUrl);
    setImageSource("dalle"); // Default to DALL-E, but could be puterjs
    setShowGeneratorDialog(false);
  };

  const handleSave = () => {
    if (!imageUrl) {
      toast({
        title: "No image",
        description: "Please add an image before saving",
        variant: "destructive",
      });
      return;
    }

    const imagePageData: ImagePageData = {
      imageUrl,
      imageAlt: imageAlt.trim() || undefined,
      instructions: instructions.trim() || undefined,
      source: imageSource,
    };

    onSave(imagePageData);
    toast({
      title: "Image page saved!",
      description: "The image has been added to this page.",
    });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="url">Image URL</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="generate">AI Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <div>
            <Label htmlFor="image-url">Image URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="image-url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUrlSubmit();
                  }
                }}
              />
              <Button onClick={handleUrlSubmit} data-testid="button-add-url">
                <Link className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div>
            <Label>Upload Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full mt-2"
              data-testid="button-upload-image"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Image File
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <div>
            <Label>Generate Image with AI</Label>
            <Button
              onClick={() => setShowGeneratorDialog(true)}
              variant="outline"
              className="w-full mt-2"
              data-testid="button-generate-image"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Image
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Use Puter.js or DALL-E to generate an image from a text description
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {imageUrl && (
        <div className="space-y-4">
          <Card className="bg-accent/10">
            <CardContent className="p-4">
              <div className="space-y-2">
                <img
                  src={imageUrl}
                  alt={imageAlt || "Page image"}
                  className="w-full max-h-64 object-contain rounded"
                  onError={() => {
                    toast({
                      title: "Image load failed",
                      description: "The image could not be loaded. Please check the URL or try again.",
                      variant: "destructive",
                    });
                    setImageUrl("");
                  }}
                />
                {imageSource && (
                  <p className="text-xs text-muted-foreground">
                    Source: {imageSource === "upload" ? "Uploaded" : imageSource === "url" ? "URL" : imageSource === "puterjs" ? "Puter.js" : "DALL-E"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="image-alt">Image Alt Text (Optional)</Label>
            <Input
              id="image-alt"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Describe the image for accessibility..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add instructions about this image..."
              rows={3}
              className="mt-2"
            />
          </div>

          <Button onClick={handleSave} className="w-full" data-testid="button-save-image-page">
            Save Image Page
          </Button>
        </div>
      )}

      <ImageGeneratorDialog
        open={showGeneratorDialog}
        onOpenChange={setShowGeneratorDialog}
        onImageGenerated={handleImageGenerated}
      />
    </div>
  );
}

