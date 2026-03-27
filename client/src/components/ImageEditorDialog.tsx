import { useState, useRef, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crop, Maximize2, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ImageEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onImageEdited: (editedImageUrl: string) => void;
};

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageUrl,
  onImageEdited,
}: ImageEditorDialogProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState("resize");
  
  // Resize state
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1);
  
  // Crop state
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cropEndRef = useRef<{ x: number; y: number } | null>(null);

  // Load image when dialog opens
  useEffect(() => {
    if (open && imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImage(img);
        setWidth(img.width);
        setHeight(img.height);
        setOriginalAspectRatio(img.width / img.height);
        drawImageOnCanvas(img);
      };
      img.src = imageUrl;
    }
  }, [open, imageUrl]);

  // Redraw canvas when switching to crop tab or changing crop start
  useEffect(() => {
    if (image && activeTab === "crop") {
      drawImageOnCanvas(image);
      if (cropStart && cropEnd) {
        drawCropSelection();
      }
    }
  }, [cropStart, activeTab]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const drawImageOnCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to fit the image while maintaining aspect ratio
    const maxWidth = 600;
    const maxHeight = 400;
    let drawWidth = img.width;
    let drawHeight = img.height;

    if (drawWidth > maxWidth) {
      drawHeight = (maxWidth / drawWidth) * drawHeight;
      drawWidth = maxWidth;
    }
    if (drawHeight > maxHeight) {
      drawWidth = (maxHeight / drawHeight) * drawWidth;
      drawHeight = maxHeight;
    }

    canvas.width = drawWidth;
    canvas.height = drawHeight;
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
  };

  const drawCropSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !cropStart) return;

    const currentCropEnd = cropEndRef.current || cropEnd;
    if (!currentCropEnd) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const x = Math.min(cropStart.x, currentCropEnd.x);
    const y = Math.min(cropStart.y, currentCropEnd.y);
    const w = Math.abs(currentCropEnd.x - cropStart.x);
    const h = Math.abs(currentCropEnd.y - cropStart.y);

    // Draw semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the crop area
    ctx.clearRect(x, y, w, h);
    if (image) {
      const scaleX = canvas.width / image.width;
      const scaleY = canvas.height / image.height;
      ctx.drawImage(
        image,
        x / scaleX,
        y / scaleY,
        w / scaleX,
        h / scaleY,
        x,
        y,
        w,
        h
      );
    }

    // Draw crop border
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  };

  const scheduleRedraw = () => {
    if (animationFrameRef.current !== null) {
      return; // Already scheduled
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      if (image && activeTab === "crop" && cropStart) {
        drawImageOnCanvas(image);
        drawCropSelection();
      }
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== "crop") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPos = { x, y };
    setCropStart(newPos);
    setCropEnd(newPos);
    cropEndRef.current = newPos;
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || activeTab !== "crop") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Store in ref for smooth rendering
    cropEndRef.current = { x, y };
    
    // Schedule a redraw (throttled to one per frame)
    scheduleRedraw();
  };

  const handleCanvasMouseUp = () => {
    if (cropEndRef.current) {
      // Save final position to state
      setCropEnd(cropEndRef.current);
    }
    setIsDragging(false);
  };

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    if (aspectRatioLocked) {
      setHeight(Math.round(newWidth / originalAspectRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (aspectRatioLocked) {
      setWidth(Math.round(newHeight * originalAspectRatio));
    }
  };

  const applyResize = () => {
    if (!image) return null;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    } catch (error) {
      // Canvas is tainted by CORS (external URL without proper headers)
      toast({
        title: "Cannot edit external image",
        description: "This image cannot be edited due to CORS restrictions. Using original image.",
      });
      return imageUrl;
    }
  };

  const applyCrop = () => {
    if (!image || !cropStart || !cropEnd || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;

    const x = Math.min(cropStart.x, cropEnd.x) * scaleX;
    const y = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const w = Math.abs(cropEnd.x - cropStart.x) * scaleX;
    const h = Math.abs(cropEnd.y - cropStart.y) * scaleY;

    if (w < 1 || h < 1) {
      toast({
        title: "Invalid crop area",
        description: "Please select a larger area to crop.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = w;
      cropCanvas.height = h;
      const ctx = cropCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
      return cropCanvas.toDataURL("image/png");
    } catch (error) {
      // Canvas is tainted by CORS (external URL without proper headers)
      toast({
        title: "Cannot crop external image",
        description: "This image cannot be cropped due to CORS restrictions. Using original image.",
      });
      return imageUrl;
    }
  };

  const handleApply = () => {
    let editedImageUrl: string | null = null;

    if (activeTab === "resize") {
      editedImageUrl = applyResize();
    } else if (activeTab === "crop") {
      editedImageUrl = applyCrop();
    }

    if (editedImageUrl) {
      onImageEdited(editedImageUrl);
      handleClose();
    }
  };

  const handleSkip = () => {
    onImageEdited(imageUrl);
    handleClose();
  };

  const handleClose = () => {
    setCropStart(null);
    setCropEnd(null);
    setIsDragging(false);
    setActiveTab("resize");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            Edit Image
          </DialogTitle>
          <DialogDescription>
            Resize or crop your image before inserting it into the document.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resize" data-testid="tab-resize">
              <Maximize2 className="h-4 w-4 mr-2" />
              Resize
            </TabsTrigger>
            <TabsTrigger value="crop" data-testid="tab-crop">
              <Crop className="h-4 w-4 mr-2" />
              Crop
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="resize" className="space-y-4 mt-0">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    min={1}
                    data-testid="input-width"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                  className="mt-6"
                  data-testid="button-lock-aspect"
                >
                  {aspectRatioLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
                <div className="flex-1">
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={height}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    min={1}
                    data-testid="input-height"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {aspectRatioLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"} • Original: {image?.width} × {image?.height}
              </p>
              <div className="border rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center p-4">
                <canvas ref={canvasRef} className="max-w-full" />
              </div>
            </TabsContent>

            <TabsContent value="crop" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground">
                Click and drag on the image to select the area you want to keep.
              </p>
              <div className="border rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center p-4">
                <canvas
                  ref={canvasRef}
                  className="max-w-full cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  data-testid="canvas-crop"
                />
              </div>
              {cropStart && cropEnd && (
                <p className="text-sm text-muted-foreground">
                  Selection: {Math.abs(Math.round((cropEnd.x - cropStart.x) * (image?.width || 1) / (canvasRef.current?.width || 1)))} × {Math.abs(Math.round((cropEnd.y - cropStart.y) * (image?.height || 1) / (canvasRef.current?.height || 1)))} px
                </p>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip} data-testid="button-skip-editing">
            Skip Editing
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-edit">
            Apply & Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
