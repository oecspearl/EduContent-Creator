import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ItalicExtension from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
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
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
  Code,
  Search,
  Replace,
  Maximize,
  Minimize,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ImageGeneratorDialog } from "./ImageGeneratorDialog";
import { ImageEditorDialog } from "./ImageEditorDialog";

type RichTextEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  /**
   * When true, shows a compact toolbar with only basic formatting (B/I/U, lists,
   * undo/redo). No headings, images, or blockquote. Useful for smaller fields
   * like quiz explanations or hotspot descriptions.
   */
  minimal?: boolean;
  /**
   * When true, disables TipTap's *text* → italic markdown shortcut so that
   * asterisks (e.g. *blank*) are kept as literal characters. Italic formatting
   * via the toolbar button still works.
   */
  keepAsterisksLiteral?: boolean;
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export function RichTextEditor({ content, onChange, placeholder, minimal, keepAsterisksLiteral }: RichTextEditorProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showAIImageDialog, setShowAIImageDialog] = useState(false);
  const [showImageEditorDialog, setShowImageEditorDialog] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Source code view
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState("");
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // When keepAsterisksLiteral is true: disable StarterKit's built-in italic so we
  // can add a custom version that strips the *text* inputRule. The toolbar italic
  // button continues to work — only the markdown shortcut is removed.
  const italicExtension = keepAsterisksLiteral
    ? ItalicExtension.extend({ addInputRules() { return []; } })
    : undefined;

  const editor = useEditor({
    extensions: [
      keepAsterisksLiteral ? StarterKit.configure({ italic: false }) : StarterKit,
      ...(italicExtension ? [italicExtension] : []),
      Underline,
      ...(minimal
        ? []
        : [
            Image.configure({
              inline: true,
              allowBase64: true,
            }),
          ]),
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
        class: `prose max-w-none focus:outline-none ${minimal ? "min-h-24" : "min-h-48"} p-4`,
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

  // --- Source code view ---
  const toggleSourceMode = useCallback(() => {
    if (!sourceMode) {
      setSourceCode(editor.getHTML());
    } else {
      editor.commands.setContent(sourceCode);
      onChange(sourceCode);
    }
    setSourceMode(!sourceMode);
  }, [sourceMode, sourceCode, editor, onChange]);

  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceCode(e.target.value);
  }, []);

  const handleSourceBlur = useCallback(() => {
    editor.commands.setContent(sourceCode);
    onChange(sourceCode);
  }, [sourceCode, editor, onChange]);

  // --- Find & Replace ---
  const toggleFindReplace = useCallback(() => {
    const next = !showFindReplace;
    setShowFindReplace(next);
    if (next) {
      setTimeout(() => findInputRef.current?.focus(), 50);
    } else {
      setFindText("");
      setReplaceText("");
      setMatchCount(0);
      setCurrentMatch(0);
      // Clear any highlights
      clearHighlights();
    }
  }, [showFindReplace]);

  const clearHighlights = useCallback(() => {
    if (!editor) return;
    const el = containerRef.current?.querySelector(".ProseMirror");
    if (!el) return;
    el.querySelectorAll("mark[data-find-highlight]").forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent || ""), m);
        parent.normalize();
      }
    });
  }, [editor]);

  const performFind = useCallback(() => {
    if (!editor || !findText) {
      setMatchCount(0);
      setCurrentMatch(0);
      clearHighlights();
      return;
    }

    clearHighlights();

    const el = containerRef.current?.querySelector(".ProseMirror");
    if (!el) return;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    let count = 0;
    const searchLower = findText.toLowerCase();

    for (const node of textNodes) {
      const text = node.textContent || "";
      const textLower = text.toLowerCase();
      let idx = textLower.indexOf(searchLower);
      if (idx === -1) continue;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;

      while (idx !== -1) {
        count++;
        frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
        const mark = document.createElement("mark");
        mark.setAttribute("data-find-highlight", String(count));
        mark.style.backgroundColor = count === 1 ? "#ff9632" : "#ffff00";
        mark.style.color = "#000";
        mark.textContent = text.slice(idx, idx + findText.length);
        frag.appendChild(mark);
        lastIdx = idx + findText.length;
        idx = textLower.indexOf(searchLower, lastIdx);
      }

      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      node.parentNode?.replaceChild(frag, node);
    }

    setMatchCount(count);
    setCurrentMatch(count > 0 ? 1 : 0);

    if (count > 0) {
      const first = el.querySelector('mark[data-find-highlight="1"]');
      first?.scrollIntoView({ block: "nearest" });
    }
  }, [editor, findText, clearHighlights]);

  const navigateMatch = useCallback((direction: "next" | "prev") => {
    if (matchCount === 0) return;
    const el = containerRef.current?.querySelector(".ProseMirror");
    if (!el) return;

    // Reset old highlight color
    const oldMark = el.querySelector(`mark[data-find-highlight="${currentMatch}"]`);
    if (oldMark) (oldMark as HTMLElement).style.backgroundColor = "#ffff00";

    const next = direction === "next"
      ? (currentMatch % matchCount) + 1
      : ((currentMatch - 2 + matchCount) % matchCount) + 1;
    setCurrentMatch(next);

    const newMark = el.querySelector(`mark[data-find-highlight="${next}"]`);
    if (newMark) {
      (newMark as HTMLElement).style.backgroundColor = "#ff9632";
      newMark.scrollIntoView({ block: "nearest" });
    }
  }, [matchCount, currentMatch]);

  const handleReplace = useCallback(() => {
    if (!editor || matchCount === 0) return;
    const el = containerRef.current?.querySelector(".ProseMirror");
    if (!el) return;

    const mark = el.querySelector(`mark[data-find-highlight="${currentMatch}"]`);
    if (mark) {
      mark.replaceWith(document.createTextNode(replaceText));
      el.normalize();
      // Sync back to editor
      const html = el.innerHTML;
      editor.commands.setContent(html);
      onChange(html);
      // Re-run find
      setTimeout(performFind, 10);
    }
  }, [editor, matchCount, currentMatch, replaceText, onChange, performFind]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || matchCount === 0) return;
    const el = containerRef.current?.querySelector(".ProseMirror");
    if (!el) return;

    el.querySelectorAll("mark[data-find-highlight]").forEach((mark) => {
      mark.replaceWith(document.createTextNode(replaceText));
    });
    el.normalize();

    const html = el.innerHTML;
    editor.commands.setContent(html);
    onChange(html);
    setMatchCount(0);
    setCurrentMatch(0);
    toast({ title: "Replaced all", description: `All occurrences have been replaced.` });
  }, [editor, matchCount, replaceText, onChange, toast]);

  // Re-run find when findText changes
  useEffect(() => {
    if (showFindReplace) {
      const timer = setTimeout(performFind, 200);
      return () => clearTimeout(timer);
    }
  }, [findText, showFindReplace, performFind]);

  // --- Fullscreen ---
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Escape key exits fullscreen and find/replace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) setIsFullscreen(false);
        if (showFindReplace) {
          setShowFindReplace(false);
          clearHighlights();
        }
      }
      // Ctrl+F to open find
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && containerRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        if (!showFindReplace) {
          setShowFindReplace(true);
          setTimeout(() => findInputRef.current?.focus(), 50);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, showFindReplace, clearHighlights]);

  return (
    <div
      ref={containerRef}
      className={`border rounded-lg overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col"
          : ""
      }`}
    >
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
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-accent" : ""}
          data-testid="button-underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        {!minimal && (
          <>
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
          </>
        )}
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
        {!minimal && (
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
        )}

        {!minimal && (
          <>
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
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo() || sourceMode}
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo() || sourceMode}
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>

        {!minimal && (
          <>
            <div className="border-l mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleSourceMode}
              className={sourceMode ? "bg-accent" : ""}
              title="Toggle HTML source"
              data-testid="button-source"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleFindReplace}
              className={showFindReplace ? "bg-accent" : ""}
              title="Find & Replace (Ctrl+F)"
              data-testid="button-find-replace"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>
      {/* Find & Replace bar */}
      {showFindReplace && !sourceMode && (
        <div className="border-b bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={findInputRef}
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find..."
              className="h-7 w-40 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  navigateMatch(e.shiftKey ? "prev" : "next");
                }
              }}
              data-testid="input-find"
            />
            {findText && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {matchCount > 0 ? `${currentMatch}/${matchCount}` : "No matches"}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigateMatch("prev")} disabled={matchCount === 0} title="Previous">
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigateMatch("next")} disabled={matchCount === 0} title="Next">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Replace className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace..."
              className="h-7 w-40 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleReplace();
                }
              }}
              data-testid="input-replace"
            />
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReplace} disabled={matchCount === 0}>
              Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReplaceAll} disabled={matchCount === 0}>
              All
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto" onClick={toggleFindReplace} title="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Editor body: WYSIWYG or Source code */}
      {sourceMode ? (
        <textarea
          ref={sourceRef}
          value={sourceCode}
          onChange={handleSourceChange}
          onBlur={handleSourceBlur}
          className={`w-full font-mono text-sm p-4 bg-zinc-950 text-green-400 focus:outline-none resize-none ${
            isFullscreen ? "flex-1" : minimal ? "min-h-24" : "min-h-48"
          }`}
          spellCheck={false}
          data-testid="textarea-source"
        />
      ) : (
        <div className={isFullscreen ? "flex-1 overflow-auto" : ""}>
          <EditorContent editor={editor} />
        </div>
      )}

      {!minimal && (
        <>
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
        </>
      )}
    </div>
  );
}
