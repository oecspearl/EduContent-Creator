import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Upload,
  Sparkles,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ImageGeneratorDialog } from "./ImageGeneratorDialog";
import { ImageEditorDialog } from "./ImageEditorDialog";

type RichTextEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showAIImageDialog, setShowAIImageDialog] = useState(false);
  const [showImageEditorDialog, setShowImageEditorDialog] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Start writing...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-48 p-4",
      },
    },
  });

  // Update editor content when content prop changes, but only if editor is not focused
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Only update if editor is not currently focused (user is not typing)
      if (!editor.isFocused) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  const addImage = () => {
    if (imageUrl) {
      setPendingImageUrl(imageUrl);
      setImageUrl("");
      setShowImageDialog(false);
      setShowImageEditorDialog(true);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (2MB limit)
    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: "File too large",
        description: `Image must be smaller than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB. Your image is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPendingImageUrl(base64);
      setShowImageDialog(false);
      setShowImageEditorDialog(true);
      setIsUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read the image file. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAIImageGenerated = (imageUrl: string) => {
    setPendingImageUrl(imageUrl);
    setShowAIImageDialog(false);
    setShowImageEditorDialog(true);
  };

  const handleImageEdited = (editedImageUrl: string) => {
    editor.chain().focus().setImage({ src: editedImageUrl }).run();
    toast({
      title: "Image inserted",
      description: "Your image has been added to the content.",
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-accent" : ""}
          data-testid="button-bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-accent" : ""}
          data-testid="button-italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "bg-accent" : ""}
          data-testid="button-h1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""}
          data-testid="button-h2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "bg-accent" : ""}
          data-testid="button-h3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-accent" : ""}
          data-testid="button-bullet-list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-accent" : ""}
          data-testid="button-ordered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-accent" : ""}
          data-testid="button-blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="border-l mx-1" />

        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" data-testid="button-image">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Image</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="upload" className="py-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="ai">AI Generate</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="image-file">Choose an image file</Label>
                  <Input
                    ref={fileInputRef}
                    id="image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="mt-2"
                    data-testid="input-image-file"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Maximum file size: 2MB. Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
                {isUploading && (
                  <p className="text-sm text-muted-foreground">
                    Uploading image...
                  </p>
                )}
              </TabsContent>
              <TabsContent value="url" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="image-url">Image URL</Label>
                  <Input
                    id="image-url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    data-testid="input-image-url"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter the URL of an image hosted online
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={addImage} data-testid="button-insert-image">
                    Insert Image
                  </Button>
                </DialogFooter>
              </TabsContent>
              <TabsContent value="ai" className="space-y-4 pt-4">
                <div className="text-center space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Generate custom images using AI based on your description
                  </p>
                  <Button
                    onClick={() => {
                      setShowImageDialog(false);
                      setShowAIImageDialog(true);
                    }}
                    data-testid="button-open-ai-generator"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Open AI Image Generator
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <div className="border-l mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
      
      <ImageGeneratorDialog
        open={showAIImageDialog}
        onOpenChange={setShowAIImageDialog}
        onImageGenerated={handleAIImageGenerated}
      />

      <ImageEditorDialog
        open={showImageEditorDialog}
        onOpenChange={setShowImageEditorDialog}
        imageUrl={pendingImageUrl}
        onImageEdited={handleImageEdited}
      />
    </div>
  );
}
